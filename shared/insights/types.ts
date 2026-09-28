/**
 * Firehall Meals Personalized Insights (Pro-only).
 *
 * Deterministic engine — NO AI/LLM. Every insight is a plain arithmetic
 * aggregate over real user_meal_history rows (rating, make_again,
 * nutrition_goal snapshot, frozen cost snapshot) joined with real, already-
 * published catalog metadata (cuisine/protein/cookTime). See
 * server/insights/engine.ts for the actual computation + minimum-sample
 * gating (server/insights/engine.ts INSIGHT_MIN_SAMPLE).
 */

export const INSIGHT_CATEGORIES = [
  "crew_preferences",
  "nutrition",
  "cost",
  "variety",
  "cooking_time",
  "meal_patterns",
] as const;
export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number];

export const INSIGHT_CATEGORY_LABELS: Record<InsightCategory, string> = {
  crew_preferences: "Crew Preferences",
  nutrition: "Nutrition",
  cost: "Cost",
  variety: "Variety",
  cooking_time: "Cooking Time",
  meal_patterns: "Meal Patterns",
};

export const INSIGHT_TYPES = [
  "cuisine_preference",
  "protein_repeat_rate",
  "cost_trend",
  "nutrition_goal_pattern",
  "variety_new_recipes",
  "cook_time_preference",
  "highly_rated_pattern",
] as const;
export type InsightType = (typeof INSIGHT_TYPES)[number];

export interface InsightMetric {
  label: string;
  value: string;
}

export interface Insight {
  /** Stable per type(+key) so the client can dedupe impressions — e.g. "cuisine_preference:mexican". */
  id: string;
  type: InsightType;
  category: InsightCategory;
  title: string;
  supporting_text: string;
  /** Sample count backing this insight — the confidence signal shown/used for ranking, never a fabricated score. */
  sample_count: number;
  metric?: InsightMetric;
  generated_at: string;
}

export interface InsightsResponse {
  /** False when the signed-in user does not currently have the `meal_memory` (Pro) entitlement — insights are never computed in that case. */
  entitled: boolean;
  insights: Insight[];
  generated_at: string;
}
