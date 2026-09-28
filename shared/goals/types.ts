/**
 * Firehall Meals Goals + Progress (V2 — production).
 *
 * Shift-based progress, not daily app-open streaks: every goal type here
 * counts real "Made This" / "Mark as Cooked" events (user_meal_history) —
 * never whether/how often the app was opened. Backed only by real,
 * already-captured per-meal data:
 *   - is_high_protein / is_high_fiber — the same RecipeTags booleans shown
 *     elsewhere in the app (shared/schema.ts), snapshotted at cook time.
 *   - nutrition_goal — the user's saved Nutrition Goal, snapshotted per
 *     meal at cook time (server/meal-history/store.ts) — never the current
 *     live preference re-applied to old rows.
 *   - cost_per_person_min/max + cost_trustworthy — frozen cost-estimate
 *     snapshot from the pricing engine at cook time — never recomputed
 *     against later grocery prices.
 *   - rating — post-meal crew feedback (1-5), also from user_meal_history.
 * No fabricated health scores, no medical claims, no invented "balanced"
 * tag (RecipeTags has no such flag) — a saved nutrition_goal of "balanced"
 * is handled entirely through nutrition_goal_match instead.
 *
 * Gated behind the same `meal_memory` (Firehall Meals Pro) entitlement as
 * Meal Memory + Meal History, since Goals + Progress has no real data to
 * show without server-side cooked-meal history.
 */

export const GOAL_TYPES = [
  "shift_meals",
  "new_meals",
  "high_protein_shifts",
  "plant_forward_meals",
  "healthier_meals",
  "nutrition_goal_match",
  "budget_avg_under",
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export type GoalUnit = "count" | "dollars";
/** at_least = reach/exceed target (most goals); at_most = stay AT or UNDER target (budget). */
export type GoalDirection = "at_least" | "at_most";

export interface GoalDefinition {
  type: GoalType;
  label: string;
  description: string;
  unit: GoalUnit;
  direction: GoalDirection;
  defaultTarget: number;
  minTarget: number;
  maxTarget: number;
}

export const GOAL_DEFINITIONS: Record<GoalType, GoalDefinition> = {
  shift_meals: {
    type: "shift_meals",
    label: "Log cooked meals",
    description: "Log a meal you made this month.",
    unit: "count",
    direction: "at_least",
    defaultTarget: 6,
    minTarget: 1,
    maxTarget: 20,
  },
  new_meals: {
    type: "new_meals",
    label: "Try new meals",
    description: "Cook meals this month you haven't cooked before.",
    unit: "count",
    direction: "at_least",
    defaultTarget: 3,
    minTarget: 1,
    maxTarget: 10,
  },
  high_protein_shifts: {
    type: "high_protein_shifts",
    label: "High Protein meals",
    description: "Cook a High Protein–tagged meal.",
    unit: "count",
    direction: "at_least",
    defaultTarget: 6,
    minTarget: 1,
    maxTarget: 20,
  },
  plant_forward_meals: {
    type: "plant_forward_meals",
    label: "Plant Forward meals",
    description: "Cook a Plant Forward–tagged meal.",
    unit: "count",
    direction: "at_least",
    defaultTarget: 3,
    minTarget: 1,
    maxTarget: 10,
  },
  healthier_meals: {
    type: "healthier_meals",
    label: "Healthier meals",
    description: "Cook a High Protein or Plant Forward–tagged meal.",
    unit: "count",
    direction: "at_least",
    defaultTarget: 4,
    minTarget: 1,
    maxTarget: 20,
  },
  nutrition_goal_match: {
    type: "nutrition_goal_match",
    label: "Match your nutrition goal",
    description: "Cook meals that match your saved nutrition goal.",
    unit: "count",
    direction: "at_least",
    defaultTarget: 4,
    minTarget: 1,
    maxTarget: 20,
  },
  budget_avg_under: {
    type: "budget_avg_under",
    label: "Keep meals budget-friendly",
    description: "Keep your average logged cost/person under this amount.",
    unit: "dollars",
    direction: "at_most",
    defaultTarget: 9,
    minTarget: 5,
    maxTarget: 25,
  },
};

export interface GoalProgress {
  goal_type: GoalType;
  target: number;
  current: number;
  unit: GoalUnit;
  direction: GoalDirection;
  /** 0-100 display percent — for at_most goals, 100 means "at or over budget", not "done". */
  percent: number;
  completed: boolean;
  /** Only meaningful for budget_avg_under — how many of this month's meals actually had a trustworthy cost snapshot backing `current`. */
  data_coverage?: { counted: number; total: number };
  /**
   * Only meaningful for nutrition_goal_match — the nutrition goal this
   * specific goal is (and always will) track, frozen at creation time so a
   * later profile preference change never retroactively changes what an
   * existing goal counts toward. Null for goals created before this existed
   * (those keep comparing against the live profile preference).
   */
  nutrition_goal_snapshot?: string | null;
}

export interface MonthlySummary {
  month_key: string;
  meals_logged: number;
  new_meals_tried: number;
  /** Null when the user has no saved nutrition goal (nothing real to compare against). */
  saved_nutrition_goal: string | null;
  nutrition_goal_matches: number | null;
  /** Null when no meal this month had a trustworthy cost snapshot. */
  avg_cost_per_person: number | null;
  /** How many of meals_logged actually had cost data (partial-coverage disclosure). */
  cost_data_meal_count: number;
  rated_4_plus_count: number;
}

export interface GoalsResponse {
  entitled: boolean;
  month_key: string;
  /** Goal types the user can still add. */
  available_goal_types: GoalType[];
  active: GoalProgress[];
  completed: GoalProgress[];
  summary: MonthlySummary | null;
}
