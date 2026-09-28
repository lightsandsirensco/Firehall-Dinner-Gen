/**
 * Nutrition Goal scoring — deterministic, no fabricated data.
 *
 * Ranks curated recipe candidates for the 8 Nutrition Goal modes using ONLY
 * signals that already exist in the catalog: the editorially-derived
 * `NutritionCategory` (shared/curated-recipe/metadata/derive.ts — itself built
 * from real macros/tags when present) and real cook-time minutes. Never
 * invents calories/macros. When a signal is missing, contributes 0 (neutral)
 * rather than penalizing the recipe — see PRODUCT spec section 4.
 */
import {
  PROFILE_NUTRITION_GOAL_OPTIONS,
  PROFILE_NUTRITION_GOAL_LABELS,
  PROFILE_NUTRITION_GOAL_MICROCOPY,
  type ProfileNutritionGoal,
} from "../auth/constants.js";
import type { NutritionCategory } from "../curated-recipe/metadata/taxonomy.js";

export type NutritionGoal = ProfileNutritionGoal;
export const NUTRITION_GOAL_OPTIONS = PROFILE_NUTRITION_GOAL_OPTIONS;
export const NUTRITION_GOAL_LABELS = PROFILE_NUTRITION_GOAL_LABELS;
export const NUTRITION_GOAL_MICROCOPY = PROFILE_NUTRITION_GOAL_MICROCOPY;

/** Compact chip set for the generator (spec section 5) — "No preference" is the implicit default. */
export const NUTRITION_GOAL_QUICK_PICKS: NutritionGoal[] = [
  "balanced",
  "high_protein",
  "lighter",
  "high_carb",
  "high_fiber",
  "quick_healthy",
];

/**
 * Which existing NutritionCategory values earn a bonus for each goal.
 * Deliberately conservative — never claims a health/medical benefit, only
 * reuses categories the catalog already assigns from real recipe data.
 */
const CATEGORY_MATCH: Record<NutritionGoal, readonly NutritionCategory[]> = {
  no_preference: [],
  balanced: ["balanced", "high_protein"],
  high_protein: ["high_protein"],
  lighter: ["lighter", "vegetarian_friendly"],
  // "Training day" wants ample carbs + adequate protein — hearty/balanced
  // categories fit better than salad-leaning "lighter" or occasion "indulgent".
  high_carb: ["balanced", "comfort", "high_protein"],
  // No fibre-gram data exists anywhere in the catalog (see shared/nutrition/types.ts) —
  // "lighter"/"vegetarian_friendly" are the closest real, already-derived proxies
  // (derive.ts maps salad/grilled/lean + high_fiber tags into "lighter").
  high_fiber: ["lighter", "vegetarian_friendly"],
  // General "stronger overall nutritional characteristics" per spec — explicitly
  // avoids any "heart healthy" claim; just deprioritizes comfort/indulgent.
  heart_conscious: ["balanced", "lighter", "high_protein"],
  quick_healthy: ["lighter", "balanced", "high_protein"],
};

const CATEGORY_BONUS = 15;
/** Smaller than the primary healthiness-category bonus in generator-match.ts (25) —
 * this is a secondary refinement pass, not a replacement for it. */
const QUICK_HEALTHY_TIME_BONUS_MAX = 12;

export interface NutritionGoalScoreInput {
  nutritionCategory?: NutritionCategory | null;
  /** Real cook+prep minutes when known; omit/0 when unknown (never estimated here). */
  totalMinutes?: number | null;
}

/** Deterministic soft-scoring bonus — additive, never negative (no penalty for missing data). */
export function scoreNutritionGoal(
  goal: NutritionGoal | null | undefined,
  input: NutritionGoalScoreInput,
): number {
  const resolvedGoal = goal ?? "no_preference";
  if (resolvedGoal === "no_preference") return 0;

  let score = 0;
  const category = input.nutritionCategory;
  if (category && CATEGORY_MATCH[resolvedGoal].includes(category)) {
    score += CATEGORY_BONUS;
  }

  if (resolvedGoal === "quick_healthy" && input.totalMinutes && input.totalMinutes > 0) {
    // Shorter real cook time earns more, capped — never fabricates a time when unknown.
    if (input.totalMinutes <= 20) score += QUICK_HEALTHY_TIME_BONUS_MAX;
    else if (input.totalMinutes <= 30) score += 8;
    else if (input.totalMinutes <= 40) score += 4;
  }

  return score;
}

/**
 * Backward-compat bridge to the existing 3-way `healthiness_preference` field
 * (still required by GenerateRequest + relaxation-message copy + the primary
 * scoreHealthinessPreference bonus). Lets the new 8-mode selector drive the
 * generator WITHOUT rebuilding any of that existing machinery.
 */
export interface NutritionResultFacts {
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  totalMinutes?: number | null;
}

function realPositive(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function genericMacroFallback(cal: number | null, protein: number | null): string | null {
  if (cal && protein) return `${cal} cal \u2022 ${protein}g protein`;
  if (cal) return `${cal} cal per serving`;
  if (protein) return `${protein}g protein per serving`;
  return null;
}

/**
 * Result-card "why this fits" line — one short, honest sentence built ONLY
 * from real per-serving macros/cook-time already on the served recipe.
 * Returns null when there isn't enough real data to say anything meaningful —
 * never invents a number, and never claims a fibre/sodium measurement the
 * catalog doesn't have (Plant Forward / Well Rounded fall back to whatever
 * real calories/protein exist, same as every other mode without a clean
 * single-metric story).
 */
export function explainNutritionGoalFit(
  goal: NutritionGoal | null | undefined,
  facts: NutritionResultFacts,
): string | null {
  const resolvedGoal = goal ?? "no_preference";
  const cal = realPositive(facts.calories);
  const protein = realPositive(facts.protein_g);
  const carbs = realPositive(facts.carbs_g);
  const minutes = realPositive(facts.totalMinutes);

  switch (resolvedGoal) {
    case "no_preference":
      return null;
    case "high_protein":
      return protein ? `${protein}g protein per serving` : genericMacroFallback(cal, protein);
    case "lighter":
      return cal
        ? `${cal} cal per serving${protein ? ` \u2022 ${protein}g protein` : ""}`
        : genericMacroFallback(cal, protein);
    case "high_carb":
      return carbs
        ? `${carbs}g carbs per serving${protein ? ` \u2022 ${protein}g protein` : ""}`
        : genericMacroFallback(cal, protein);
    case "quick_healthy":
      return minutes ? `${minutes} min \u2022 balanced nutrition profile` : genericMacroFallback(cal, protein);
    // balanced / high_fiber ("Plant Forward") / heart_conscious ("Well Rounded") —
    // no direct metric to point to, so fall back to whatever real macros exist.
    default:
      return genericMacroFallback(cal, protein);
  }
}

export function nutritionGoalToHealthiness(
  goal: NutritionGoal,
): "lean" | "balanced" | "comfort" {
  switch (goal) {
    case "lighter":
    case "high_fiber":
    case "heart_conscious":
    case "quick_healthy":
      return "lean";
    case "no_preference":
    case "balanced":
    case "high_protein":
    case "high_carb":
    default:
      return "balanced";
  }
}
