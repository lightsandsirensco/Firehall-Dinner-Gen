#!/usr/bin/env tsx
/**
 * Regenerate failed meal hero images from meal-image-trust-audit.json.
 *
 *   npx tsx scripts/regen-meal-image-trust.ts --dry-run
 *   npx tsx scripts/regen-meal-image-trust.ts --apply --limit=10
 *   npx tsx scripts/regen-meal-image-trust.ts --apply --only=boneless-chicken-thighs-sweet-potato-spinach
 */
import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore, getCuratedRecipeBySlug } from "../server/curated-recipe-store.js";
import { runDbMigrations } from "../server/db/migrate.js";
import { flushSqliteToDisk } from "../server/sqlite.js";
import { buildEditorialModelPrompt, buildEditorialImagePrompt } from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { DEFAULT_HERO_GENERATION_SIZE } from "../server/lib/image-sizes.js";
import { writeEditorialImageVariants } from "../server/imagery/variants.js";
import { attachEditorialImagesToSlug, getEditorialImageForSlug } from "../server/imagery/update-recipe-images.js";
import { createEmptyEditorialImageMetadata } from "../shared/editorial-image-metadata.js";
import { buildSocialPackStub } from "../shared/editorial-image-social.js";
import { scoreEditorialImageQuality } from "../server/imagery/score-image-quality.js";
import {
  buildCompleteMealImagePromptBlock,
  extractMealImageRequirements,
} from "../shared/curated-image-governance/meal-image-completeness.js";
import { TITLE_LOCKED_IMAGE_PROMPTS } from "../shared/food-imagery/title-locked-prompts.js";
import {
  loadTrustAuditTargets,
  readHeroBuffer,
  type TrustAuditTarget,
} from "../shared/curated-image-governance/trust-audit-targets.js";
import { auditMealImageWithVision } from "../server/imagery/audit-meal-image-vision.js";
import { PERFORMANCE_MEAL_IMAGERY_NEGATIVE_OVERRIDES } from "../shared/performance-meals/imagery-prompt-overrides.js";

const AUDIT_PATH = path.join(process.cwd(), "review", "meal-image-trust-audit.json");

type RegenResult = {
  slug: string;
  title: string;
  reasonFailed: string;
  replacementGenerated: boolean;
  qaPass: boolean;
  qaNotes?: string;
};

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes("--dry-run"),
    apply: argv.includes("--apply"),
    force: argv.includes("--force"),
    skipQaFail: argv.includes("--skip-qa-fail"),
    limit: parseInt(argv.find((a) => a.startsWith("--limit="))?.replace("--limit=", "") || "50", 10),
    only: argv.find((a) => a.startsWith("--only="))?.replace("--only=", "").trim() || null,
  };
}

function categoryForTarget(t: TrustAuditTarget): string {
  if (t.collection === "performance_meals") return "healthy_performance";
  if (t.collection === "breakfast") return "breakfast";
  if (t.collection === "pizza_night") return "pizza_night";
  if (t.collection === "hall_expansion") return "hall_expansion";
  return t.collection === "golden_100" ? "firehall_classics" : "healthy_performance";
}

function buildRegenPrompt(t: TrustAuditTarget, stylePreset: string): string {
  const base = buildEditorialModelPrompt({
    mealName: t.title,
    category: categoryForTarget(t),
    cuisine: t.cuisine,
    protein: t.protein,
    mealFormat: t.mealFormat,
    stylePreset: stylePreset as never,
    ingredientHints: t.ingredients.map((i) => i.name).slice(0, 10),
  });

  const parts = [base];
  const locked = TITLE_LOCKED_IMAGE_PROMPTS[t.slug];
  if (locked) parts.push(locked);
  parts.push(buildCompleteMealImagePromptBlock(t));
  const negatives = PERFORMANCE_MEAL_IMAGERY_NEGATIVE_OVERRIDES[t.slug];
  if (negatives?.length) parts.push(`Avoid: ${negatives.join(", ")}`);
  return parts.join("\n\n");
}

function loadFailedSlugs(only: string | null): string[] {
  if (only) return [only];
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error("Run: npm run audit:meal-image-trust first");
    process.exit(1);
  }
  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8")) as {
    rows?: Array<{ slug: string; pass: boolean }>;
  };
  return (audit.rows ?? []).filter((r) => !r.pass).map((r) => r.slug);
}

function updateAuditRow(slug: string, result: RegenResult): void {
  if (!fs.existsSync(AUDIT_PATH)) return;
  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8")) as {
    rows: Array<Record<string, unknown>>;
    failedRecipes: Array<Record<string, unknown>>;
    totals: Record<string, number>;
  };
  for (const row of audit.rows) {
    if (row.slug !== slug) continue;
    row.replacementGenerated = result.replacementGenerated;
    row.qaPass = result.qaPass;
    if (result.qaPass) {
      row.pass = true;
      row.reasonsFailed = [];
    }
  }
  audit.failedRecipes = audit.rows
    .filter((r) => !r.pass)
    .map((r) => ({
      recipe: r.title,
      slug: r.slug,
      collection: r.collection,
      reasonFailed: (r.reasonsFailed as string[] | undefined)?.join(" | ") || "",
      replacementGenerated: r.replacementGenerated,
      qaPass: r.qaPass,
    }));
  audit.totals.passed = audit.rows.filter((r) => r.pass).length;
  audit.totals.failed = audit.rows.filter((r) => !r.pass).length;
  fs.writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2));
}

