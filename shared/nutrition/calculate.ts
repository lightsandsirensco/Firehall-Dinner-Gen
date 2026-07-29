import { findIngredientProfile } from "./ingredient-database.js";
import { extractLeadingUnitFromName, gramsFromAmount, parseCatalogIngredientAmount } from "./parse-ingredient.js";
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

/**
 * Caps absurd single-serving totals while keeping calories mathematically consistent with
 * the macros (calories ≈ protein*4 + carbs*4 + fat*9). Clamping each field independently
 * (the previous behavior) breaks that identity whenever one macro hits its ceiling before
 * the others — e.g. a huge multi-protein breakfast platter had calories clamped from ~1800
 * down to 1100 while protein/carbs were left alone, producing a label that no longer matched
 * its own macros. A single uniform scale factor (the tightest of the four ceilings) preserves
 * the ratio between all four numbers. Also drops the old hard 80-calorie floor, which was
 * silently masking real ingredient-matching failures (near-zero results) instead of letting
 * the "suspicious"/"impossible" sanity checks in validate.ts surface them for a real fix.
 */
function clampPerServing(
  macros: RecipeNutritionPerServing,
  mealType?: "dinner" | "breakfast" | "smoothie",
): RecipeNutritionPerServing {
  const maxCal = mealType === "smoothie" ? 900 : mealType === "breakfast" ? 1100 : 1400;
  const maxProtein = 120;
  const maxCarbs = 180;
  const maxFat = 90;

  const nonNegative = {
    calories: Math.max(0, macros.calories),
    protein: Math.max(0, macros.protein),
    carbs: Math.max(0, macros.carbs),
    fat: Math.max(0, macros.fat),
  };

  const scale = Math.min(
    1,
    nonNegative.calories > 0 ? maxCal / nonNegative.calories : 1,
    nonNegative.protein > maxProtein ? maxProtein / nonNegative.protein : 1,
    nonNegative.carbs > maxCarbs ? maxCarbs / nonNegative.carbs : 1,
    nonNegative.fat > maxFat ? maxFat / nonNegative.fat : 1,
  );

  return {
    calories: nonNegative.calories * scale,
    protein: nonNegative.protein * scale,
    carbs: nonNegative.carbs * scale,
    fat: nonNegative.fat * scale,
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

    // Recover a unit hidden as a leading word in the name (e.g. "tbsp tomato paste") so both
    // the ingredient lookup and the gram conversion see the clean ingredient name + real unit.
    const nameUnit = ing.unit?.trim() ? null : extractLeadingUnitFromName(ing.name);
    const lookupName = nameUnit?.unit ? nameUnit.cleanedName : ing.name;

    const profile = findIngredientProfile(lookupName);
    if (!profile) continue;
    if (profile.calories === 0 && profile.protein === 0 && profile.carbs === 0 && profile.fat === 0) {
      matched += 1;
      continue;
    }

    const parsed = parseCatalogIngredientAmount(ing);
    const effectiveUnit = parsed.unit || nameUnit?.unit || "";
    // Weight hints ("about 3 lb per rack") sometimes live in the ingredient name
    // itself (e.g. parenthetical) rather than a separate notes field.
    const weightHintText = [ing.notes, ing.name].filter(Boolean).join(" ");
    const grams = gramsFromAmount(parsed.quantity, effectiveUnit, profile.unitGrams, weightHintText);
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
  } else if (
    options.existing?.calories &&
    options.existing.calories > 0 &&
    (options.existing.protein ?? 0) > 0
  ) {
    perServing = {
      calories: options.existing.calories,
      protein: options.existing.protein ?? 0,
      carbs: options.existing.carbs ?? 0,
      fat: options.existing.fat ?? 0,
    };
    source = "curated";
  } else {
    perServing = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    source = "unavailable";
  }

  let estimateAvailable = source !== "unavailable";

  if (estimateAvailable) {
    perServing = roundMacros(clampPerServing(roundMacros(perServing), options.mealType));
    const weakMatch = matched < Math.max(3, Math.ceil(total * 0.5));
    if (
      source === "calculated" &&
      weakMatch &&
      options.mealType !== "smoothie" &&
      perServing.calories < 250
    ) {
      estimateAvailable = false;
      source = "unavailable";
      perServing = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
  }

  return {
    ...perServing,
    servings,
    source,
    estimateAvailable,
    matchedIngredientCount: matched,
    totalIngredientCount: total,
    filterFlags: estimateAvailable
      ? deriveFilterFlags(perServing, options.mealPrepFriendly ?? false)
      : {
          highProtein: false,
          under700Calories: false,
          under30gFat: false,
          highCarb: false,
          lowCarb: false,
          mealPrepFriendly: options.mealPrepFriendly ?? false,
        },
    badgeCandidates: estimateAvailable
      ? deriveBadgeCandidates(perServing, options.mealType)
      : { highProtein: false, lighterOption: false, performanceMeal: false },
  };
}

/**
 * Sums the total batch weight (grams, not per-serving) of all matched non-optional
 * ingredients. Used by the "meal over 700g of ingredients reporting under 250 calories"
 * global sanity rule — a large, heavy recipe reporting tiny calories is a strong signal
 * that a major ingredient failed to match the nutrition database.
 */
export function sumIngredientGramsBatch(ingredients: CatalogIngredientLine[]): number {
  let totalGrams = 0;
  for (const ing of ingredients) {
    if (ing.optional) continue;
    const nameUnit = ing.unit?.trim() ? null : extractLeadingUnitFromName(ing.name);
    const lookupName = nameUnit?.unit ? nameUnit.cleanedName : ing.name;
    const profile = findIngredientProfile(lookupName);
    if (!profile) continue;
    const parsed = parseCatalogIngredientAmount(ing);
    const effectiveUnit = parsed.unit || nameUnit?.unit || "";
    const weightHintText = [ing.notes, ing.name].filter(Boolean).join(" ");
    const grams = gramsFromAmount(parsed.quantity, effectiveUnit, profile.unitGrams, weightHintText);
    if (grams && grams > 0) totalGrams += grams;
  }
  return totalGrams;
}

export function toGoldenNutritionBlock(record: RecipeNutritionRecord) {
  return {
    calories: record.calories,
    protein: record.protein,
    carbs: record.carbs,
    fats: record.fat,
    label: "Estimated per serving",
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
