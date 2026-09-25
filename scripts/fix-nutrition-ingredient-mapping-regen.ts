#!/usr/bin/env tsx
/**
 * FIREHALL MEALS — NUTRITION DIVISOR / SCALING CORRECTION (part 2)
 *
 * Regenerates the STATIC stored per-serving nutrition for the exact set of
 * recipes affected by the three ingredient-database/engine fixes made in
 * this pass:
 *   1. shared/nutrition/parse-ingredient.ts — "count" unit now falls back to
 *      a profile's `slice` gram weight before the generic 100g guess.
 *   2. shared/nutrition/ingredient-database.ts — added `slice: 28` to the
 *      generic cheddar/mozzarella/swiss/parmesan/monterey-jack profile.
 *   3. shared/nutrition/ingredient-database.ts — added a dedicated
 *      cooked/steamed/fried rice profile (was matching the ~3x denser
 *      uncooked-rice profile).
 *
 * baseServings/crewSize are NOT changed here — only the stored macros are
 * regenerated from the (unchanged) ingredient list using the corrected
 * engine, at each recipe's existing serving count.
 */
import fs from "node:fs";
import path from "node:path";
import {
  calculateNutritionFromIngredients,
  catalogIngredientsFromUnknown,
} from "../shared/nutrition/index.js";
import { getVerifiedPerServingNutrition } from "../shared/nutrition/verified-per-serving.js";
import { getRecipeBaseServings } from "../shared/recipe/crew-scaling-config.js";
import { defaultRecipeServings } from "../shared/nutrition/servings.js";
import type { RecipeNutritionRecord } from "../shared/nutrition/types.js";

const ROOT = process.cwd();

const CATALOGS: Array<{ id: string; dir: string; mealType: "dinner" | "breakfast" | "smoothie" }> = [
  { id: "golden_100", dir: "client/public/catalog/golden-100/pages", mealType: "dinner" },
  { id: "hall_expansion", dir: "client/public/catalog/hall-expansion/pages", mealType: "dinner" },
  { id: "performance_meals", dir: "client/public/catalog/performance-meals/pages", mealType: "dinner" },
  { id: "breakfast", dir: "client/public/catalog/breakfast/pages", mealType: "breakfast" },
  { id: "bbq_grill", dir: "client/public/catalog/bbq/pages", mealType: "dinner" },
  { id: "pizza_night", dir: "client/public/catalog/pizza-night/pages", mealType: "dinner" },
];

const SLUGS = [
  "beef-dip",
  "chicken-parm",
  "fast-philly-skillet",
  "meatball-hoagies",
  "parm-hero-subs",
  "philly-cheesesteak-skillet",
  "philly-egg-rolls",
  "slider-bar",
  "smash-burgers",
  "steak-sandwiches",
  "eggs-benedict-hall-style",
  "philly-cheesesteak-pizza",
  "classic-patty-melt-for-the-crew",
  "monte-cristo-sandwiches",
  "sheet-pan-breakfast-sandwiches",
  "grilled-reuben-sandwiches-crew",
  "pressed-cuban-sandwiches-crew",
  "firehall-hibachi-mixed-grill-crew",
  "costco-rotisserie-remix",
  "stuffed-peppers",
  // Pure staleness (stored macros predate the recipe's current ingredient
  // list / a since-added curated verified-per-serving override; unrelated to
  // baseServings, discovered via a full-catalog stored-vs-calculated scan).
  "bbq-chicken-mac-and-cheese",
  "breakfast-sliders",
  "bbq-chicken-pizza",
  "buffalo-chicken-pizza",
  "four-cheese-white-pizza",
  "hawaiian-pizza",
  "pesto-chicken-pizza",
  "veggie-supreme-pizza",
];

// slug -> forced catalog id, for slugs that collide across catalogs
// (golden_100 and pizza_night both have a "bbq-chicken-pizza").
const CATALOG_OVERRIDE: Record<string, string> = {
  "bbq-chicken-pizza": "pizza_night",
};

