/**
 * Meal History tier-aware read/feedback logic. Pure orchestration over an
 * injectable data layer (defaults to ./store.ts) so the Free/Premium window
 * rules can be validated without a database.
 */
import {
  canEditFeedbackFor,
  visibleSince,
  type MealHistoryAccess,
} from "../../shared/meal-history/access.js";
import type {
  MealFeedbackInput,
  MealHistoryEntry,
  MealHistoryFavorite,
  MealHistoryListResponse,
} from "../../shared/meal-history/types.js";
import {
  MEAL_HISTORY_PAGE_MAX,
  countMealHistoryForUser,
  getMealHistoryEntryForUser,
  listFavoriteMealsForUser,
  listMealHistoryPage,
  submitMealFeedbackForUser,
} from "./store.js";

export interface MealHistoryDeps {
  listPage(userId: string, opts: { since: Date | null; limit: number; offset: number }): Promise<MealHistoryEntry[]>;
  count(userId: string, since: Date | null): Promise<{ total: number; older: number }>;
  favorites(userId: string): Promise<MealHistoryFavorite[]>;
  getEntry(userId: string, id: number): Promise<MealHistoryEntry | null>;
  submitFeedback(
    userId: string,
    id: number,
    feedback: MealFeedbackInput,
  ): Promise<{ ok: true; entry: MealHistoryEntry } | { ok: false; reason: "not_found" }>;
}

export const storeMealHistoryDeps: MealHistoryDeps = {
  listPage: listMealHistoryPage,
  count: countMealHistoryForUser,
  favorites: (userId) => listFavoriteMealsForUser(userId),
  getEntry: getMealHistoryEntryForUser,
  submitFeedback: submitMealFeedbackForUser,
};

export const MEAL_HISTORY_DEFAULT_PAGE = 30;

export async function buildMealHistoryList(
  deps: MealHistoryDeps,
  userId: string,
  access: MealHistoryAccess,
  page: { offset?: number; limit?: number } = {},
  now: Date = new Date(),
): Promise<MealHistoryListResponse> {
  if (!access.canLog) {
    return {
      entitled: false,
      tier: access.tier,
      window_days: access.windowDays,
      entries: [],
      has_more: false,
      locked_count: 0,
      favorites: [],
    };
  }

  const since = visibleSince(access, now);
  const limit = Math.max(1, Math.min(page.limit ?? MEAL_HISTORY_DEFAULT_PAGE, MEAL_HISTORY_PAGE_MAX));
  const offset = Math.max(0, page.offset ?? 0);
  const [rows, counts, favorites] = await Promise.all([
    deps.listPage(userId, { since, limit: limit + 1, offset }),
    deps.count(userId, since),
    access.fullHistory ? deps.favorites(userId) : Promise.resolve([]),
  ]);

  return {
    entitled: true,
    tier: access.tier,
    window_days: access.windowDays,
    entries: rows.slice(0, limit),
    has_more: rows.length > limit,
    locked_count: since ? counts.older : 0,
    favorites,
  };
}

export type FeedbackOutcome =
  | { ok: true; entry: MealHistoryEntry }
  | { ok: false; status: 403 | 404; message: string };

export async function submitFeedbackWithAccess(
  deps: MealHistoryDeps,
  userId: string,
  access: MealHistoryAccess,
  id: number,
  feedback: MealFeedbackInput,
  now: Date = new Date(),
): Promise<FeedbackOutcome> {
  if (!access.canLog) {
    return { ok: false, status: 403, message: "Sign in to rate meals." };
  }
  const existing = await deps.getEntry(userId, id);
  if (!existing) return { ok: false, status: 404, message: "History entry not found" };
  if (!canEditFeedbackFor(access, existing.cooked_at, now)) {
    return {
      ok: false,
      status: 403,
      message: "Ratings and notes on meals older than 30 days are part of Firehall Meals Pro.",
    };
  }
  const result = await deps.submitFeedback(userId, id, feedback);
  if (!result.ok) return { ok: false, status: 404, message: "History entry not found" };
  return { ok: true, entry: result.entry };
}
