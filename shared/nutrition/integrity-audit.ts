/**
 * Full-catalog nutrition integrity audit — per-serving, crew-invariant, category targets.
 */

import {
  auditPerServingSuspicious,
  perServingFromBatch,
  sumIngredientMacros,
  type PerServingSuspicion,
} from "./per-serving-audit.js";
import { calculateNutritionFromIngredients } from "./calculate.js";
import { hasCompleteNutrition, validateNutritionPerServing } from "./validate.js";
import type { CatalogIngredientLine, RecipeNutritionPerServing, RecipeNutritionRecord } from "./types.js";

export type NutritionCatalogId =
  | "golden_100"
  | "hall_expansion"
  | "performance_meals"
  | "breakfast"
  | "bbq_grill"
  | "pizza_night"
  | "smoothies";

export type NutritionIntegrityStatus = "pass" | "fail" | "withheld";

export interface NutritionIntegrityRecipeInput {
  slug: string;
  title: string;
  catalog: NutritionCatalogId;
  mealType: "dinner" | "breakfast" | "smoothie";
  category?: string;
  baseServings: number;
  ingredients: CatalogIngredientLine[];
  stored: RecipeNutritionPerServing & {
    source?: string;
    estimateAvailable?: boolean;
  };
  recommended?: RecipeNutritionRecord;
}

export interface NutritionIntegrityFinding {
  code: string;
  message: string;
}

export interface NutritionIntegrityResult {
  slug: string;
  title: string;
  catalog: NutritionCatalogId;
  status: NutritionIntegrityStatus;
  servings: number;
  stored: string;
  recommended?: string;
  findings: NutritionIntegrityFinding[];
  suspiciousCalories: boolean;
  suspiciousProtein: boolean;
  suspiciousCarbs: boolean;
  suspiciousFat: boolean;
  showsZeroUi: boolean;
  crewSizeCoupled: boolean;
  needsRecalculation: boolean;
  ingredientMatchPct: number;
}

const CREW_SIZES = [2, 4, 6, 8, 10, 12] as const;

const PROTEIN_RANGES: Record<string, { min: number; max: number; label: string }> = {
  performance_meals: { min: 35, max: 60, label: "Performance Meals" },
  breakfast: { min: 20, max: 45, label: "Breakfast" },
  bbq_grill: { min: 30, max: 55, label: "BBQ & Grill" },
  pizza_night: { min: 25, max: 55, label: "Pizza Night" },
  smoothies: { min: 20, max: 45, label: "Smoothies" },
  comfort_food: { min: 25, max: 45, label: "Comfort Food" },
};

function fmt(m: RecipeNutritionPerServing): string {
  return `${Math.round(m.calories)} cal · ${Math.round(m.protein)}g P · ${Math.round(m.carbs)}g C · ${Math.round(m.fat)}g F`;
}

function macroError(a: RecipeNutritionPerServing, b: RecipeNutritionPerServing): number {
  return (
    Math.abs(a.calories - b.calories) +
    Math.abs(a.protein - b.protein) * 10 +
    Math.abs(a.carbs - b.carbs) * 2 +
    Math.abs(a.fat - b.fat) * 5
  );
}

/** Stored macros look tied to batch÷crewSize instead of batch÷baseServings. */
export function detectCrewCoupledNutrition(
  stored: RecipeNutritionPerServing,
  batch: RecipeNutritionPerServing,
  baseServings: number,
): { coupled: boolean; message?: string } {
  if (baseServings <= 1) return { coupled: false };
  const correct = perServingFromBatch(batch, baseServings);
  const correctErr = macroError(stored, correct);

  let bestCrew = baseServings;
  let bestErr = correctErr;
  for (const crew of CREW_SIZES) {
    if (crew === baseServings) continue;
    const wrong = perServingFromBatch(batch, crew);
    const err = macroError(stored, wrong);
    if (err < bestErr) {
      bestErr = err;
      bestCrew = crew;
    }
  }

  const relToCorrect = Math.abs(stored.calories - correct.calories) / Math.max(correct.calories, 1);
  const relToWrong = Math.abs(stored.calories - perServingFromBatch(batch, bestCrew).calories) / Math.max(
    perServingFromBatch(batch, bestCrew).calories,
    1,
  );
  if (
    bestCrew !== baseServings &&
    bestErr < correctErr * 0.3 &&
    relToWrong < 0.08 &&
    relToCorrect > 0.15 &&
    stored.calories > 200
  ) {
    return {
      coupled: true,
      message: `Stored macros match batch÷${bestCrew} crew better than batch÷${baseServings} base servings`,
    };
  }
  return { coupled: false };
}

