import type { CatalogIngredientLine, RecipeNutritionPerServing } from "./types.js";
import { findIngredientProfile } from "./ingredient-database.js";
import { gramsFromAmount, parseCatalogIngredientAmount } from "./parse-ingredient.js";

export type PerServingSuspicionCode =
  | "calories_too_low"
  | "calories_too_high"
  | "protein_too_low_meat"
  | "protein_too_high"
  | "fat_too_low"
  | "fat_too_high"
  | "carbs_too_low_starch"
  | "carbs_too_high"
  | "likely_batch_total_stored"
  | "macro_calorie_divergence";

export interface PerServingSuspicion {
  code: PerServingSuspicionCode;
  message: string;
}

const MEAT_RE =
  /\b(beef|chicken|pork|turkey|steak|brisket|ribs|lamb|bacon|sausage|ham|meatloaf|burger|fish|salmon|shrimp|cod|tuna)\b/i;
const STARCH_RE =
  /\b(rice|pasta|noodle|potato|potatoes|bread|bun|buns|tortilla|barley|quinoa|macaroni|ziti|lasagna|noodles|oats|oatmeal|biscuit|bagel|waffle|pancake)\b/i;

/** Sum recipe macros from ingredients (full batch, not divided). */
export function sumIngredientMacros(ingredients: CatalogIngredientLine[]): RecipeNutritionPerServing & {
  matchedCount: number;
  totalCount: number;
} {
  let totalCal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let matched = 0;
  const total = ingredients.filter((i) => !i.optional).length || ingredients.length;

  for (const ing of ingredients) {
    if (ing.optional) continue;
    const profile = findIngredientProfile(ing.name);
    if (!profile) continue;
    if (profile.calories === 0 && profile.protein === 0 && profile.carbs === 0 && profile.fat === 0) {
      matched += 1;
      continue;
    }
    const parsed = parseCatalogIngredientAmount(ing);
    const weightHintText = [ing.notes, ing.name].filter(Boolean).join(" ");
    const grams = gramsFromAmount(parsed.quantity, parsed.unit, profile.unitGrams, weightHintText);
    if (!grams || grams <= 0) continue;
    const factor = grams / 100;
    totalCal += profile.calories * factor;
    totalProtein += profile.protein * factor;
    totalCarbs += profile.carbs * factor;
    totalFat += profile.fat * factor;
    matched += 1;
  }

  return {
    calories: totalCal,
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
    matchedCount: matched,
    totalCount: total,
  };
}

export function perServingFromBatch(
  batch: RecipeNutritionPerServing,
  servings: number,
): RecipeNutritionPerServing {
  const s = Math.max(1, Math.round(servings));
  return {
    calories: batch.calories / s,
    protein: batch.protein / s,
    carbs: batch.carbs / s,
    fat: batch.fat / s,
  };
}

/** Stored macros look like batch totals (forgot to divide by servings). */
export function looksLikeBatchTotalStored(
  stored: RecipeNutritionPerServing,
  batch: RecipeNutritionPerServing,
  perServing: RecipeNutritionPerServing,
  servings: number,
): boolean {
  if (servings <= 1) return false;
  const batchErr =
    Math.abs(stored.calories - batch.calories) +
    Math.abs(stored.protein - batch.protein);
  const perErr =
    Math.abs(stored.calories - perServing.calories) +
    Math.abs(stored.protein - perServing.protein);
  if (batch.calories < perServing.calories * 1.4) return false;
  return batchErr < perErr * 0.35 && stored.calories > 400;
}

export function auditPerServingSuspicious(
  macros: RecipeNutritionPerServing,
  context: {
    slug?: string;
    title?: string;
    mealType?: "dinner" | "breakfast" | "smoothie";
    ingredients?: CatalogIngredientLine[];
    servings?: number;
    batchTotals?: RecipeNutritionPerServing;
  },
): PerServingSuspicion[] {
  const issues: PerServingSuspicion[] = [];
  const { calories, protein, carbs, fat } = macros;
  const mealType = context.mealType ?? "dinner";
  const title = context.title ?? "";
  const ingredientBlob = (context.ingredients ?? [])
    .map((i) => i.name)
    .join(" ")
    .toLowerCase();
  const hasMeat = MEAT_RE.test(title) || MEAT_RE.test(ingredientBlob);
  const hasStarch = STARCH_RE.test(title) || STARCH_RE.test(ingredientBlob);

  if (mealType !== "smoothie") {
    if (calories > 0 && calories < 250) {
      issues.push({
        code: "calories_too_low",
        message: `Calories under 250 for full meal (${calories})`,
      });
    }
    if (calories > 1500) {
      issues.push({
        code: "calories_too_high",
        message: `Calories over 1,500 per serving (${calories})`,
      });
    } else if (calories > 900) {
      issues.push({
        code: "calories_too_high",
        message: `Calories over 900 per serving (${calories}) — verify crew portions`,
      });
    }
  }

  if (hasMeat && protein < 10) {
    issues.push({
      code: "protein_too_low_meat",
      message: `Protein under 10g for meat-based meal (${protein}g)`,
    });
  }

  if (protein > 95) {
    issues.push({
      code: "protein_too_high",
      message: `Protein over 95g per serving (${protein}g) — verify portion`,
    });
  }

  const BACON_EGG_RE = /\b(bacon|sausage|egg|breakfast)\b/i;
  if (
    mealType === "breakfast" &&
    BACON_EGG_RE.test(title) &&
    fat > 0 &&
    fat < 12 &&
    calories > 350
  ) {
    issues.push({
      code: "fat_too_low",
      message: `Fat under 12g for bacon/egg breakfast (${fat}g)`,
    });
  }

  if (fat > 100) {
    issues.push({
      code: "fat_too_high",
      message: `Fat over 100g per serving (${fat}g) — verify portion`,
    });
  }

  if (hasStarch && carbs < 5 && context.batchTotals && context.servings) {
    const expectedCarbs = perServingFromBatch(context.batchTotals, context.servings).carbs;
    if (expectedCarbs >= 15) {
      issues.push({
        code: "carbs_too_low_starch",
        message: `Carbs under 5g but recipe includes rice/pasta/potatoes/bread (${carbs}g; ingredient est. ~${Math.round(expectedCarbs)}g)`,
      });
    }
  }

  if (carbs > 200) {
    issues.push({
      code: "carbs_too_high",
      message: `Carbs over 200g per serving (${carbs}g) — verify portion`,
    });
  }

  const macroCal = protein * 4 + carbs * 4 + fat * 9;
  const ratio = macroCal / Math.max(calories, 1);
  if (calories > 0 && (ratio < 0.5 || ratio > 1.5)) {
    issues.push({
      code: "macro_calorie_divergence",
      message: `Macro sum (${Math.round(macroCal)} cal) diverges from label (${calories})`,
    });
  }

  if (context.batchTotals && context.servings && context.servings > 1) {
    const per = perServingFromBatch(context.batchTotals, context.servings);
    if (looksLikeBatchTotalStored(macros, context.batchTotals, per, context.servings)) {
      issues.push({
        code: "likely_batch_total_stored",
        message: `Stored values match batch total (~${Math.round(context.batchTotals.calories)} cal) not per serving (~${Math.round(per.calories)})`,
      });
    }
  }

  return issues;
}
