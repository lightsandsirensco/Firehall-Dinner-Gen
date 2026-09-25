/**
 * Firehall Meals Pro V1 Feature 3 — Meal Memory / Smarter Generator.
 *
 * Durable, account-level "Mark as Cooked" event log. See
 * server/db/migrations/047_user_meal_history.sql for the schema and
 * server/meal-history/store.ts for access. Recipe identity is always the
 * canonical catalog slug — title/link are resolved at read time, never
 * duplicated into the row (see shared/hall-catalog/gate.ts).
 */

/** Wire shape returned by GET /api/meal-history — display fields resolved server-side. */
export interface MealHistoryEntry {
  id: number;
  recipe_slug: string;
  cooked_at: string;
  /** Canonical catalog title, or null if the slug is no longer in the catalog (fails gracefully). */
  title: string | null;
  /** Canonical recipe detail path, or null if the slug is no longer in the catalog. */
  recipe_path: string | null;
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