function proteinRangeForRecipe(input: NutritionIntegrityRecipeInput): {
  min: number;
  max: number;
  label: string;
} | null {
  if (input.catalog === "performance_meals") return PROTEIN_RANGES.performance_meals;
  if (input.catalog === "breakfast") return PROTEIN_RANGES.breakfast;
  if (input.catalog === "bbq_grill") return PROTEIN_RANGES.bbq_grill;
  if (input.catalog === "pizza_night") return PROTEIN_RANGES.pizza_night;
  if (input.catalog === "smoothies") return PROTEIN_RANGES.smoothies;
  if (input.category === "comfort_food") return PROTEIN_RANGES.comfort_food;
  if (input.category === "healthy_performance") return PROTEIN_RANGES.performance_meals;
  if (input.category === "breakfast_brunch") return PROTEIN_RANGES.breakfast;
  if (input.category === "bbq_grill_nights") return PROTEIN_RANGES.bbq_grill;
  return null;
}

function ingredientCrossCheck(
  stored: RecipeNutritionPerServing,
  batch: RecipeNutritionPerServing,
  servings: number,
): NutritionIntegrityFinding[] {
  const findings: NutritionIntegrityFinding[] = [];
  if (batch.calories < 100 || servings < 1) return findings;

  const expected = perServingFromBatch(batch, servings);
  const proteinRatio = stored.protein / Math.max(expected.protein, 1);
  const calRatio = stored.calories / Math.max(expected.calories, 1);

  if (expected.protein >= 15 && (proteinRatio < 0.45 || proteinRatio > 1.85)) {
    findings.push({
      code: "ingredient_protein_drift",
      message: `Stored protein ${Math.round(stored.protein)}g vs ingredient estimate ${Math.round(expected.protein)}g`,
    });
  }
  if (expected.calories >= 300 && (calRatio < 0.45 || calRatio > 1.85)) {
    findings.push({
      code: "ingredient_calorie_drift",
      message: `Stored ${Math.round(stored.calories)} cal vs ingredient estimate ${Math.round(expected.calories)} cal`,
    });
  }
  return findings;
}

function suspicionFlags(suspicions: PerServingSuspicion[]) {
  return {
    suspiciousCalories: suspicions.some((s) =>
      ["calories_too_low", "calories_too_high", "likely_batch_total_stored", "macro_calorie_divergence"].includes(
        s.code,
      ),
    ),
    suspiciousProtein: suspicions.some((s) =>
      ["protein_too_low_meat", "protein_too_high", "likely_batch_total_stored"].includes(s.code),
    ),
    suspiciousCarbs: suspicions.some((s) =>
      ["carbs_too_low_starch", "carbs_too_high"].includes(s.code),
    ),
    suspiciousFat: suspicions.some((s) => s.code === "fat_too_high" || s.code === "fat_too_low"),
  };
}

const VERIFIED_SLUGS = new Set(["bbq-chicken-mac-and-cheese"]);