function findFile(slug: string): { file: string; catalog: string; mealType: "dinner" | "breakfast" | "smoothie" } | null {
  const forced = CATALOG_OVERRIDE[slug];
  const candidates = forced ? CATALOGS.filter((c) => c.id === forced) : CATALOGS;
  for (const c of candidates) {
    const p = path.join(ROOT, c.dir, `${slug}.json`);
    if (fs.existsSync(p)) return { file: p, catalog: c.id, mealType: c.mealType };
  }
  return null;
}

function applyNutrition(
  page: Record<string, unknown>,
  catalog: string,
  mealType: "dinner" | "breakfast" | "smoothie",
  record: RecipeNutritionRecord,
): Record<string, unknown> {
  const next = { ...page };
  const available = record.estimateAvailable !== false && record.source !== "unavailable";
  const block: Record<string, unknown> = {
    calories: available ? record.calories : 0,
    protein: available ? record.protein : 0,
    carbs: available ? record.carbs : 0,
    ...(mealType === "breakfast" ? { fat: available ? record.fat : 0 } : { fats: available ? record.fat : 0 }),
    label: "Estimated per serving",
    source: record.source,
    estimateAvailable: available,
    filterFlags: record.filterFlags,
    badgeCandidates: record.badgeCandidates,
  };
  if (mealType === "breakfast") {
    next.nutrition = block;
  } else {
    next.calories = available ? record.calories : 0;
    next.protein = available ? record.protein : 0;
    next.carbs = available ? record.carbs : 0;
    next.fats = available ? record.fat : 0;
    next.nutrition = block;
  }
  return next;
}

let changed = 0;
for (const slug of SLUGS) {
  const found = findFile(slug);
  if (!found) {
    console.error(`MISSING: ${slug}`);
    continue;
  }
  const { file, catalog, mealType } = found;
  const page = JSON.parse(fs.readFileSync(file, "utf8"));
  const baseServings =
    getRecipeBaseServings({
      baseServings: Number(page.baseServings) || undefined,
      crewSize: Number(page.crewSize) || undefined,
    }) || defaultRecipeServings(page, mealType);

  const ingredients = catalogIngredientsFromUnknown(page.ingredients);
  const mealPrepFriendly = Boolean(
    page.mealPrepNotes || (Array.isArray(page.tags) && page.tags.includes("make-ahead")),
  );
  const record =
    getVerifiedPerServingNutrition(slug, baseServings, mealPrepFriendly) ??
    calculateNutritionFromIngredients(ingredients, {
      servings: baseServings,
      mealType,
      mealPrepFriendly,
    });

  const nutrition = (page.nutrition as Record<string, unknown>) || {};
  const before = {
    calories: Number(nutrition.calories ?? page.calories ?? 0),
    protein: Number(nutrition.protein ?? page.protein ?? 0),
    carbs: Number(nutrition.carbs ?? page.carbs ?? 0),
    fat: Number(nutrition.fats ?? nutrition.fat ?? page.fats ?? 0),
  };

  if (
    before.calories === record.calories &&
    before.protein === record.protein &&
    before.carbs === record.carbs &&
    before.fat === record.fat
  ) {
    console.log(`${slug}: unchanged (cal=${record.calories})`);
    continue;
  }

  console.log(
    `${slug} (baseServings=${baseServings}): cal ${before.calories}->${record.calories} P ${before.protein}->${record.protein} C ${before.carbs}->${record.carbs} F ${before.fat}->${record.fat}`,
  );
  const nextPage = applyNutrition(page, catalog, mealType, record);
  fs.writeFileSync(file, `${JSON.stringify(nextPage, null, 2)}\n`, "utf8");
  changed += 1;
}

console.log(`\nDone. ${changed}/${SLUGS.length} recipes regenerated.`);
