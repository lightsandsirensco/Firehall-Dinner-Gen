#!/usr/bin/env tsx
/**
 * Generate editorial imagery for Explore review-queue recipes — ONE slug at a time.
 *
 *   npx tsx scripts/generate-review-queue-imagery.ts --only=baked-ziti-casserole --dry-run
 *   npx tsx scripts/generate-review-queue-imagery.ts --only=baked-ziti-casserole --approve
 */
import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import { initCuratedRecipeStore, getCuratedRecipeBySlug } from "../server/curated-recipe-store.js";
import { runDbMigrations } from "../server/db/migrate.js";
import { flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";
import {
  REVIEW_QUEUE_EDITORIAL_BRIEFS,
  REVIEW_QUEUE_SLUGS,
  type ReviewQueueEditorialBrief,
} from "../shared/review-queue-editorial-briefs.js";
import {
  buildEditorialImagePrompt,
  buildEditorialModelPrompt,
} from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { DEFAULT_HERO_GENERATION_SIZE } from "../server/lib/image-sizes.js";
import { writeEditorialImageVariants } from "../server/imagery/variants.js";
import {
  attachEditorialImagesToSlug,
  getEditorialImageForSlug,
} from "../server/imagery/update-recipe-images.js";
import { createEmptyEditorialImageMetadata } from "../shared/editorial-image-metadata.js";
import { buildSocialPackStub } from "../shared/editorial-image-social.js";
import { scoreEditorialImageQuality } from "../server/imagery/score-image-quality.js";
import {
  buildCuratedMealImageProfile,
  validateCuratedImageGovernance,
} from "../shared/curated-image-governance/index.js";
import { scoreImageIntegrity, IMAGE_INTEGRITY_PASS_THRESHOLD } from "../shared/image-integrity.js";

function parseOnlySlug(args: string[]): string | null {
  const only = args.find((a) => a.startsWith("--only="));
  if (!only) return null;
  return only.replace("--only=", "").trim() || null;
}

function buildModelPrompt(brief: ReviewQueueEditorialBrief, title: string): string {
  const base = buildEditorialModelPrompt({
    mealName: brief.mealName || title,
    category: brief.category,
    cuisine: brief.cuisine,
    protein: brief.protein,
    mealFormat: brief.mealFormat,
    ingredientHints: brief.ingredientHints,
    hookLine: brief.hookLine,
    moodTags: [brief.mealFormat, brief.cuisine],
  });
  const extra = [...brief.shotDirectives, `Avoid specifically: ${brief.avoid.join(", ")}`].join(". ");
  return `${base}. ${extra}`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const approve = args.includes("--approve");
  const only = parseOnlySlug(args);

  if (!only) {
    console.error("Specify exactly one recipe: --only=<slug>");
    console.error("Queue:", REVIEW_QUEUE_SLUGS.join(", "));
    process.exit(1);
  }

  const brief = REVIEW_QUEUE_EDITORIAL_BRIEFS[only];
  if (!brief) {
    console.error(`Unknown slug: ${only}`);
    process.exit(1);
  }

  await runDbMigrations();
  await initCuratedRecipeStore();
  logOpenAIKeyDiagnostics("[review-imagery]");

  const recipe = getCuratedRecipeBySlug(only);
  if (!recipe) {
    console.error(`No curated_recipes row for ${only}`);
    process.exit(1);
  }

  const existing = getEditorialImageForSlug(only);
  if (existing?.imageApproved && !force) {
    console.log(`[review-imagery] ${only} already approved — use --force to regenerate`);
    process.exit(0);
  }

  const title = brief.mealName || recipe.title;
  console.log("\n=== Editorial brief ===");
  console.log(`Slug: ${only}`);
  console.log(`Title: ${title}`);
  console.log(`Format: ${brief.mealFormat} | Cuisine: ${brief.cuisine} | Protein: ${brief.protein}`);
  console.log(`Hook: ${brief.hookLine}`);
  console.log(`Shot: ${brief.shotDirectives.join(" | ")}`);

  const promptResult = buildEditorialImagePrompt({
    mealName: title,
    category: brief.category,
    cuisine: brief.cuisine,
    protein: brief.protein,
    mealFormat: brief.mealFormat,
    ingredientHints: brief.ingredientHints,
    hookLine: brief.hookLine,
  });

  const modelPrompt = buildModelPrompt(brief, title);

  if (dryRun) {
    console.log("\n=== Model prompt (preview) ===\n");
    console.log(modelPrompt.slice(0, 1200));
    console.log("\n…");
    process.exit(0);
  }

  const cfg = getFoodImageryConfig();
  if (!cfg.enabled) {
    console.error("FOOD_IMAGERY_ENABLED=true and OPENAI_API_KEY required");
    process.exit(1);
  }

  console.log("\n[review-imagery] Generating hero…");
  const buf = await generateFoodImageBuffer(modelPrompt, DEFAULT_HERO_GENERATION_SIZE);
  const heuristic = validateImageBufferHeuristic(buf);
  if (!heuristic.ok) {
    console.error(`FAILED heuristic: ${heuristic.reason}`);
    process.exit(1);
  }

  const quality = await scoreEditorialImageQuality({
    buffer: buf,
    mealName: title,
    stylePreset: promptResult.stylePreset,
    useVision: cfg.visionValidate,
  });

  console.log("\n=== QA score ===");
  console.log(
    JSON.stringify(
      {
        composite: quality.composite,
        pass: quality.pass,
        needsRegeneration: quality.needsRegeneration,
        flags: quality.flags,
      },
      null,
      2,
    ),
  );

  if (!quality.pass && !force) {
    console.error(
      "\nEDITORIAL REVIEW: FAIL — did not auto-approve. Re-run with --force after manual review, or regenerate.",
    );
    process.exit(1);
  }

  const nextVersion = (existing?.imageVersion || 0) + 1;
  const paths = await writeEditorialImageVariants(only, buf, promptResult.stylePreset, nextVersion);

  const meta = createEmptyEditorialImageMetadata(
    only,
    promptResult.stylePreset,
    promptResult.promptSeed,
    nextVersion,
  );
  meta.heroImage = paths.hero;
  meta.mobileHeroImage = paths.mobile;
  meta.thumbnailImage = paths.thumb;
  meta.railPreviewImage = paths.rail;
  meta.promptHash = promptResult.promptHash;
  meta.generatedAt = new Date().toISOString();
  meta.model = cfg.model;
  meta.imageVersion = nextVersion;
  meta.imageApproved = approve && (quality.pass || force);
  meta.quality = quality;
  meta.delivery = paths.delivery;
  meta.lqip = paths.lqip ?? undefined;
  meta.social = buildSocialPackStub({
    slug: only,
    title,
    stylePreset: promptResult.stylePreset,
    hookLine: brief.hookLine,
  });

  const profile = buildCuratedMealImageProfile({
    slug: only,
    title,
    protein: brief.protein,
    cuisine: brief.cuisine,
    mealFormat: brief.mealFormat,
  });
  const gov = validateCuratedImageGovernance({
    profile,
    heroImage: paths.hero,
    thumbImage: paths.thumb,
    mobileImage: paths.mobile,
    imageApproved: meta.imageApproved,
    publishGate: true,
  });

  console.log("\n=== Image governance ===");
  console.log(JSON.stringify({ pass: gov.pass, confidence: gov.mismatchConfidence, mismatches: gov.mismatches }, null, 2));

  if (!gov.pass) {
    console.error("\nEDITORIAL REVIEW: FAIL — governance mismatch. Not publishing.");
    process.exit(1);
  }

  const integrity = scoreImageIntegrity({
    slug: only,
    title,
    protein: brief.protein,
    cuisine: brief.cuisine,
    mealFormat: brief.mealFormat,
    heroImage: paths.hero,
    heroAlt: title,
    imageApproved: meta.imageApproved,
    publishGate: true,
  });
  console.log("\n=== Image integrity lock ===");
  console.log(JSON.stringify(integrity, null, 2));
  if (!integrity.pass || integrity.score < IMAGE_INTEGRITY_PASS_THRESHOLD) {
    console.error("\nEDITORIAL REVIEW: FAIL — image integrity / plating lock. Not publishing.");
    process.exit(1);
  }

  if (!meta.imageApproved) {
    console.warn("\nEDITORIAL REVIEW: Generated but NOT approved (pass --approve to lock).");
    attachEditorialImagesToSlug({ slug: only, metadata: meta, markApproved: false });
    flushSqliteToDisk();
    releaseSqliteTimersForTests();
    process.exit(0);
  }

  attachEditorialImagesToSlug({ slug: only, metadata: meta, markApproved: true });

  const { upsertCuratedRecipe } = await import("../server/curated-recipe-store.js");
  const updated = getCuratedRecipeBySlug(only);
  if (updated) {
    upsertCuratedRecipe({
      ...updated,
      status: "published",
      heroImage: paths.hero,
      protein: brief.protein,
      cuisine: brief.cuisine,
      mealFormat: brief.mealFormat,
    });
  }

  console.log(`\nEDITORIAL REVIEW: PASS — locked and published`);
  console.log(`  hero: ${paths.hero}`);
  console.log(`  thumb: ${paths.thumb}`);
  console.log(`  mobile: ${paths.mobile}`);

  flushSqliteToDisk();
  releaseSqliteTimersForTests();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
