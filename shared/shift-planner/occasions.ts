/**
 * Shift Planner — meal occasion taxonomy + deterministic mapping onto the
 * EXISTING generator request shape (shared/schema.ts GenerateRequest). No new
 * AI/recipe system: every occasion below reuses a `meal_format`/
 * `firehall_category` the generator + recipe pool already understand.
 */
import type { GenerateRequest } from "../schema.js";
import type { FirehallCategoryId } from "../firehall-categories.js";

export const MEAL_OCCASIONS = [
  "breakfast",
  "brunch",
  "lunch",
  "dinner",
  "snack",
  "post_training",
] as const;
export type MealOccasion = (typeof MEAL_OCCASIONS)[number];

export const MEAL_OCCASION_LABELS: Record<MealOccasion, string> = {
  breakfast: "Breakfast",
  brunch: "Brunch",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  post_training: "Post-Training",
};

export interface OccasionRequestOverrides {
  meal_format: GenerateRequest["meal_format"];
  firehall_category?: FirehallCategoryId;
  time_available: GenerateRequest["time_available"];
}

/**
 * Occasion → generator request overrides.
 *
 * - `breakfast`/`brunch` both map to the only real breakfast-format pool
 *   (`meal_format: "breakfast"`) — there is no separate brunch catalog yet,
 *   so Brunch just asks for a bit more time than a weekday Breakfast.
 * - `lunch`/`snack` reuse the existing `quick_meals` category (no dedicated
 *   snack catalog exists yet) — Snack asks for the shortest cook time.
 * - `dinner` uses `crew_favorites`, the generator's default main-meal pool.
 * - `post_training` is an exact fit for the existing `high_protein` category
 *   (already tuned toward Performance-pool recipes — see
 *   shared/firehall-categories.ts).
 */
export const MEAL_OCCASION_REQUEST_OVERRIDES: Record<MealOccasion, OccasionRequestOverrides> = {
  breakfast: { meal_format: "breakfast", time_available: "20-30" },
  brunch: { meal_format: "breakfast", time_available: "30-45" },
  lunch: { meal_format: "random", firehall_category: "quick_meals", time_available: "30-45" },
  dinner: { meal_format: "random", firehall_category: "crew_favorites", time_available: "45-60" },
  snack: { meal_format: "random", firehall_category: "quick_meals", time_available: "15-25" },
  post_training: { meal_format: "random", firehall_category: "high_protein", time_available: "30-45" },
};

export function isMealOccasion(value: string): value is MealOccasion {
  return (MEAL_OCCASIONS as readonly string[]).includes(value);
}
