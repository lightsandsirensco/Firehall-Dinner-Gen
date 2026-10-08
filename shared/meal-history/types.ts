/**
 * Firehall Meals Meal History + Crew Feedback.
 *
 * Durable, account-level "Made This" / "Mark as Cooked" event log — ONE
 * table (user_meal_history, server/db/pg-migrations/0001_init.sql +
 * 0003_goals_and_meal_tags.sql + 0004_meal_feedback.sql), no second history
 * system. Recipe identity is always the canonical catalog slug —
 * title/image/link are resolved at read time, never duplicated into the row
 * (see shared/hall-catalog/gate.ts).
 *
 * Every context/feedback field is OPTIONAL and nullable — populated only
 * when real data existed at logging time. Never fabricated/backfilled.
 */

/** Fixed, positive quick-tap feedback vocabulary — no free-form tag creation (keeps future aggregation clean). */
export const POSITIVE_FEEDBACK_TAGS = [
  "crew_loved_it",
  "easy_to_make",
  "easy_cleanup",
  "good_portions",
  "good_value",
  "great_for_the_hall",
] as const;

export const NEGATIVE_FEEDBACK_TAGS = [
  "took_too_long",
  "too_expensive",
  "not_enough_food",
  "too_much_food",
  "too_spicy",
  "too_bland",
  "too_much_cleanup",
] as const;

export const FEEDBACK_TAGS = [...POSITIVE_FEEDBACK_TAGS, ...NEGATIVE_FEEDBACK_TAGS] as const;
export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];

export const FEEDBACK_TAG_LABELS: Record<FeedbackTag, string> = {
  crew_loved_it: "Crew loved it",
  easy_to_make: "Easy to make",
  easy_cleanup: "Easy cleanup",
  good_portions: "Good portions",
  good_value: "Good value",
  great_for_the_hall: "Great for the hall",
  took_too_long: "Took too long",
  too_expensive: "Too expensive",
  not_enough_food: "Not enough food",
  too_much_food: "Too much food",
  too_spicy: "Too spicy",
  too_bland: "Too bland",
  too_much_cleanup: "Too much cleanup",
};

export function isFeedbackTag(value: string): value is FeedbackTag {
  return (FEEDBACK_TAGS as readonly string[]).includes(value);
}

/** Cost snapshot AS ESTIMATED at the moment the meal was logged — never recomputed later. */
export interface MealCostSnapshot {
  totalMin: number;
  totalMax: number;
  perPersonMin: number;
  perPersonMax: number;
  /** Whether the pricing engine considered its own coverage trustworthy at the time. */
  trustworthy: boolean;
}

/** Context captured at "Made This" / Cook Mode completion time — all optional, never fabricated when unknown. */
export interface MealLogContext {
  hall_id?: string;
  meal_occasion?: string;
  crew_size?: number;
  nutrition_goal?: string;
  cost?: MealCostSnapshot;
  is_high_protein?: boolean;
  is_high_fiber?: boolean;
}

/** Post-meal crew feedback — all optional, submitted via a follow-up PATCH so logging never blocks on it. */
export interface MealFeedbackInput {
  rating?: 1 | 2 | 3 | 4 | 5;
  make_again?: boolean;
  feedback_tags?: FeedbackTag[];
  note?: string;
}

/** Wire shape returned by GET /api/meal-history — display fields resolved server-side. */
export interface MealHistoryEntry {
  id: number;
  recipe_slug: string;
  cooked_at: string;
  /** Canonical catalog title, or null if the slug is no longer in the catalog (fails gracefully). */
  title: string | null;
  /** Canonical recipe detail path, or null if the slug is no longer in the catalog. */
  recipe_path: string | null;
  /** Canonical catalog hero image, or null if the slug is no longer in the catalog. */
  hero_image: string | null;

  hall_id: string | null;
  meal_occasion: string | null;
  crew_size: number | null;
  nutrition_goal: string | null;
  is_high_protein: boolean | null;
  is_high_fiber: boolean | null;
  cost: MealCostSnapshot | null;

  rating: (1 | 2 | 3 | 4 | 5) | null;
  make_again: boolean | null;
  feedback_tags: FeedbackTag[];
  note: string | null;
  feedback_at: string | null;
}

export interface MealHistoryListResponse {
  /** False when the signed-in user does not currently have the `meal_memory` entitlement. */
  entitled: boolean;
  entries: MealHistoryEntry[];
}

export interface MealHistoryCreateResponse {
  ok: true;
  entry: MealHistoryEntry;
}

/** POST /api/meal-history/import — `entitled: false` means nothing was written (retry after upgrade). */
export interface MealHistoryImportResponse {
  entitled: boolean;
  imported: number;
  duplicates: number;
  skipped: number;
}

export interface MealHistoryFeedbackResponse {
  ok: true;
  entry: MealHistoryEntry;
}
