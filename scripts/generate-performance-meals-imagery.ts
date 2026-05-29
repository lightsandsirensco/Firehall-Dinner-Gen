#!/usr/bin/env tsx
/**
 * Performance Meals (50) editorial imagery pipeline.
 *
 * Generates hero + mobile + thumb + rail variants using the unified editorial image system:
 * - hero → `/images/golden-100/<slug>.jpg`
 * - mobile → `/images/mobile/<slug>.jpg`
 * - thumb → `/images/thumbs/<slug>.jpg`
 * - rail → `/images/rails/<slug>.jpg`
 *
 * Usage:
 *   npx tsx scripts/generate-performance-meals-imagery.ts --dry-run
 *   npx tsx scripts/generate-performance-meals-imagery.ts --limit=5
 *   npx tsx scripts/generate-performance-meals-imagery.ts --only=slug-a,slug-b
 *   npx tsx scripts/generate-performance-meals-imagery.ts --approve
 *   npx tsx scripts/generate-performance-meals-imagery.ts --force
 *   npx tsx scripts/generate-performance-meals-imagery.ts --skip-qa-fail
 */

import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import { runDbMigrations } from "../server/db/migrate.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { flushSqliteToDisk } from "../server/sqlite.js";

import { PERFORMANCE_ADAPTED_RECIPES } from "../shared/performance-meals/adapted/index.js";

