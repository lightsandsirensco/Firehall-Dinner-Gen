import type { HallFavorite, HallFavoritesSnapshot } from "../hall-favorites/types.js";
import type { HallHistoryEntry, HallHistorySnapshot, HallProfile } from "../hall-profile/types.js";
import type { WheelStreakSnapshot } from "../wheel-streak/types.js";

const MAX_HISTORY = 80;

function newerIso(a: string, b: string): string {
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export function mergeHallFavorites(
  local: HallFavoritesSnapshot,
  remote: HallFavoritesSnapshot,
): HallFavoritesSnapshot {
  const bySlug = new Map<string, HallFavorite>();
  for (const fav of [...remote.favorites, ...local.favorites]) {
    const key = fav.slug.trim().toLowerCase();
    const existing = bySlug.get(key);
    if (!existing || new Date(fav.addedAt).getTime() >= new Date(existing.addedAt).getTime()) {
      bySlug.set(key, fav);
    }
  }
  const favorites = Array.from(bySlug.values()).sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  );
  return {
    schemaVersion: local.schemaVersion,
    hallId: local.hallId,
    favorites: favorites.slice(0, 10),
    updatedAt: newerIso(local.updatedAt, remote.updatedAt),
  };
}

export function mergeHallHistory(
  local: HallHistorySnapshot,
  remote: HallHistorySnapshot,
): HallHistorySnapshot {
  const byId = new Map<string, HallHistoryEntry>();
  for (const entry of [...remote.entries, ...local.entries]) {
    const existing = byId.get(entry.id);
    if (!existing || new Date(entry.at).getTime() >= new Date(existing.at).getTime()) {
      byId.set(entry.id, entry);
    }
  }
  const entries = Array.from(byId.values())
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, MAX_HISTORY);
  return {
    schemaVersion: local.schemaVersion,
    hallId: local.hallId,
    entries,
    updatedAt: newerIso(local.updatedAt, remote.updatedAt),
  };
}

export function mergeWheelStreak(
  local: WheelStreakSnapshot,
  remote: WheelStreakSnapshot,
): WheelStreakSnapshot {
  const spinDays = [...new Set([...local.spinDays, ...remote.spinDays])].sort();
  const base = new Date(local.updatedAt).getTime() >= new Date(remote.updatedAt).getTime() ? local : remote;
  const other = base === local ? remote : local;
  return {
    ...base,
    spinDays,
    totalSpins: Math.max(local.totalSpins, remote.totalSpins),
    longestStreak: Math.max(local.longestStreak, remote.longestStreak),
    weeklySpins: Math.max(local.weeklySpins, remote.weeklySpins),
    wednesdayStreak: Math.max(local.wednesdayStreak, remote.wednesdayStreak),
    lastSpinAt: [local.lastSpinAt, remote.lastSpinAt].filter(Boolean).sort().pop(),
    lastSpinDay: [local.lastSpinDay, remote.lastSpinDay].filter(Boolean).sort().pop(),
    updatedAt: newerIso(local.updatedAt, remote.updatedAt),
    hallId: base.hallId || other.hallId,
  };
}

export function mergeHallProfile(local: HallProfile, remote: HallProfile): HallProfile {
  const localNewer = new Date(local.updatedAt).getTime() >= new Date(remote.updatedAt).getTime();
  const primary = localNewer ? local : remote;
  const secondary = localNewer ? remote : local;
  return {
    schemaVersion: local.schemaVersion,
    hallId: local.hallId,
    hallName: primary.hallName ?? secondary.hallName,
    shiftLabel: primary.shiftLabel ?? secondary.shiftLabel,
    defaultCrewSize: primary.defaultCrewSize ?? secondary.defaultCrewSize,
    updatedAt: newerIso(local.updatedAt, remote.updatedAt),
  };
}

export interface SavedMealLike {
  id: string;
  savedAt: string;
  recipe: unknown;
}

export function mergeSavedMeals(local: SavedMealLike[], remote: SavedMealLike[]): SavedMealLike[] {
  const byId = new Map<string, SavedMealLike>();
  for (const meal of [...remote, ...local]) {
    const existing = byId.get(meal.id);
    if (!existing || new Date(meal.savedAt).getTime() >= new Date(existing.savedAt).getTime()) {
      byId.set(meal.id, meal);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}
