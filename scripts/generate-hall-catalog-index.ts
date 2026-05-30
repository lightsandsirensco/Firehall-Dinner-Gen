#!/usr/bin/env tsx
/**
 * Generate a unified hall catalog index file:
 * - Includes Golden 100 + Performance Meals (+ BBQ set later)
 * - Excludes smoothies (separate fuel catalog) and breakfast meals (separate file)
 *
 * Outputs:
 * - client/public/catalog/hall/index.json
 * - client/public/catalog/breakfast-meals/index.json
 */

import fs from "node:fs";
import path from "node:path";
import type { GoldenCatalogIndex } from "../shared/golden-100/recipe-page-schema.js";
import { mergeHallCatalogIndexes } from "../shared/meal-catalog/unified-index.js";
import { isBreakfastMeal } from "../shared/hall-catalog/isolation.js";

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function writeJson(p: string, data: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function main(): void {
  const goldenPath = path.join(process.cwd(), "client/public/catalog/golden-100/index.json");
  const perfPath = path.join(process.cwd(), "client/public/catalog/performance-meals/index.json");
  const expansionPath = path.join(process.cwd(), "client/public/catalog/hall-expansion/index.json");

  if (!fs.existsSync(goldenPath)) throw new Error("Missing Golden index.json — run npm run catalog:generate-pages");
  if (!fs.existsSync(perfPath)) throw new Error("Missing performance index.json — run npm run performance:generate-pages");

  const golden = readJson<GoldenCatalogIndex>(goldenPath);
  const perf = readJson<GoldenCatalogIndex>(perfPath);
  const expansion = fs.existsSync(expansionPath)
    ? readJson<GoldenCatalogIndex>(expansionPath)
    : null;

  const merged = mergeHallCatalogIndexes(golden, perf, expansion);

  const breakfast = {
    ...merged,
    generatedAt: new Date().toISOString(),
    recipeCount: merged.recipes.filter((r) => isBreakfastMeal(r)).length,
    recipes: merged.recipes.filter((r) => isBreakfastMeal(r)),
    catalogSet: "breakfast_meals",
  };

  const hall = {
    ...merged,
    generatedAt: new Date().toISOString(),
    recipeCount: merged.recipes.filter((r) => !isBreakfastMeal(r)).length,
    recipes: merged.recipes.filter((r) => !isBreakfastMeal(r)),
    catalogSet: "hall_catalog",
  };

  writeJson(path.join(process.cwd(), "client/public/catalog/hall/index.json"), hall);
  writeJson(path.join(process.cwd(), "client/public/catalog/breakfast-meals/index.json"), breakfast);

  console.log(`[hall-catalog] wrote hall=${hall.recipeCount} breakfast=${breakfast.recipeCount}`);
}

main();

