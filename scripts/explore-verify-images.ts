#!/usr/bin/env tsx
/**
 * Verify Explore catalog image coverage and UI rules.
 *
 *   npx tsx scripts/explore-verify-images.ts
 *   npm run explore:verify-images
 */
import fs from "node:fs";
import path from "node:path";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import {
  imageFileExists,
  resolveExistingSlugImage,
} from "../shared/explore-image-paths.js";

const EXPLORE_CARD_SOURCE = path.join(
  process.cwd(),
  "client",
  "src",
  "components",
  "explore-catalog-browser.tsx",
);

function main(): void {
  const catalog = buildApprovedCatalog();
  const errors: string[] = [];
  const missing: string[] = [];

  for (const entry of catalog.recipes) {
    const resolved = resolveExistingSlugImage(entry.slug, entry.kind);
    if (!resolved.found) {
      missing.push(entry.slug);
      errors.push(`Missing slug-locked image: ${entry.slug} (${entry.kind})`);
      continue;
    }

    if (
      entry.kind !== "hall_classic" &&
      !entry.isSmoothie &&
      !entry.thumbImage.includes(entry.slug) &&
      !entry.heroImage.includes(entry.slug)
    ) {
      errors.push(`API image path slug mismatch for ${entry.slug}: ${entry.thumbImage}`);
    }
  }

  const cardSource = fs.readFileSync(EXPLORE_CARD_SOURCE, "utf8");
  if (cardSource.includes("{entry.catalogBadge}")) {
    errors.push("Explore card still renders catalogBadge on image overlay");
  }
  if (/absolute\s+left-[\d.]+\s+top-[\d.]+[\s\S]{0,120}catalogBadge/.test(cardSource)) {
    errors.push("Explore card still has badge overlay positioning near catalogBadge");
  }

  const coverage =
    catalog.recipeCount > 0
      ? Math.round(((catalog.recipeCount - missing.length) / catalog.recipeCount) * 1000) / 10
      : 0;

  const report = {
    audited: catalog.recipeCount,
    missing: missing.length,
    missingSlugs: missing,
    coveragePercent: coverage,
    pass: errors.length === 0,
  };

  if (errors.length > 0) {
    console.error("[explore:verify-images] FAIL\n");
    for (const err of errors.slice(0, 40)) console.error(`  - ${err}`);
    if (errors.length > 40) console.error(`  … and ${errors.length - 40} more`);
    console.error(`\nCoverage: ${coverage}% (${catalog.recipeCount - missing.length}/${catalog.recipeCount})`);
    process.exit(1);
  }

  console.log(
    `[explore:verify-images] PASS — ${catalog.recipeCount} recipes, ${coverage}% image coverage, no Explore photo badges`,
  );
}

main();
