/**
 * Load merged hall catalog index (Golden 100 + Performance Meals).
 */

import fs from "node:fs";
import path from "node:path";
import {
  goldenCatalogIndexSchema,
  type GoldenCatalogIndex,
  type GoldenRecipePage,
} from "../../shared/golden-100/recipe-page-schema.js";
import { mergeHallCatalogIndexes } from "../../shared/meal-catalog/unified-index.js";
import { isBreakfastMeal } from "../../shared/hall-catalog/isolation.js";
import { GOLDEN_CATALOG_PUBLIC_DIR } from "../golden-100/page-store.js";
import { PERFORMANCE_CATALOG_PUBLIC_DIR } from "../performance-meals/page-store.js";
import { readGoldenRecipePage } from "../golden-100/page-store.js";
import { buildGoldenRecipePage } from "../golden-100/recipe-page-builder.js";
import { getGoldenRecipeBySlug } from "../../shared/golden-100/manifest.js";
import { GOLDEN_100_RECIPES } from "../../shared/golden-100/index.js";
import { readPerformanceRecipePage } from "../performance-meals/page-store.js";
import { buildPerformanceRecipePage } from "../performance-meals/page-builder.js";
import { getPerformanceRecipeBySlug } from "../../shared/performance-meals/adapted/index.js";
import { HALL_EXPANSION_CATALOG_PUBLIC_DIR } from "../hall-expansion/page-store.js";
import { readHallExpansionRecipePage } from "../hall-expansion/page-store.js";
import { buildHallExpansionRecipePage } from "../hall-expansion/page-builder.js";
import { getHallExpansionRecipeBySlug } from "../../shared/hall-expansion/adapted/index.js";

function readCatalogIndexFile(dir: string): GoldenCatalogIndex | null {
  const indexFile = path.join(dir, "index.json");
  if (!fs.existsSync(indexFile)) return null;
  const raw = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  return goldenCatalogIndexSchema.parse(raw);
}

function goldenIndexFromManifest(): GoldenCatalogIndex {
  const recipes = GOLDEN_100_RECIPES.map((def) => {
    const page = buildGoldenRecipePage(def);
    return {
      slug: page.slug,
      title: page.title,
      subtitle: page.subtitle,
      category: page.category,
      cuisine: page.cuisine,
      protein: def.protein,
      mealFormat: def.mealFormat,
      cookTime: page.cookTime,
      difficulty: page.difficulty,
      heroImage: page.heroImage,
      thumbImage: page.thumbImage,
      tags: page.tags,
      firefighterScore: page.firefighterScore,
      popularityWeight: page.popularityWeight,
      searchTerms: page.searchTerms,
    };
  });
  return {
    version: 1,
    contentVersion: 1,
    generatedAt: new Date().toISOString(),
    recipeCount: recipes.length,
    recipes,
  };
}

export function loadMergedHallCatalogIndex(): GoldenCatalogIndex {
  const golden = readCatalogIndexFile(GOLDEN_CATALOG_PUBLIC_DIR) ?? goldenIndexFromManifest();
  const performance = readCatalogIndexFile(PERFORMANCE_CATALOG_PUBLIC_DIR);
  const expansion = readCatalogIndexFile(HALL_EXPANSION_CATALOG_PUBLIC_DIR);
  const merged = mergeHallCatalogIndexes(golden, performance, expansion);
  // Breakfast meals must live in a separate file/catalog.
  const recipes = merged.recipes.filter((r) => !isBreakfastMeal(r));
  return { ...merged, recipeCount: recipes.length, recipes };
}

/** Resolve a recipe page from Golden 100 or Performance Meals catalogs. */
export function resolveHallRecipePage(slug: string): GoldenRecipePage | null {
  const normalized = slug.trim().toLowerCase();
  const goldenDef = getGoldenRecipeBySlug(normalized);
  if (goldenDef) {
    return readGoldenRecipePage(normalized) ?? buildGoldenRecipePage(goldenDef);
  }
  const performance = getPerformanceRecipeBySlug(normalized);
  if (performance) {
    return readPerformanceRecipePage(normalized) ?? buildPerformanceRecipePage(performance);
  }
  const expansion = getHallExpansionRecipeBySlug(normalized);
  if (expansion) {
    return readHallExpansionRecipePage(normalized) ?? buildHallExpansionRecipePage(expansion);
  }
  return null;
}
