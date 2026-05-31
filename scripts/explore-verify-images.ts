#!/usr/bin/env tsx
/**
 * Verify Explore catalog image coverage and slug-locked identity rules.
 *
 *   npm run explore:verify-images
 */
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries, buildApprovedCatalog } from "../server/approved-catalog.js";
import { auditExploreImageMappings } from "../shared/explore-image-mapping.js";

const EXPLORE_CARD_SOURCE = path.join(
  process.cwd(),
  "client",
  "src",
  "components",
  "explore-catalog-browser.tsx",
);

function main(): void {
  const allEntries = buildAllApprovedCatalogEntries();
  const fullReport = auditExploreImageMappings(allEntries);
  const exploreCatalog = buildApprovedCatalog();
  const exploreReport = auditExploreImageMappings(exploreCatalog.recipes);
  const errors: string[] = [];

  const invalidInExplore = exploreReport.rows.filter((row) => !row.exploreEligible);
  if (invalidInExplore.length > 0) {
    errors.push(`${invalidInExplore.length} invalid recipe(s) still exposed on Explore API`);
    for (const row of invalidInExplore.slice(0, 20)) {
      errors.push(`${row.slug}: ${row.issues[0]?.message || row.status}`);
    }
  }

  const cardSource = fs.readFileSync(EXPLORE_CARD_SOURCE, "utf8");
  if (cardSource.includes("entry.thumbImage || entry.heroImage")) {
    errors.push("Explore card still prefers thumbImage over heroImage");
  }
  if (cardSource.includes("{entry.catalogBadge}")) {
    errors.push("Explore card still renders catalogBadge on image overlay");
  }

  const coverage =
    fullReport.totals.recipes > 0
      ? Math.round((fullReport.totals.exploreEligible / fullReport.totals.recipes) * 1000) / 10
      : 0;

  if (errors.length > 0) {
    console.error("[explore:verify-images] FAIL\n");
    for (const err of errors) console.error(`  - ${err}`);
    console.error(
      `\nCatalog identity coverage: ${coverage}% (${fullReport.totals.exploreEligible}/${fullReport.totals.recipes})`,
    );
    process.exit(1);
  }

  console.log(
    `[explore:verify-images] PASS — Explore API ${exploreCatalog.recipeCount} recipes, all slug-validated; catalog coverage ${coverage}% (${fullReport.totals.exploreEligible}/${fullReport.totals.recipes})`,
  );
}

main();
