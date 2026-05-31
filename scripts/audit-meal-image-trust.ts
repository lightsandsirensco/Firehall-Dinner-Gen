#!/usr/bin/env tsx
/**
 * Meal image trust audit — title, ingredients, sides vs hero (heuristic + optional vision).
 *
 *   npm run audit:meal-image-trust
 *   npx tsx scripts/audit-meal-image-trust.ts --vision
 *   npx tsx scripts/audit-meal-image-trust.ts --collection=performance_meals,golden_100
 *
 * Outputs:
 *   review/meal-image-trust-audit.json
 *   review/meal-image-trust-audit.md
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  auditMealImageCompleteness,
  extractMealImageRequirements,
  hasMealCompletenessFailure,
} from "../shared/curated-image-governance/meal-image-completeness.js";
import {
  auditTitlePathKeywords,
  auditCategoryMealFormat,
  type ImageAccuracyIssue,
} from "../shared/curated-image-governance/image-accuracy-rules.js";
import { auditTitlePrimarySideAlignment } from "../shared/curated-image-governance/title-primary-side-rules.js";
import {
  loadTrustAuditTargets,
  readHeroBuffer,
  type TrustAuditCollection,
  type TrustAuditTarget,
} from "../shared/curated-image-governance/trust-audit-targets.js";
import { auditMealImageWithVision } from "../server/imagery/audit-meal-image-vision.js";
import { imageFileExists } from "../shared/explore-image-paths.js";

const JSON_PATH = path.join("review", "meal-image-trust-audit.json");
const MD_PATH = path.join("review", "meal-image-trust-audit.md");

type TrustAuditRow = {
  collection: TrustAuditCollection;
  slug: string;
  title: string;
  heroImage: string;
  heroOnDisk: boolean;
  reasonsFailed: string[];
  heuristicPass: boolean;
  visionPass: boolean | null;
  visionSkipped: boolean;
  pass: boolean;
  replacementGenerated: boolean;
  qaPass: boolean | null;
  issues: ImageAccuracyIssue[];
};

function parseArgs(argv: string[]) {
  const vision = argv.includes("--vision");
  const collArg = argv.find((a) => a.startsWith("--collection="));
  const collections = collArg
    ? new Set(collArg.replace("--collection=", "").split(",").map((s) => s.trim()) as TrustAuditCollection[])
    : null;
  return { vision, collections };
}

async function auditTarget(target: TrustAuditTarget, useVision: boolean): Promise<TrustAuditRow> {
  const heroAlt = target.heroAlt || target.title;
  const issues: ImageAccuracyIssue[] = [
    ...auditTitlePathKeywords(target.title, target.heroImage, heroAlt),
    ...auditCategoryMealFormat(target.title, target.mealFormat, target.cuisine, target.heroImage),
    ...auditTitlePrimarySideAlignment({
      slug: target.slug,
      title: target.title,
      mealFormat: target.mealFormat,
      heroPath: target.heroImage,
      heroAlt,
    }),
    ...auditMealImageCompleteness({
      slug: target.slug,
      title: target.title,
      mealFormat: target.mealFormat,
      heroPath: target.heroImage,
      heroAlt,
      ingredients: target.ingredients,
      tonightSpread: target.tonightSpread,
      metadataOnly: !useVision,
    }),
  ];

  if (!imageFileExists(target.heroImage)) {
    issues.push({
      code: "missing_image_file",
      severity: "critical",
      message: "hero image file missing on disk",
      confidence: 95,
    });
  }

  const heuristicPass = !hasMealCompletenessFailure(issues) && !issues.some((i) => i.severity === "critical");

  let visionPass: boolean | null = null;
  let visionSkipped = true;
  if (useVision && imageFileExists(target.heroImage)) {
    const buf = readHeroBuffer(target.heroImage);
    if (buf) {
      const req = extractMealImageRequirements({
        title: target.title,
        mealFormat: target.mealFormat,
        ingredients: target.ingredients,
        tonightSpread: target.tonightSpread,
      });
      const vision = await auditMealImageWithVision({
        imageBuffer: buf,
        title: target.title,
        requirements: req,
        ingredients: target.ingredients,
        mealFormat: target.mealFormat,
        cuisine: target.cuisine,
        force: useVision,
      });
      visionPass = vision.pass;
      visionSkipped = vision.skipped === true;
      if (!vision.pass && !vision.skipped) {
        for (const reason of vision.reasons) {
          issues.push({
            code: "image_title_mismatch",
            severity: "critical",
            message: `Vision: ${reason}`,
            confidence: vision.confidence,
          });
        }
        if (vision.proteinOnly) {
          issues.push({
            code: "image_title_mismatch",
            severity: "critical",
            message: "Vision: protein-only hero — missing sides/carbs/vegetables",
            confidence: vision.confidence,
          });
        }
        if (vision.couldBelongToAnotherRecipe) {
          issues.push({
            code: "generic_substitute_meal",
            severity: "critical",
            message: "Vision: image could belong to another recipe",
            confidence: vision.confidence,
          });
        }
      }
    }
  }

  const pass = heuristicPass && (visionPass !== false);

  return {
    collection: target.collection,
    slug: target.slug,
    title: target.title,
    heroImage: target.heroImage,
    heroOnDisk: imageFileExists(target.heroImage),
    reasonsFailed: [...new Set(issues.filter((i) => i.severity === "critical").map((i) => i.message))],
    heuristicPass,
    visionPass,
    visionSkipped,
    pass,
    replacementGenerated: false,
    qaPass: null,
    issues,
  };
}

async function main(): Promise<void> {
  const { vision, collections } = parseArgs(process.argv);
  const targets = loadTrustAuditTargets(collections ?? undefined);

  console.log(`[audit:meal-image-trust] targets=${targets.length} vision=${vision}`);

  const rows: TrustAuditRow[] = [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]!;
    if (i % 25 === 0) console.log(`  auditing ${i + 1}/${targets.length}…`);
    rows.push(await auditTarget(t, vision));
  }

  const failed = rows.filter((r) => !r.pass);
  const report = {
    generatedAt: new Date().toISOString(),
    visionEnabled: vision,
    totals: {
      audited: rows.length,
      passed: rows.filter((r) => r.pass).length,
      failed: failed.length,
      titleIngredientMismatches: rows.filter((r) =>
        r.reasonsFailed.some((m) => /title component|Vision:|substitute|mismatch/i.test(m)),
      ).length,
      missingSideDishes: rows.filter((r) =>
        r.reasonsFailed.some((m) => /side|complete meal|protein-only/i.test(m)),
      ).length,
      proteinOnlyHeroes: rows.filter((r) => r.reasonsFailed.some((m) => /protein-only/i.test(m))).length,
    },
    rows,
    failedRecipes: failed.map((r) => ({
      recipe: r.title,
      slug: r.slug,
      collection: r.collection,
      reasonFailed: r.reasonsFailed.join(" | ") || "unknown",
      replacementGenerated: r.replacementGenerated,
      qaPass: r.qaPass,
    })),
  };

  fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
  fs.writeFileSync(JSON_PATH, JSON.stringify(report, null, 2));

  const md: string[] = [
    "# Meal Image Trust Audit",
    "",
    `- Audited: **${report.totals.audited}**`,
    `- Passed: **${report.totals.passed}**`,
    `- Failed: **${report.totals.failed}**`,
    `- Title ingredient mismatches: **${report.totals.titleIngredientMismatches}**`,
    `- Missing side dishes: **${report.totals.missingSideDishes}**`,
    `- Protein-only heroes: **${report.totals.proteinOnlyHeroes}**`,
    `- Vision enabled: **${vision}**`,
    "",
    "## Failed recipes",
    "",
    "| Recipe | Reason failed | Replacement | QA |",
    "| --- | --- | --- | --- |",
  ];

  if (failed.length === 0) {
    md.push("| _none_ | — | — | — |");
  } else {
    for (const r of failed) {
      md.push(
        `| ${r.title} (\`${r.slug}\`) | ${r.reasonsFailed.slice(0, 2).join("; ").replace(/\|/g, "/")} | ${r.replacementGenerated ? "yes" : "no"} | ${r.qaPass === null ? "—" : r.qaPass ? "pass" : "fail"} |`,
      );
    }
  }

  fs.writeFileSync(MD_PATH, md.join("\n"));
  console.log(`[audit:meal-image-trust] wrote ${JSON_PATH}`);
  console.log(
    `[audit:meal-image-trust] pass=${report.totals.passed} fail=${report.totals.failed} proteinOnly=${report.totals.proteinOnlyHeroes}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