async function main(): Promise<void> {
  const { dryRun, apply, force, skipQaFail, limit, only } = parseArgs(process.argv);
  if (!dryRun && !apply) {
    console.error("Use --dry-run or --apply");
    process.exit(1);
  }

  const slugs = loadFailedSlugs(only).slice(0, limit);
  const targetMap = new Map(loadTrustAuditTargets().map((t) => [t.slug, t]));

  await runDbMigrations();
  await initCuratedRecipeStore();
  logOpenAIKeyDiagnostics("[regen-meal-image-trust]");

  const cfg = getFoodImageryConfig();
  if (apply && !cfg.enabled) {
    console.error("FOOD_IMAGERY_ENABLED=true and OPENAI_API_KEY required");
    process.exit(1);
  }

  const results: RegenResult[] = [];
  console.log(`[regen-meal-image-trust] slugs=${slugs.length} mode=${dryRun ? "dry-run" : "apply"}`);

  for (const slug of slugs) {
    const t = targetMap.get(slug);
    if (!t) {
      console.warn(`  skip ${slug} — not in trust audit targets`);
      continue;
    }

    const auditRow = fs.existsSync(AUDIT_PATH)
      ? (JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8")) as { rows: Array<{ slug: string; reasonsFailed?: string[] }> })
          .rows.find((r) => r.slug === slug)
      : null;
    const reasonFailed = auditRow?.reasonsFailed?.join(" | ") || "trust audit failure";

    const promptResult = buildEditorialImagePrompt({
      mealName: t.title,
      category: categoryForTarget(t),
      cuisine: t.cuisine,
      protein: t.protein,
      mealFormat: t.mealFormat,
      ingredientHints: t.ingredients.map((i) => i.name).slice(0, 10),
    });
    const modelPrompt = buildRegenPrompt(t, promptResult.stylePreset);

    if (dryRun) {
      console.log(`  ✓ ${slug} prompt ready (${modelPrompt.length} chars)`);
      results.push({ slug, title: t.title, reasonFailed, replacementGenerated: false, qaPass: false });
      continue;
    }

    try {
      const buf = await generateFoodImageBuffer(modelPrompt, DEFAULT_HERO_GENERATION_SIZE);
      const heuristic = validateImageBufferHeuristic(buf);
      if (!heuristic.ok) {
        console.warn(`  ✗ ${slug}: ${heuristic.reason}`);
        results.push({ slug, title: t.title, reasonFailed, replacementGenerated: false, qaPass: false });
        continue;
      }

      const quality = await scoreEditorialImageQuality({
        buffer: buf,
        mealName: t.title,
        stylePreset: promptResult.stylePreset,
        useVision: cfg.visionValidate,
      });

      if (quality.needsRegeneration && !skipQaFail && !force) {
        console.warn(`  ⚠ ${slug}: editorial QA composite=${quality.composite}`);
        results.push({
          slug,
          title: t.title,
          reasonFailed,
          replacementGenerated: false,
          qaPass: false,
          qaNotes: `composite=${quality.composite}`,
        });
        continue;
      }

      const req = extractMealImageRequirements(t);
      const mealVision = await auditMealImageWithVision({
        imageBuffer: buf,
        title: t.title,
        requirements: req,
        ingredients: t.ingredients,
        mealFormat: t.mealFormat,
        cuisine: t.cuisine,
        force: true,
      });

      const qaPass = mealVision.pass && quality.pass;
      if (!qaPass && !skipQaFail && !force) {
        console.warn(`  ⚠ ${slug}: meal vision pass=${mealVision.pass} reasons=${mealVision.reasons.join("; ")}`);
        results.push({
          slug,
          title: t.title,
          reasonFailed,
          replacementGenerated: false,
          qaPass: false,
          qaNotes: mealVision.reasons.join("; "),
        });
        continue;
      }

      const existing = getEditorialImageForSlug(slug);
      const nextVersion = (existing?.imageVersion || 0) + 1;
      const paths = await writeEditorialImageVariants(
        slug,
        buf,
        promptResult.stylePreset,
        nextVersion,
      );

      const meta = createEmptyEditorialImageMetadata(
        slug,
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
      meta.imageApproved = qaPass;
      meta.lqip = paths.lqip ?? undefined;
      meta.delivery = paths.delivery;
      meta.quality = quality;
      meta.social = buildSocialPackStub({
        slug,
        title: t.title,
        stylePreset: promptResult.stylePreset,
        categoryLabel: categoryForTarget(t),
      });

      if (
        getCuratedRecipeBySlug(slug) &&
        !attachEditorialImagesToSlug({
          slug,
          metadata: meta,
          markApproved: qaPass,
          forceApprove: true,
        })
      ) {
        console.warn(`  ✗ ${slug}: attach editorial metadata failed`);
        results.push({ slug, title: t.title, reasonFailed, replacementGenerated: false, qaPass: false });
        continue;
      }

      console.log(`  ✓ ${slug} → regen v${nextVersion} QA=${qaPass ? "pass" : "warn"}`);
      const result: RegenResult = {
        slug,
        title: t.title,
        reasonFailed,
        replacementGenerated: true,
        qaPass,
        qaNotes: mealVision.reasons.join("; ") || `composite=${quality.composite}`,
      };
      results.push(result);
      updateAuditRow(slug, result);
    } catch (err) {
      console.warn(`  ✗ ${slug}: ${err instanceof Error ? err.message : String(err)}`);
      results.push({ slug, title: t.title, reasonFailed, replacementGenerated: false, qaPass: false });
    }
  }

  if (apply) await flushSqliteToDisk();

  const reportPath = path.join("review", "meal-image-trust-regen-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
  );
  console.log(`[regen-meal-image-trust] wrote ${reportPath}`);
  console.log(
    `[regen-meal-image-trust] generated=${results.filter((r) => r.replacementGenerated).length} qaPass=${results.filter((r) => r.qaPass).length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
