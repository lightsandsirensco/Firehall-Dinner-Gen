#!/usr/bin/env tsx
/**
 * Publish the new 28-recipe Performance Meals expansion (batch06 + batch07)
 * to client/public/catalog/performance-meals/, then regenerate the full index.
 *
 * This intentionally does NOT go through scripts/performance-meals-generate-pages.ts
 * because that script asserts against the legacy source-registry.ts /
 * PERFORMANCE_MEAL_COUNT tracking (scoped to the original 50-recipe batch),
 * which is decoupled from the live catalog. The live server reads
 * client/public/catalog/performance-meals/{index.json,pages/*.json} directly
 * (see server/meal-catalog/load-index.ts), so writing there is sufficient.
 */
import { batch06 } from "../shared/performance-meals/adapted/batch-06.js";
import { batch07 } from "../shared/performance-meals/adapted/batch-07.js";
import { buildPerformanceRecipePage } from "../server/performance-meals/page-builder.js";
import {
  writePerformanceCatalogIndex,
  writePerformanceRecipePage,
  readPerformanceRecipePage,
  listPerformancePageSlugs,
} from "../server/performance-meals/page-store.js";
import { validateGoldenRecipePage } from "../server/golden-100/recipe-page-validator.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import type { PerformanceAdaptedRecipe } from "../shared/performance-meals/types.js";

const NEW_RECIPES: PerformanceAdaptedRecipe[] = [...batch06, ...batch07];

const NUTRITION_TARGETS = {
  protein: [40, 70] as const,
  calories: [450, 750] as const,
  fats: [10, 25] as const,
  carbs: [25, 60] as const,
  fiber: [5, 12] as const,
};

function inRange(value: number, [min, max]: readonly [number, number]): boolean {
  return value >= min && value <= max;
}

function main(): void {
  console.log(`[batch-06-07] Building ${NEW_RECIPES.length} new recipe pages...`);

  const nutritionWarnings: string[] = [];
  const validationErrors: string[] = [];
  const newPages: GoldenRecipePage[] = [];

  for (const recipe of NEW_RECIPES) {
    const slug = recipe.manifest.slug;
    const n = recipe.nutrition;

    if (!inRange(n.protein, NUTRITION_TARGETS.protein)) {
      nutritionWarnings.push(`${slug}: protein ${n.protein}g outside 40-70g target`);
    }
    if (!inRange(n.calories, NUTRITION_TARGETS.calories)) {
      nutritionWarnings.push(`${slug}: calories ${n.calories} outside 450-750 target`);
    }
    if (!inRange(n.fats, NUTRITION_TARGETS.fats)) {
      nutritionWarnings.push(`${slug}: fats ${n.fats}g outside 10-25g target`);
    }
    if (!inRange(n.carbs, NUTRITION_TARGETS.carbs)) {
      nutritionWarnings.push(`${slug}: carbs ${n.carbs}g outside 25-60g target`);
    }
    if (n.fiber != null && !inRange(n.fiber, NUTRITION_TARGETS.fiber)) {
      nutritionWarnings.push(`${slug}: fiber ${n.fiber}g outside 5-12g target`);
    }

    const page = buildPerformanceRecipePage(recipe);
    // No real photography has been generated for this batch yet — blank the
    // image fields so the site's MissingRecipeImagePlaceholder renders
    // cleanly everywhere instead of a broken image request.
    page.heroImage = "";
    page.mobileImage = "";
    page.thumbImage = "";
    page.railImage = "";

    const validation = validateGoldenRecipePage(page);
    const errors = validation.issues.filter((i) => i.severity === "error");
    if (errors.length) {
      validationErrors.push(`${slug}: ${errors.map((e) => e.message).join("; ")}`);
      continue;
    }

    writePerformanceRecipePage(page);
    newPages.push(page);
  }

  if (validationErrors.length) {
    console.error(`[batch-06-07] ${validationErrors.length} recipes failed schema validation:`);
    for (const e of validationErrors) console.error(`  ✗ ${e}`);
    process.exitCode = 1;
  }

  if (nutritionWarnings.length) {
    console.warn(`[batch-06-07] ${nutritionWarnings.length} nutrition targets out of range (non-blocking):`);
    for (const w of nutritionWarnings) console.warn(`  ⚠ ${w}`);
  }

  // Regenerate the full catalog index from every page on disk (old + new).
  const allSlugs = listPerformancePageSlugs();
  const allPages: GoldenRecipePage[] = [];
  for (const slug of allSlugs) {
    const page = readPerformanceRecipePage(slug);
    if (page) allPages.push(page);
  }
  const indexPath = writePerformanceCatalogIndex(allPages);

  console.log(
    `[batch-06-07] Wrote ${newPages.length}/${NEW_RECIPES.length} new pages. ` +
      `Index now has ${allPages.length} total recipes → ${indexPath}`,
  );
}

main();
