#!/usr/bin/env tsx
/**
 * Rebuild every Performance Meals page from shared/performance-meals/adapted/*
 * (batch01-07) after a text-only edit to recipe source (e.g. jargon cleanup).
 * Preserves each recipe's existing image fields (heroImage/mobileImage/thumbImage/railImage)
 * by reading them off the currently-published page before overwriting.
 */
import { PERFORMANCE_ADAPTED_RECIPES } from "../shared/performance-meals/adapted/index.js";
import { buildPerformanceRecipePage } from "../server/performance-meals/page-builder.js";
import {
  writePerformanceCatalogIndex,
  writePerformanceRecipePage,
  readPerformanceRecipePage,
  listPerformancePageSlugs,
} from "../server/performance-meals/page-store.js";
import { validateGoldenRecipePage } from "../server/golden-100/recipe-page-validator.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";

function main(): void {
  console.log(`[rebuild-all] Rebuilding ${PERFORMANCE_ADAPTED_RECIPES.length} recipe pages...`);

  const validationErrors: string[] = [];
  let written = 0;

  for (const recipe of PERFORMANCE_ADAPTED_RECIPES) {
    const slug = recipe.manifest.slug;
    const existing = readPerformanceRecipePage(slug);

    const page = buildPerformanceRecipePage(recipe);
    // Preserve whatever imagery is already published for this slug.
    page.heroImage = existing?.heroImage ?? "";
    page.mobileImage = existing?.mobileImage ?? "";
    page.thumbImage = existing?.thumbImage ?? "";
    page.railImage = existing?.railImage ?? "";

    const validation = validateGoldenRecipePage(page);
    const errors = validation.issues.filter((i) => i.severity === "error");
    if (errors.length) {
      validationErrors.push(`${slug}: ${errors.map((e) => e.message).join("; ")}`);
      continue;
    }

    writePerformanceRecipePage(page);
    written++;
  }

  if (validationErrors.length) {
    console.error(`[rebuild-all] ${validationErrors.length} recipes failed schema validation:`);
    for (const e of validationErrors) console.error(`  ✗ ${e}`);
    process.exitCode = 1;
  }

  const allSlugs = listPerformancePageSlugs();
  const allPages: GoldenRecipePage[] = [];
  for (const slug of allSlugs) {
    const page = readPerformanceRecipePage(slug);
    if (page) allPages.push(page);
  }
  const indexPath = writePerformanceCatalogIndex(allPages);

  console.log(
    `[rebuild-all] Wrote ${written}/${PERFORMANCE_ADAPTED_RECIPES.length} pages. ` +
      `Index now has ${allPages.length} total recipes → ${indexPath}`,
  );
}

main();
