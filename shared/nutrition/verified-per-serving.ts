/**
 * Crew-verified per-serving nutrition when ingredient DB sums overstate combo meals
 * (e.g. raw protein weight + full cheese + dry pasta + sauce all counted at once).
 *
 * Values are per single firefighter at baseServings = 8.
 */

import type { RecipeNutritionRecord } from "./types.js";

/** USDA-based per-serving at 6 oz cooked BBQ chicken + ~1.5 cups mac and cheese. */
const VERIFIED_PER_SERVING: Record<
  string,
  { calories: number; protein: number; carbs: number; fat: number }
> = {
  "bbq-chicken-mac-and-cheese": {
    calories: 820,
    protein: 54,
    carbs: 62,
    fat: 30,
  },
};

export function getVerifiedPerServingNutrition(
  slug: string,
  servings: number,
  mealPrepFriendly = false,
): RecipeNutritionRecord | null {
  const macros = VERIFIED_PER_SERVING[slug];
  if (!macros) return null;

  const perServing = { ...macros };
  return {
    ...perServing,
    servings: Math.max(1, Math.round(servings)),
    source: "calculated",
    estimateAvailable: true,
    matchedIngredientCount: 0,
    totalIngredientCount: 0,
    filterFlags: {
      highProtein: perServing.protein >= 35,
      under700Calories: perServing.calories < 700,
      under30gFat: perServing.fat < 30,
      highCarb: perServing.carbs >= 50,
      lowCarb: perServing.carbs <= 25,
      mealPrepFriendly,
    },
    badgeCandidates: {
      highProtein: perServing.protein >= 35,
      lighterOption: perServing.calories <= 550 && perServing.fat <= 20,
      performanceMeal: false,
    },
  };
}