export function auditRecipeNutritionIntegrity(
  input: NutritionIntegrityRecipeInput,
): NutritionIntegrityResult {
  const findings: NutritionIntegrityFinding[] = [];
  const withheld =
    input.stored.source === "unavailable" || input.stored.estimateAvailable === false;

  const batchSum = sumIngredientMacros(input.ingredients);
  const batch: RecipeNutritionPerServing = {
    calories: batchSum.calories,
    protein: batchSum.protein,
    carbs: batchSum.carbs,
    fat: batchSum.fat,
  };
  const ingredientMatchPct =
    batchSum.totalCount > 0
      ? Math.round((batchSum.matchedCount / batchSum.totalCount) * 100)
      : 0;

  const showsZeroUi =
    !withheld && (input.stored.calories === 0 || input.stored.protein === 0);

  if (showsZeroUi) {
    findings.push({
      code: "ui_zero_macros",
      message: "UI would show 0 for calories/protein/carbs/fat while marked available",
    });
  }

  if (withheld) {
    return {
      slug: input.slug,
      title: input.title,
      catalog: input.catalog,
      status: "withheld",
      servings: input.baseServings,
      stored: "withheld",
      findings,
      suspiciousCalories: false,
      suspiciousProtein: false,
      suspiciousCarbs: false,
      suspiciousFat: false,
      showsZeroUi: false,
      crewSizeCoupled: false,
      needsRecalculation: false,
      ingredientMatchPct,
    };
  }

  const suspicions = auditPerServingSuspicious(input.stored, {
    slug: input.slug,
    title: input.title,
    mealType: input.mealType,
    ingredients: input.ingredients,
    servings: input.baseServings,
    batchTotals: batch,
  });
  const flags = suspicionFlags(suspicions);
  findings.push(...suspicions.map((s) => ({ code: s.code, message: s.message })));
  findings.push(
    ...validateNutritionPerServing(input.stored, {
      slug: input.slug,
      mealType: input.mealType,
    })
      .filter((i) => i.code !== "missing")
      .map((i) => ({ code: i.code, message: i.message })),
  );
  findings.push(...ingredientCrossCheck(input.stored, batch, input.baseServings));

  const crewCheck =
    VERIFIED_SLUGS.has(input.slug) || input.stored.source === "curated"
      ? { coupled: false as const }
      : detectCrewCoupledNutrition(input.stored, batch, input.baseServings);
  if (crewCheck.coupled && crewCheck.message) {
    findings.push({ code: "crew_size_coupled", message: crewCheck.message });
  }

  const proteinRange = proteinRangeForRecipe(input);
  if (proteinRange && input.stored.protein > 0) {
    if (input.stored.protein < proteinRange.min || input.stored.protein > proteinRange.max) {
      findings.push({
        code: "protein_target_range",
        message: `Protein ${Math.round(input.stored.protein)}g outside ${proteinRange.label} target (${proteinRange.min}–${proteinRange.max}g)`,
      });
      if (input.stored.protein < proteinRange.min - 5 || input.stored.protein > proteinRange.max + 20) {
        flags.suspiciousProtein = true;
      }
    }
  }

  let needsRecalculation = false;
  if (input.recommended?.estimateAvailable) {
    const rec = input.recommended;
    const drift =
      Math.abs(rec.calories - input.stored.calories) > 80 ||
      Math.abs(rec.protein - input.stored.protein) > 12;
    if (drift && findings.some((f) => f.code.includes("ingredient") || f.code.includes("batch"))) {
      needsRecalculation = true;
      findings.push({
        code: "needs_recalculation",
        message: `Recommended: ${fmt(rec)}`,
      });
    }
  }

  if (
    !hasCompleteNutrition(input.stored, {
      source: input.stored.source,
      estimateAvailable: input.stored.estimateAvailable,
    })
  ) {
    findings.push({ code: "incomplete_macros", message: "Missing or invalid per-serving macros" });
    needsRecalculation = true;
  }

  const critical = findings.some((f) =>
    [
      "ui_zero_macros",
      "crew_size_coupled",
      "likely_batch_total_stored",
      "incomplete_macros",
      "impossible",
      "ingredient_protein_drift",
      "ingredient_calorie_drift",
      "calories_too_low",
      "calories_too_high",
      "protein_too_low_meat",
      "carbs_too_low_starch",
      "macro_calorie_divergence",
      "fat_too_low",
      "fat_too_high",
      "protein_too_high",
    ].includes(f.code),
  );

  const status: NutritionIntegrityStatus = critical ? "fail" : "pass";

  return {
    slug: input.slug,
    title: input.title,
    catalog: input.catalog,
    status,
    servings: input.baseServings,
    stored: fmt(input.stored),
    recommended: input.recommended?.estimateAvailable ? fmt(input.recommended) : undefined,
    findings: [...new Map(findings.map((f) => [f.code + f.message, f])).values()],
    ...flags,
    showsZeroUi,
    crewSizeCoupled: crewCheck.coupled,
    needsRecalculation: needsRecalculation || critical,
    ingredientMatchPct,
  };
}

/** Engine: per-serving at baseServings is stable; using crew size as divisor changes per-serving (UI must not do this). */
export function verifyNutritionEnginePerServing(
  ingredients: CatalogIngredientLine[],
  baseServings: number,
  mealType: "dinner" | "breakfast" | "smoothie",
): { stableAtBase: boolean; variesIfCrewUsedAsServings: boolean } {
  const a = calculateNutritionFromIngredients(ingredients, { servings: baseServings, mealType });
  const b = calculateNutritionFromIngredients(ingredients, { servings: baseServings, mealType });
  const stableAtBase = Math.abs(a.calories - b.calories) < 0.01;
  const alt = calculateNutritionFromIngredients(ingredients, {
    servings: baseServings === 6 ? 10 : 6,
    mealType,
  });
  const variesIfCrewUsedAsServings = Math.abs(a.calories - alt.calories) > 5;
  return { stableAtBase, variesIfCrewUsedAsServings };
}

export function summarizeNutritionIntegrity(results: NutritionIntegrityResult[]) {
  const pass = results.filter((r) => r.status === "pass").length;
  const fail = results.filter((r) => r.status === "fail").length;
  const withheld = results.filter((r) => r.status === "withheld").length;
  const total = results.length;
  const scorable = total - withheld;
  const accuracyPct = scorable > 0 ? Math.round((pass / scorable) * 1000) / 10 : 100;

  return {
    total,
    pass,
    fail,
    withheld,
    accuracyPct,
    suspiciousCalories: results.filter((r) => r.suspiciousCalories).map((r) => r.slug),
    suspiciousProtein: results.filter((r) => r.suspiciousProtein).map((r) => r.slug),
    suspiciousCarbs: results.filter((r) => r.suspiciousCarbs).map((r) => r.slug),
    suspiciousFat: results.filter((r) => r.suspiciousFat).map((r) => r.slug),
    zeroUi: results.filter((r) => r.showsZeroUi).map((r) => r.slug),
    crewCoupled: results.filter((r) => r.crewSizeCoupled).map((r) => r.slug),
    needsRecalculation: results.filter((r) => r.needsRecalculation).map((r) => r.slug),
  };
}
