#!/usr/bin/env tsx
/**
 * Projects each recipe page's already-computed `nutrition.filterFlags` /
 * `nutrition.badgeCandidates` (see shared/nutrition/calculate.ts —
 * `highProtein: protein >= 35g`, `lowCarb: carbs <= 25g`, `lighterOption:
 * calories <= 550 && fat <= 20g`, etc.) onto a compact `nutritionSummary`
 * field on the matching entry in each collection's index.json.
 *
 * This replaces the previous Explore "High protein" / "Healthy" filters,
 * which classified recipes from title/tag keyword text (e.g. tags containing
 * "protein" or "healthy") instead of real per-serving macros. Must be re-run
 * any time recipe nutrition changes or a collection index is regenerated.
 *
 * Also projects the raw per-serving macros (calories/protein/carbs/fat —
 * straight from the page's own `nutrition` block, never recalculated here)
 * plus `numericFilterEligible`, a deterministic reliability signal reused
 * from the existing nutrition integrity audit (see
 * shared/nutrition/integrity-audit.ts + shared/nutrition/filter-eligibility.ts)
 * that powers Firehall Meals Pro's numeric nutrition filtering (min protein /
 * max calories / max carbs / max fat) in server/approved-catalog.ts. This
 * does NOT introduce a second nutrition calculation engine — it reuses the
 * exact same audit function the human-facing integrity report runs.
 *
 *   npx tsx scripts/nutrition-index-classify.ts --dry-run
 *   npx tsx scripts/nutrition-index-classify.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  auditRecipeNutritionIntegrity,
  type NutritionCatalogId,
} from "../shared/nutrition/integrity-audit.js";
import { isEligibleForNumericNutritionFilter } from "../shared/nutrition/filter-eligibility.js";
import { catalogIngredientsFromUnknown, defaultRecipeServings } from "../shared/nutrition/servings.js";
import { getRecipeBaseServings } from "../shared/recipe/crew-scaling-config.js";

const DRY_RUN = process.argv.includes("--dry-run");

const COLLECTIONS: Array<{
  id: string;
  root: string;
  catalogId: NutritionCatalogId;
  mealType: "dinner" | "breakfast" | "smoothie";
}> = [
  { id: "golden-100", root: "client/public/catalog/golden-100", catalogId: "golden_100", mealType: "dinner" },
  {
    id: "hall-expansion",
    root: "client/public/catalog/hall-expansion",
    catalogId: "hall_expansion",
    mealType: "dinner",
  },
  { id: "bbq", root: "client/public/catalog/bbq", catalogId: "bbq_grill", mealType: "dinner" },
  {
    id: "performance-meals",
    root: "client/public/catalog/performance-meals",
    catalogId: "performance_meals",
    mealType: "dinner",
  },
  { id: "breakfast", root: "client/public/catalog/breakfast", catalogId: "breakfast", mealType: "breakfast" },
  { id: "pizza-night", root: "client/public/catalog/pizza-night", catalogId: "pizza_night", mealType: "dinner" },
  { id: "smoothies", root: "client/public/catalog/smoothies", catalogId: "smoothies", mealType: "smoothie" },
];

interface NutritionSummary {
  highProtein: boolean;
  lowCarb: boolean;
  healthy: boolean;
  estimateAvailable: boolean;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  numericFilterEligible: boolean;
}

interface PageRecord {
  collection: string;
  slug: string;
  nutritionSummary: NutritionSummary;
}

function loadPages(
  root: string,
  collection: string,
  catalogId: NutritionCatalogId,
  mealType: "dinner" | "breakfast" | "smoothie",
): PageRecord[] {
  const dir = path.join(root, "pages");
  const out: PageRecord[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const json = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      if (!json?.slug) continue;
      const ff = json.nutrition?.filterFlags;
      const bc = json.nutrition?.badgeCandidates;
      const estimateAvailable = Boolean(json.nutrition?.estimateAvailable);

      const calories = Number(json.nutrition?.calories ?? json.calories ?? 0);
      const protein = Number(json.nutrition?.protein ?? json.protein ?? 0);
      const carbs = Number(json.nutrition?.carbs ?? json.carbs ?? 0);
      const fat = Number(json.nutrition?.fats ?? json.nutrition?.fat ?? json.fats ?? json.fat ?? 0);

      // Reuse the exact same integrity audit the human-facing nutrition
      // report runs (shared/nutrition/integrity-audit.ts) to derive a
      // deterministic reliability signal — no separate calculation engine,
      // no recalculation written back to the page, no hand-written slug list.
      const baseServings =
        getRecipeBaseServings({
          baseServings: Number(json.baseServings) || undefined,
          crewSize: Number(json.crewSize) || undefined,
        }) || defaultRecipeServings(json, mealType);
      const auditResult = auditRecipeNutritionIntegrity({
        slug: json.slug,
        title: String(json.displayTitle || json.title || json.slug),
        catalog: catalogId,
        mealType,
        category: typeof json.category === "string" ? json.category : undefined,
        baseServings,
        ingredients: catalogIngredientsFromUnknown(json.ingredients),
        stored: {
          calories,
          protein,
          carbs,
          fat,
          source: json.nutrition?.source,
          estimateAvailable,
        },
      });
      const numericFilterEligible = estimateAvailable && isEligibleForNumericNutritionFilter(auditResult);

      out.push({
        collection,
        slug: json.slug,
        nutritionSummary: {
          highProtein: estimateAvailable ? Boolean(ff?.highProtein) : false,
          lowCarb: estimateAvailable ? Boolean(ff?.lowCarb) : false,
          // "Healthy" = an explicit, nutrition-threshold scoring rule (calories <= 550
          // AND fat <= 20g per serving, i.e. shared/nutrition/calculate.ts's
          // `lighterOption`), OR the dedicated performance-meal macros (>=30g protein,
          // <=650 cal, <=25g fat) — never a subjective "healthy" tag/keyword match.
          healthy: estimateAvailable ? Boolean(bc?.lighterOption || bc?.performanceMeal) : false,
          estimateAvailable,
          ...(numericFilterEligible ? { calories, protein, carbs, fat } : {}),
          numericFilterEligible,
        },
      });
    } catch {
      // skip malformed
    }
  }
  return out;
}

const allPages: PageRecord[] = [];
for (const { id, root, catalogId, mealType } of COLLECTIONS) {
  allPages.push(...loadPages(root, id, catalogId, mealType));
}

const bySlug = new Map<string, PageRecord["nutritionSummary"]>();
for (const p of allPages) bySlug.set(`${p.collection}::${p.slug}`, p.nutritionSummary);

console.log(`[nutrition-index] Loaded nutrition data for ${allPages.length} recipe pages.`);
const eligibleCount = allPages.filter((p) => p.nutritionSummary.numericFilterEligible).length;
console.log(
  `[nutrition-index] ${eligibleCount}/${allPages.length} recipes eligible for Pro numeric nutrition filtering.`,
);

let indexesUpdated = 0;
function patchIndex(indexPath: string, collectionId: string): void {
  if (!fs.existsSync(indexPath)) return;
  let index: any;
  try {
    index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch {
    console.warn(`[nutrition-index] Could not parse ${indexPath}, skipping.`);
    return;
  }
  if (!Array.isArray(index.recipes)) return;

  let touched = 0;
  for (const entry of index.recipes) {
    const summary = bySlug.get(`${collectionId}::${entry.slug}`);
    if (!summary) continue;
    entry.nutritionSummary = summary;
    touched++;
  }

  if (!DRY_RUN) {
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
  }
  indexesUpdated++;
  console.log(`[nutrition-index] ${collectionId}: tagged ${touched}/${index.recipes.length} index entries.`);
}

for (const { id, root } of COLLECTIONS) {
  patchIndex(path.join(root, "index.json"), id);
}
patchIndex("client/public/catalog/breakfast/performance/index.json", "breakfast");

console.log(`[nutrition-index] Done. ${indexesUpdated} catalog indexes updated.`);
