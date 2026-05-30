import { findIngredientProfile } from "./ingredient-database.js";
import { gramsFromAmount, parseCatalogIngredientAmount } from "./parse-ingredient.js";
import type {
  CatalogIngredientLine,
  NutritionBadgeCandidates,
  NutritionFilterFlags,
  RecipeNutritionPerServing,
  RecipeNutritionRecord,
} from "./types.js";

export interface CalculateNutritionOptions {
  servings: number;
  mealType?: "dinner" | "breakfast" | "smoothie";
  mealPrepFriendly?: boolean;
  existing?: Partial<RecipeNutritionPerServing>;
}

function deriveFilterFlags(
  macros: RecipeNutritionPerServing,
  mealPrepFriendly: boolean,
): NutritionFilterFlags {
  return {
    highProtein: macros.protein >= 35,
    under700Calories: macros.calories < 700,
    under30gFat: macros.fat < 30,
    highCarb: macros.carbs >= 50,
    lowCarb: macros.carbs <= 25,
    mealPrepFriendly,
  };
}

function deriveBadgeCandidates(
  macros: RecipeNutritionPerServing,
  mealType?: "dinner" | "breakfast" | "smoothie",
): NutritionBadgeCandidates {
  const performanceMeal =
    mealType === "smoothie" ||
    (macros.protein >= 30 && macros.calories <= 650 && macros.fat <= 25);
  return {
    highProtein: macros.protein >= 35,
    lighterOption: macros.calories <= 550 && macros.fat <= 20,
    performanceMeal,
  };
}

function roundMacros(m: RecipeNutritionPerServing): RecipeNutritionPerServing {
  return {
    calories: Math.round(m.calories),
    protein: Math.round(m.protein),
    carbs: Math.round(m.carbs),
    fat: Math.round(m.fat),
  };
}

function clampPerServing(
  macros: RecipeNutritionPerServing,
  mealType?: "dinner" | "breakfast" | "smoothie",
): RecipeNutritionPerServing {
  const maxCal = mealType === "smoothie" ? 900 : mealType === "breakfast" ? 1100 : 1400;
  return {
    calories: Math.min(maxCal, Math.max(80, macros.calories)),
    protein: Math.min(120, Math.max(0, macros.protein)),
    carbs: Math.min(180, Math.max(0, macros.carbs)),
    fat: Math.min(90, Math.max(0, macros.fat)),
  };
}

/** Sum ingredient macros and divide by servings. */
export function calculateNutritionFromIngredients(
  ingredients: CatalogIngredientLine[],
  options: CalculateNutritionOptions,
): RecipeNutritionRecord {
  const servings = Math.max(1, Math.round(options.servings));
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
    const grams = gramsFromAmount(parsed.quantity, parsed.unit, profile.unitGrams);
    if (!grams || grams <= 0) continue;

    const factor = grams / 100;
    totalCal += profile.calories * factor;
    totalProtein += profile.protein * factor;
    totalCarbs += profile.carbs * factor;
    totalFat += profile.fat * factor;
    matched += 1;
  }

  let perServing: RecipeNutritionPerServing;
  let source: RecipeNutritionRecord["source"] = "calculated";

  if (matched >= Math.max(2, Math.ceil(total * 0.35))) {
    perServing = {
      calories: totalCal / servings,
      protein: totalProtein / servings,
      carbs: totalCarbs / servings,
      fat: totalFat / servings,
    };
  } else if (options.existing?.calories) {
    perServing = {
      calories: options.existing.calories,
      protein: options.existing.protein ?? 0,
      carbs: options.existing.carbs ?? 0,
      fat: options.existing.fat ?? 0,
    };
    source = "curated";
  } else {
    perServing = { calories: 520, protein: 32, carbs: 48, fat: 22 };
    source = "estimated";
  }

  perServing = clampPerServing(roundMacros(perServing), options.mealType);

  return {
    ...perServing,
    servings,
    source,
    matchedIngredientCount: matched,
    totalIngredientCount: total,
    filterFlags: deriveFilterFlags(perServing, options.mealPrepFriendly ?? false),
    badgeCandidates: deriveBadgeCandidates(perServing, options.mealType),
  };
}

export function toGoldenNutritionBlock(record: RecipeNutritionRecord) {
  return {
    calories: record.calories,
    protein: record.protein,
    carbs: record.carbs,
    fats: record.fat,
    label: "per serving (hall portion)",
    filterFlags: record.filterFlags,
    badgeCandidates: record.badgeCandidates,
    source: record.source,
  };
}

export function toMacrosPerServing(record: RecipeNutritionRecord) {
  return {
    calories: record.calories,
    protein_g: record.protein,
    carbs_g: record.carbs,
    fat_g: record.fat,
  };
}
