/**
 * Firehall Meals Pro — saved "Nutrition Goals" (multi-select profile setting).
 *
 * Separate from the free single-select `nutrition_goal` session mode in
 * goal-scoring.ts: these are persistent account preferences that softly
 * re-rank recommendations for an entitled user. They are weighted nudges
 * applied AFTER hard filters (allergies, dietary restrictions, Foods to Avoid,
 * appliances, protein) have already decided pool membership — a goal can
 * reorder candidates but can never admit an excluded recipe or empty the pool.
 *
 * Scores use only real per-serving macros already on the recipe (0 = unknown,
 * never estimated) plus the editorially-derived NutritionCategory as a
 * fallback. There is no fibre-gram data in the catalog, so "Higher Fibre"
 * scores off the recipe's `high_fiber` tag and vegetable-forward categories.
 */
import type { NutritionCategory } from "../curated-recipe/metadata/taxonomy.js";

export const PROFILE_NUTRITION_GOALS = [
  "high_protein",
  "lower_calorie",
  "lower_carb",
  "balanced",
  "higher_carb",
  "lower_fat",
  "higher_fibre",
] as const;

export type ProfileNutritionGoalKey = (typeof PROFILE_NUTRITION_GOALS)[number];

export const PROFILE_NUTRITION_GOAL_KEY_LABELS: Record<ProfileNutritionGoalKey, string> = {
  high_protein: "High Protein",
  lower_calorie: "Lower Calorie",
  lower_carb: "Lower Carb",
  balanced: "Balanced",
  higher_carb: "Higher Carb",
  lower_fat: "Lower Fat",
  higher_fibre: "Higher Fibre",
};

export const PROFILE_NUTRITION_GOALS_DESCRIPTION = "Shape meal recommendations around how you want to eat.";

/** Selecting one side of a pair deselects the other — they would cancel out in scoring. */
export const CONFLICTING_NUTRITION_GOALS: Partial<Record<ProfileNutritionGoalKey, ProfileNutritionGoalKey>> = {
  lower_carb: "higher_carb",
  higher_carb: "lower_carb",
};

export function isProfileNutritionGoalKey(value: unknown): value is ProfileNutritionGoalKey {
  return typeof value === "string" && (PROFILE_NUTRITION_GOALS as readonly string[]).includes(value);
}

/** Drops unknown keys, de-dupes, keeps canonical order, and resolves conflicting pairs (first wins). */
export function sanitizeProfileNutritionGoals(raw: readonly unknown[] | null | undefined): ProfileNutritionGoalKey[] {
  if (!raw) return [];
  const picked = new Set<ProfileNutritionGoalKey>();
  for (const value of raw) {
    if (!isProfileNutritionGoalKey(value) || picked.has(value)) continue;
    const conflict = CONFLICTING_NUTRITION_GOALS[value];
    if (conflict && picked.has(conflict)) continue;
    picked.add(value);
  }
  return PROFILE_NUTRITION_GOALS.filter((g) => picked.has(g));
}

export function toggleProfileNutritionGoal(
  current: readonly ProfileNutritionGoalKey[],
  goal: ProfileNutritionGoalKey,
): ProfileNutritionGoalKey[] {
  if (current.includes(goal)) return current.filter((g) => g !== goal);
  const conflict = CONFLICTING_NUTRITION_GOALS[goal];
  return sanitizeProfileNutritionGoals([...current.filter((g) => g !== conflict), goal]);
}

export interface ProfileGoalRecipeFacts {
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  highFiberTag?: boolean | null;
  nutritionCategory?: NutritionCategory | null;
}

/** Combined nudge bounds — big enough to matter, small next to protein/style/quality signals. */
export const PROFILE_GOALS_MAX_BONUS = 18;
export const PROFILE_GOALS_MAX_PENALTY = -8;

function known(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) && n > 0 ? n : null;
}

function scoreOneGoal(goal: ProfileNutritionGoalKey, f: ProfileGoalRecipeFacts): number {
  const cal = known(f.calories);
  const protein = known(f.protein_g);
  const carbs = known(f.carbs_g);
  const fat = known(f.fat_g);
  const cat = f.nutritionCategory ?? null;

  switch (goal) {
    case "high_protein":
      if (protein != null) {
        if (protein >= 40) return 12;
        if (protein >= 30) return 8;
        if (protein < 20) return -4;
        return 0;
      }
      return cat === "high_protein" ? 8 : 0;

    case "lower_calorie":
      if (cal != null) {
        // A crew still needs a real meal — very light plates get only a small nudge.
        if (cal < 350) return 4;
        if (cal <= 600) return protein != null && protein < 25 ? 6 : 12;
        if (cal <= 750) return 6;
        if (cal > 950) return -6;
        return 0;
      }
      if (cat === "lighter" || cat === "vegetarian_friendly") return 6;
      return cat === "indulgent" ? -4 : 0;

    case "lower_carb":
      if (carbs != null) {
        if (carbs <= 25) return protein != null && protein < 20 ? 6 : 12;
        if (carbs <= 40) return 6;
        if (carbs > 80) return -6;
        return 0;
      }
      return 0;

    case "higher_carb":
      if (carbs != null) {
        if (carbs >= 70) return 10;
        if (carbs >= 50) return 6;
        if (carbs < 25) return -4;
        return 0;
      }
      return cat === "comfort" || cat === "balanced" ? 3 : 0;

    case "lower_fat":
      if (fat != null) {
        if (fat <= 18) return 12;
        if (fat <= 28) return 6;
        if (fat > 45) return -6;
        return 0;
      }
      if (cat === "lighter") return 5;
      return cat === "indulgent" ? -4 : 0;

    case "balanced": {
      if (protein != null && carbs != null && fat != null) {
        const kcal = protein * 4 + carbs * 4 + fat * 9;
        const inRange = [
          protein * 4 / kcal >= 0.2 && protein * 4 / kcal <= 0.4,
          carbs * 4 / kcal >= 0.3 && carbs * 4 / kcal <= 0.55,
          fat * 9 / kcal >= 0.2 && fat * 9 / kcal <= 0.4,
        ].filter(Boolean).length;
        if (inRange === 3) return 10;
        if (inRange === 2) return 4;
        return 0;
      }
      if (cat === "balanced") return 6;
      return cat === "indulgent" ? -3 : 0;
    }

    case "higher_fibre":
      if (f.highFiberTag) return 10;
      if (cat === "vegetarian_friendly" || cat === "lighter") return 5;
      return 0;
  }
}

/** Weighted preference delta for one recipe across all saved goals — clamped, never a hard filter. */
export function scoreProfileNutritionGoals(
  goals: readonly ProfileNutritionGoalKey[] | null | undefined,
  facts: ProfileGoalRecipeFacts,
): number {
  if (!goals || goals.length === 0) return 0;
  const total = goals.reduce((sum, goal) => sum + scoreOneGoal(goal, facts), 0);
  return Math.max(PROFILE_GOALS_MAX_PENALTY, Math.min(PROFILE_GOALS_MAX_BONUS, total));
}