import { buildEditorialImagePrompt, buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { DEFAULT_HERO_GENERATION_SIZE } from "../server/lib/image-sizes.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { scoreEditorialImageQuality } from "../server/imagery/score-image-quality.js";
import { writeEditorialImageVariants } from "../server/imagery/variants.js";
import { attachEditorialImagesToSlug, getEditorialImageForSlug } from "../server/imagery/update-recipe-images.js";
import { createEmptyEditorialImageMetadata } from "../shared/editorial-image-metadata.js";
import { buildSocialPackStub } from "../shared/editorial-image-social.js";

interface ImageryTarget {
  slug: string;
  title: string;
  cuisine: string;
  protein: string;
  mealFormat: string;
  hookLine?: string;
  ingredientHints?: string[];
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const approve = args.includes("--approve");
  const skipQaFail = args.includes("--skip-qa-fail");
  const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0", 10);
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const onlySlugs = onlyArg
    ? new Set(onlyArg.replace("--only=", "").split(",").map((s) => s.trim()).filter(Boolean))
    : null;
  return { dryRun, force, approve, skipQaFail, limit, onlySlugs };
}

function targetsFromPerformance(only: Set<string> | null): ImageryTarget[] {
  const all = PERFORMANCE_ADAPTED_RECIPES.map((r) => ({
    slug: r.manifest.slug,
    title: r.manifest.title,
    cuisine: r.manifest.cuisine,
    protein: r.manifest.protein,
    mealFormat: r.manifest.mealFormat,
    hookLine: r.manifest.subtitle,
    ingredientHints: r.ingredients.map((i) => i.name).slice(0, 10),
  }));
  return only ? all.filter((t) => only.has(t.slug)) : all;
}

async function main(): Promise<void> {
  const { dryRun, force, approve, skipQaFail, limit, onlySlugs } = parseArgs(process.argv);

  await runDbMigrations();
  await initCuratedRecipeStore();

  logOpenAIKeyDiagnostics("[performance-imagery]");
  const cfg = getFoodImageryConfig();
  if (!dryRun && !cfg.enabled) {
    console.error("[performance-imagery] Set OPENAI_API_KEY and FOOD_IMAGERY_ENABLED=true in .env");
    process.exit(1);
  }

  let targets = targetsFromPerformance(onlySlugs);
  if (limit > 0) targets = targets.slice(0, limit);

  console.log(`[performance-imagery] ${targets.length} targets (dryRun=${dryRun}, force=${force})`);

  let ok = 0;
  let skip = 0;
  let fail = 0;
  let qaFlagged = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]!;
    const existing = getEditorialImageForSlug(t.slug);

    if (existing?.imageApproved && !force) {
      skip++;
      console.log(`  ○ ${t.slug} — already approved`);
      continue;
    }
    if (existing?.heroImage && !force && !dryRun) {
      skip++;
      console.log(`  ○ ${t.slug} — has editorial hero (use --force)`);
      continue;
    }

    const promptResult = buildEditorialImagePrompt({
      mealName: t.title,
      category: "performance_meals",
      cuisine: t.cuisine,
      protein: t.protein,
      mealFormat: t.mealFormat,
      moodTags: ["performance_meals", t.mealFormat],
      ingredientHints: t.ingredientHints,
      hookLine: t.hookLine,
    });

    if (dryRun) {
      console.log(`  ✓ ${t.slug} [${promptResult.stylePreset}]`);
      console.log(
        `    ${buildEditorialModelPrompt({
          mealName: t.title,
          category: "performance_meals",
          cuisine: t.cuisine,
          protein: t.protein,
          mealFormat: t.mealFormat,
          stylePreset: promptResult.stylePreset,
        }).slice(0, 220)}…`,
      );
      ok++;
      continue;
    }

    try {
      const modelPrompt = buildEditorialModelPrompt({
        mealName: t.title,
        category: "performance_meals",
        cuisine: t.cuisine,
        protein: t.protein,
        mealFormat: t.mealFormat,
        stylePreset: promptResult.stylePreset,
        hookLine: t.hookLine,
        ingredientHints: t.ingredientHints,
      });

      const buf = await generateFoodImageBuffer(modelPrompt, DEFAULT_HERO_GENERATION_SIZE);
      const heuristic = validateImageBufferHeuristic(buf);
      if (!heuristic.ok) {
        fail++;
        console.warn(`  ✗ ${t.slug}: buffer — ${heuristic.reason}`);
        continue;
      }

      const nextVersion = (existing?.imageVersion || 0) + 1;
      const quality = await scoreEditorialImageQuality({
        buffer: buf,
        mealName: t.title,
        stylePreset: promptResult.stylePreset,
        useVision: cfg.visionValidate,
      });

      if (quality.needsRegeneration && !skipQaFail && !force) {
        qaFlagged++;
        console.warn(
          `  ⚠ ${t.slug}: QA composite=${quality.composite} flags=${quality.flags.join(",")} — use --force or --skip-qa-fail`,
        );
        continue;
      }

      const paths = await writeEditorialImageVariants(t.slug, buf, promptResult.stylePreset, nextVersion);

      const meta = createEmptyEditorialImageMetadata(t.slug, promptResult.stylePreset, promptResult.promptSeed, nextVersion);
      meta.heroImage = paths.hero;
      meta.mobileHeroImage = paths.mobile;
      meta.thumbnailImage = paths.thumb;
      meta.railPreviewImage = paths.rail;
      meta.promptHash = promptResult.promptHash;
      meta.generatedAt = new Date().toISOString();
      meta.model = cfg.model;
      meta.imageVersion = nextVersion;
      meta.imageApproved = approve && quality.pass;
      meta.regenerationCount = (existing?.regenerationCount || 0) + (quality.needsRegeneration ? 1 : 0);
      meta.lqip = paths.lqip ?? undefined;
      meta.delivery = paths.delivery;
      meta.quality = quality;
      meta.social = buildSocialPackStub({
        slug: t.slug,
        title: t.title,
        stylePreset: promptResult.stylePreset,
        hookLine: t.hookLine,
        categoryLabel: "performance_meals",
      });

      if (!attachEditorialImagesToSlug({ slug: t.slug, metadata: meta, markApproved: approve && quality.pass })) {
        fail++;
        console.warn(`  ✗ ${t.slug}: no curated row — run seed:performance-meals + db:sync-curated`);
        continue;
      }

      ok++;
      const qaNote = quality.pass ? "QA pass" : `QA ${quality.composite}`;
      console.log(`  ✓ ${t.slug} → ${paths.mobile} [${promptResult.stylePreset}] ${qaNote}`);
    } catch (err: unknown) {
      fail++;
      console.warn(`  ✗ ${t.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  flushSqliteToDisk();
  console.log(`\n[performance-imagery] done ok=${ok} skip=${skip} fail=${fail} qaFlagged=${qaFlagged}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

