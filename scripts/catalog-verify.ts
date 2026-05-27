#!/usr/bin/env tsx
/**
 * Verify Golden 100 catalog completeness — pages, images, validation.
 *
 *   npx tsx scripts/catalog-verify.ts
 *   npx tsx scripts/catalog-verify.ts --json
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { validateGoldenManifest } from "../shared/golden-100/validate.js";
import { buildGoldenRecipePage } from "../server/golden-100/recipe-page-builder.js";
import { validateGoldenRecipePage } from "../server/golden-100/recipe-page-validator.js";
import { checkGoldenPageAssets, listMissingGoldenAssets } from "../server/golden-100/page-assets.js";
import {
  GOLDEN_CATALOG_PUBLIC_DIR,
  listGoldenPageSlugs,
  readGoldenRecipePage,
} from "../server/golden-100/page-store.js";
import { auditGolden100Dataset } from "../server/golden-100/audit.js";

const jsonOut = process.argv.includes("--json");

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  const manifestIssues = validateGoldenManifest().filter((i) => i.severity === "error");
  const slugs = GOLDEN_100_RECIPES.map((r) => r.slug);
  const pageSlugs = new Set(listGoldenPageSlugs());
  const missingPages = slugs.filter((s) => !pageSlugs.has(s));
  const assetGaps = listMissingGoldenAssets(slugs);
  const dbAudit = auditGolden100Dataset();

  const pageValidationFailures: Array<{ slug: string; issues: string[] }> = [];
  for (const slug of slugs) {
    const onDisk = readGoldenRecipePage(slug);
    const page = onDisk ?? buildGoldenRecipePage(GOLDEN_100_RECIPES.find((r) => r.slug === slug)!);
    const v = validateGoldenRecipePage(page);
    if (!v.pass) {
      pageValidationFailures.push({
        slug,
        issues: v.issues.filter((i) => i.severity === "error").map((i) => i.message),
      });
    }
  }

  const report = {
    manifest: {
      count: slugs.length,
      errors: manifestIssues.length,
    },
    pages: {
      onDisk: pageSlugs.size,
      missing: missingPages,
      validationFailures: pageValidationFailures,
      indexExists: fs.existsSync(path.join(GOLDEN_CATALOG_PUBLIC_DIR, "index.json")),
    },
    images: {
      heroesMissing: assetGaps.filter((a) => !a.hero).map((a) => a.slug),
      incompleteVariants: assetGaps.length,
      sample: assetGaps.slice(0, 10),
    },
    database: {
      published: dbAudit.publishedGoldenCount,
      missingInDb: dbAudit.missingInDb.length,
    },
    pass:
      manifestIssues.length === 0 &&
      missingPages.length === 0 &&
      pageValidationFailures.length === 0 &&
      dbAudit.missingInDb.length === 0,
  };

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("[catalog:verify] Golden 100 catalog report\n");
    console.log(`  Manifest: ${report.manifest.count} recipes, ${report.manifest.errors} errors`);
    console.log(`  Pages on disk: ${report.pages.onDisk}/${slugs.length}`);
    if (missingPages.length) {
      console.log(`  Missing pages (${missingPages.length}): ${missingPages.slice(0, 8).join(", ")}${missingPages.length > 8 ? "…" : ""}`);
    }
    console.log(`  Image gaps: ${report.images.incompleteVariants} recipes missing variants`);
    console.log(`  Heroes missing: ${report.images.heroesMissing.length}`);
    console.log(`  DB published: ${report.database.published}/${slugs.length}`);
    if (report.database.missingInDb) {
      console.log(`  Not seeded: ${dbAudit.missingInDb.slice(0, 8).join(", ")}${dbAudit.missingInDb.length > 8 ? "…" : ""}`);
    }
    if (pageValidationFailures.length) {
      console.log(`  Page validation failures: ${pageValidationFailures.length}`);
    }
    console.log(`\n  Overall: ${report.pass ? "PASS" : "NEEDS WORK"}`);
    console.log("\n  Run: npm run catalog:generate-pages && npm run catalog:generate-images");
  }

  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
