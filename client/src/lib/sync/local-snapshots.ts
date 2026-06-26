import type { ClientRecipeResponse } from "@shared/schema";
import type { HallFavoritesSnapshot } from "@shared/hall-favorites/types";
import type { HallHistorySnapshot, HallProfile } from "@shared/hall-profile/types";
import type { WheelStreakSnapshot } from "@shared/wheel-streak/types";
import type { SyncSnapshotKey, SyncSnapshotRow } from "@shared/sync/types";
import { getSavedMeals, type SavedMeal } from "@/lib/saved-meals";
import { getHallFavoritesSnapshot, HALL_FAVORITES_CHANGED_EVENT } from "@/lib/hall-favorites-store";
import {
  getHallHistorySnapshot,
  HALL_HISTORY_CHANGED_EVENT,
} from "@/lib/hall-history-store";
import { getHallProfile, saveHallProfile, HALL_PROFILE_CHANGED_EVENT } from "@/lib/hall-profile-store";
import { getWheelStreakSnapshot, WHEEL_STREAK_CHANGED_EVENT } from "@/lib/wheel-streak-store";

const FAVORITES_KEY = "firehall_hall_favorites_v1";
const HISTORY_KEY = "firehall_hall_history_v1";
const WHEEL_KEY = "firehall_wheel_streak_v1";
const SAVED_KEY = "firehall_saved_meals";

export const SYNC_CHANGE_EVENTS = [
  "favorites-changed",
  HALL_FAVORITES_CHANGED_EVENT,
  HALL_HISTORY_CHANGED_EVENT,
  WHEEL_STREAK_CHANGED_EVENT,
  HALL_PROFILE_CHANGED_EVENT,
] as const;

export function collectLocalSnapshots(): SyncSnapshotRow[] {
  return [
    {
      data_key: "personal_favorites",
      snapshot_json: getHallFavoritesSnapshot(),
      updated_at: getHallFavoritesSnapshot().updatedAt,
    },
    {
      data_key: "personal_meal_history",
      snapshot_json: getHallHistorySnapshot(),
      updated_at: getHallHistorySnapshot().updatedAt,
    },
    {
      data_key: "wheel_streak",
      snapshot_json: getWheelStreakSnapshot(),
      updated_at: getWheelStreakSnapshot().updatedAt,
    },
    {
      data_key: "cooking_preferences",
      snapshot_json: getHallProfile(),
      updated_at: getHallProfile().updatedAt,
    },
  ];
}

export function getLocalSavedMeals(): SavedMeal[] {
  return getSavedMeals();
}

export function applySavedMeals(meals: SavedMeal[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(meals));
    window.dispatchEvent(new Event("favorites-changed"));
  } catch {
    /* quota */
  }
}

function writeJson(key: string, value: unknown, eventName?: string): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (eventName) window.dispatchEvent(new Event(eventName));
  } catch {
    /* quota */
  }
}

export function applyHallFavoritesSnapshot(snapshot: HallFavoritesSnapshot): void {
  writeJson(FAVORITES_KEY, snapshot, HALL_FAVORITES_CHANGED_EVENT);
}

export function applyHallHistorySnapshot(snapshot: HallHistorySnapshot): void {
  writeJson(HISTORY_KEY, snapshot, HALL_HISTORY_CHANGED_EVENT);
}

export function applyWheelStreakSnapshot(snapshot: WheelStreakSnapshot): void {
  writeJson(WHEEL_KEY, snapshot, WHEEL_STREAK_CHANGED_EVENT);
}

export function applyHallProfileSnapshot(snapshot: HallProfile): void {
  const local = getHallProfile();
  saveHallProfile({
    ...snapshot,
    hallId: local.hallId,
  });
}

export function snapshotByKey(
  rows: SyncSnapshotRow[],
  key: SyncSnapshotKey,
): SyncSnapshotRow | undefined {
  return rows.find((r) => r.data_key === key);
}

export function toSavedMealRows(meals: SavedMeal[]): Array<{
  recipe_key: string;
  recipe_json: ClientRecipeResponse;
  saved_at: string;
}> {
  return meals.map((meal) => ({
    recipe_key: meal.id,
    recipe_json: meal.recipe,
    saved_at: meal.savedAt,
  }));
}

export function fromSavedMealRows(
  rows: Array<{ recipe_key: string; recipe_json: unknown; saved_at: string }>,
): SavedMeal[] {
  return rows.map((row) => ({
    id: row.recipe_key,
    savedAt: row.saved_at,
    recipe: row.recipe_json as ClientRecipeResponse,
  }));
}
