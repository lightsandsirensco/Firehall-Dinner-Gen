import type { RecipeCorrection } from "../types.js";
import { field } from "./helpers.js";

type Macros = { calories: number; protein: number; fats: number };

/** Recalculated with the vegetable-broth profile (USDA FDC 171583) after the chicken → vegetable broth swap. */
const RECALCULATED: Array<[string, Macros, Macros]> = [
  ["30-minute-pasta-e-fagioli-for-the-hall", { calories: 583, protein: 26, fats: 18 }, { calories: 559, protein: 23, fats: 17 }],
  ["pasta-e-ceci-for-the-hall", { calories: 511, protein: 23, fats: 20 }, { calories: 499, protein: 21, fats: 20 }],
  ["spicy-tomato-bisque-grilled-brie-toast", { calories: 625, protein: 16, fats: 31 }, { calories: 610, protein: 15, fats: 30 }],
  ["tomato-soup-grilled-cheese-croutons", { calories: 998, protein: 38, fats: 62 }, { calories: 980, protein: 36, fats: 61 }],
];

export const B8_BROTH_NUTRITION: RecipeCorrection[] = RECALCULATED.map(([slug, before, after]) => ({
  slug,
  collection: "golden-100",
  batch: "B8-broth-nutrition-01",
  category: "nutrition",
  findings: ["nutrition_stale_after_ingredient_change"],
  summary: `Nutrition recalculated for vegetable broth: ${before.calories} → ${after.calories} kcal, ${before.protein} → ${after.protein} g protein per serving`,
  rationale:
    "The broth was switched from chicken to vegetable to keep the dish vegetarian. Vegetable broth has less protein and fat than chicken broth, so the per-serving values were recalculated from the ingredients instead of carried over.",
  reference: "USDA FoodData Central 171583 (vegetable broth) vs 174536 (chicken broth)",
  ops: macroOps(before, after),
}));

/** Already used vegetable broth, but were calculated with the generic (meat) broth profile. */
const MISCALCULATED: Array<[string, Macros & { carbs: number }, Macros & { carbs: number }]> = [
  ["lentil-mushroom-bolognese", { calories: 616, protein: 26, carbs: 112, fats: 8 }, { calories: 610, protein: 25, carbs: 112, fats: 8 }],
  ["smoky-lentil-kale-soup", { calories: 304, protein: 18, carbs: 43, fats: 8 }, { calories: 274, protein: 15, carbs: 42, fats: 7 }],
  ["white-bean-kale-soup", { calories: 325, protein: 19, carbs: 40, fats: 11 }, { calories: 301, protein: 16, carbs: 40, fats: 10 }],
];

export const B8_BROTH_NUTRITION_02: RecipeCorrection[] = MISCALCULATED.map(([slug, before, after]) => ({
  slug,
  collection: "performance-meals",
  batch: "B8-broth-nutrition-02",
  category: "nutrition",
  findings: ["nutrition_ingredient_profile_mismatch"],
  summary: `Nutrition recalculated with the vegetable-broth profile: ${before.calories} → ${after.calories} kcal, ${before.protein} → ${after.protein} g protein per serving`,
  rationale:
    "The recipe uses vegetable broth, but its nutrition was calculated with the database's single generic broth entry, which reflects meat broth and overstated protein and fat.",
  reference: "USDA FoodData Central 171583 (vegetable broth)",
  ops: macroOps(before, after),
}));

function macroOps(before: Partial<Record<"calories" | "protein" | "carbs" | "fats", number>>, after: typeof before) {
  return (["calories", "protein", "carbs", "fats"] as const).flatMap((k) =>
    before[k] === undefined || before[k] === after[k] ? [] : [field(`nutrition.${k}`, before[k], after[k]), field(k, before[k], after[k])],
  );
}
