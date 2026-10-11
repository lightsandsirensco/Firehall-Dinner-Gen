/**
 * Firehall Meals Pro — saved "Nutrition Goal" (single-select profile setting).
 *
 * A persistent account preference that softly re-ranks Pick Tonight and Shift
 * Planner auto-fill for an entitled user. It is a weighted nudge applied AFTER
 * hard filters (allergies, dietary restrictions, Foods to Avoid, appliances,
 * protein) have already decided pool membership — a goal can reorder
 * candidates but can never admit an excluded recipe or empty the pool.
 *
 * Scores use only real per-serving macros already on the recipe (0 = unknown,
 * never estimated). The flag/category fallback below is for callers with
 * verified flags; the app's gate (server/generation/nutrition-goals-gate.ts)
 * supplies integrity-verified macros only, so unverified recipes score 0.
 * Not macro tracking and not medical advice — ranking preference only.
 *
 * Stored as a 0-or-1 element JSON array (`user_preferences.nutrition_goals_json`)
 * so older multi-select rows read back as their first launch goal.
 */
import type { NutritionCategory } from "../curated-recipe/metadata/taxonomy.js";

export const PROFILE_NUTRITION_GOALS = ["high_protein", "lower_calorie", "lower_carb", "balanced"] as const;

export type ProfileNutritionGoalKey = (typeof PROFILE_NUTRITION_GOALS)[number];

export const PROFILE_NUTRITION_GOAL_KEY_LABELS: Record<ProfileNutritionGoalKey, string> = {
  high_protein: "High Protein",
  lower_calorie: "Lower Calorie",
  lower_carb: "Lower Carb",
  balanced: "Balanced",
};

export const PROFILE_NUTRITION_GOAL_KEY_MICROCOPY: Record<ProfileNutritionGoalKey, string> = {
  high_protein: "Leans toward meals with more protein per serving.",
  lower_calorie: "Leans toward lighter plates that still fill a crew.",
  lower_carb: "Leans toward meals with fewer carbs per serving.",
  balanced: "Leans toward an even split of protein, carbs, and fat.",
};

export const PROFILE_NUTRITION_GOALS_DESCRIPTION =
  "Pick one goal to shape Pick Tonight and Shift Planner. Allergies and diets always come first.";

export function isProfileNutritionGoalKey(value: unknown): value is ProfileNutritionGoalKey {
  return typeof value === "string" && (PROFILE_NUTRITION_GOALS as readonly string[]).includes(value);
}

/** Single select: the first launch goal in the stored/submitted list, or null. */
export function sanitizeProfileNutritionGoal(raw: readonly unknown[] | null | undefined): ProfileNutritionGoalKey | null {
  return raw?.find(isProfileNutritionGoalKey) ?? null;
}

/** Storage/API shape for the single goal. */
export function profileNutritionGoalToList(goal: ProfileNutritionGoalKey | null): ProfileNutritionGoalKey[] {
  return goal ? [goal] : [];
}

export interface ProfileGoalRecipeFacts {
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  /** Catalog flags computed from real nutrition (approved-catalog isHighProtein / isLowCarb / isHealthy). */
  highProteinFlag?: boolean | null;
  lowCarbFlag?: boolean | null;
  lighterFlag?: boolean | null;
  nutritionCategory?: NutritionCategory | null;
}

/**
 * Same order of magnitude as the history-personalization nudges (+45 / −50):
 * enough to visibly shift the generator's 80-point weighted draw, never enough
 * to make an eligible meal unreachable.
 */
export const PROFILE_GOAL_MAX_BONUS = 30;
export const PROFILE_GOAL_MAX_PENALTY = -20;
/** Cap for meals that hit the goal but are too light to feed a crew (under 20 g protein / 350 kcal). */
const UNDERFED_CAP = 10;
/** Fallback nudge when macros are unknown — directional only. */
const FLAG_BONUS = 14;

function known(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) && n > 0 ? n : null;
}

function clamp(n: number): number {
  return Math.max(PROFILE_GOAL_MAX_PENALTY, Math.min(PROFILE_GOAL_MAX_BONUS, n));
}

/**
 * Ranking signals (per serving):
 * - high_protein:  (protein − 30 g) × 1.5 → 50 g+ max, ~17 g floor.
 * - lower_calorie: (650 − kcal) ÷ 9 → 380 kcal max, 830 kcal floor; capped when under 350 kcal or under 20 g protein.
 * - lower_carb:    45 − carbs → 15 g max, 65 g floor; capped when under 20 g protein.
 * - balanced:      30 − 75 × (|P% − 30| + |C% − 40| + |F% − 30|) of macro energy, −8 over 950 kcal.
 */
export function scoreProfileNutritionGoal(
  goal: ProfileNutritionGoalKey | null | undefined,
  f: ProfileGoalRecipeFacts,
): number {
  if (!goal) return 0;
  const cal = known(f.calories);
  const protein = known(f.protein_g);
  const carbs = known(f.carbs_g);
  const fat = known(f.fat_g);
  const cat = f.nutritionCategory ?? null;
  const underfed = protein != null && protein < 20;

  switch (goal) {
    case "high_protein":
      if (protein != null) return clamp((protein - 30) * 1.5);
      return f.highProteinFlag || cat === "high_protein" ? FLAG_BONUS : 0;

    case "lower_calorie": {
      if (cal != null) {
        const score = clamp((650 - cal) / 9);
        return cal < 350 || underfed ? Math.min(score, UNDERFED_CAP) : score;
      }
      if (f.lighterFlag || cat === "lighter") return FLAG_BONUS;
      return cat === "indulgent" ? -8 : 0;
    }

    case "lower_carb": {
      if (carbs != null) {
        const score = clamp(45 - carbs);
        return underfed ? Math.min(score, UNDERFED_CAP) : score;
      }
      return f.lowCarbFlag ? FLAG_BONUS : 0;
    }

    case "balanced": {
      if (protein != null && carbs != null && fat != null) {
        const kcal = protein * 4 + carbs * 4 + fat * 9;
        const deviation =
          Math.abs((protein * 4) / kcal - 0.3) + Math.abs((carbs * 4) / kcal - 0.4) + Math.abs((fat * 9) / kcal - 0.3);
        const heavy = cal != null && cal > 950 ? 8 : 0;
        return clamp(30 - deviation * 75 - heavy);
      }
      if (cat === "balanced") return 10;
      return cat === "indulgent" ? -6 : 0;
    }
  }
}
