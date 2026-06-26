import {
  HALL_FAVORITES_SCHEMA_VERSION,
  MAX_HALL_CLASSICS,
  type HallFavorite,
  type HallFavoritesSnapshot,
  type HallFavoritesStore,
} from "@shared/hall-favorites/types";
import { getHallProfile } from "@/lib/hall-profile-store";
import { getSavedMeals } from "@/lib/saved-meals";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";

const STORAGE_KEY = "firehall_hall_favorites_v1";
const MIGRATION_FLAG = "firehall_hall_favorites_migrated_v1";

export const HALL_FAVORITES_CHANGED_EVENT = "hall-favorites-changed";

function slugKey(slug: string): string {
  return slug.trim().toLowerCase();
}

function dispatchChanged(): void {
  window.dispatchEvent(new Event(HALL_FAVORITES_CHANGED_EVENT));
}

function emptySnapshot(hallId: string): HallFavoritesSnapshot {
  return {
    schemaVersion: HALL_FAVORITES_SCHEMA_VERSION,
    hallId,
    favorites: [],
    updatedAt: new Date().toISOString(),
  };
}

function parseSnapshot(raw: string, hallId: string): HallFavoritesSnapshot {
  try {
    const parsed = JSON.parse(raw) as HallFavoritesSnapshot;
    if (parsed?.schemaVersion !== HALL_FAVORITES_SCHEMA_VERSION) return emptySnapshot(hallId);
    if (parsed.hallId !== hallId) return emptySnapshot(hallId);
    if (!Array.isArray(parsed.favorites)) return emptySnapshot(hallId);
    const favorites = parsed.favorites
      .filter(
        (f): f is HallFavorite =>
          !!f && typeof f.slug === "string" && typeof f.title === "string" && typeof f.addedAt === "string",
      )
      .slice(0, MAX_HALL_CLASSICS);
    return { ...parsed, favorites };
  } catch {
    return emptySnapshot(hallId);
  }
}

function writeSnapshot(snapshot: HallFavoritesSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    dispatchChanged();
  } catch {
    /* quota / private mode */
  }
}

export function getHallFavoritesSnapshot(): HallFavoritesSnapshot {
  const hallId = getHallProfile().hallId;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySnapshot(hallId);
    return parseSnapshot(raw, hallId);
  } catch {
    return emptySnapshot(hallId);
  }
}

export function getHallFavorites(): HallFavorite[] {
  return getHallFavoritesSnapshot().favorites;
}

export function getHallFavoritesCount(): number {
  return getHallFavorites().length;
}

export function isHallFavorite(slug: string): boolean {
  const key = slugKey(slug);
  return getHallFavorites().some((f) => slugKey(f.slug) === key);
}

export function canAddHallFavorite(): boolean {
  return getHallFavorites().length < MAX_HALL_CLASSICS;
}

export type AddHallFavoriteResult =
  | { ok: true; favorite: HallFavorite }
  | { ok: false; reason: "duplicate" | "full" };

export function addHallFavorite(
  input: Omit<HallFavorite, "addedAt"> & { addedAt?: string },
): AddHallFavoriteResult {
  const slug = slugKey(input.slug);
  if (!slug) return { ok: false, reason: "duplicate" };

  const snapshot = getHallFavoritesSnapshot();
  if (snapshot.favorites.some((f) => slugKey(f.slug) === slug)) {
    return { ok: false, reason: "duplicate" };
  }
  if (snapshot.favorites.length >= MAX_HALL_CLASSICS) {
    return { ok: false, reason: "full" };
  }

  const favorite: HallFavorite = {
    slug,
    title: input.title.trim(),
    recipePath: input.recipePath ?? approvedCatalogRecipePath(slug),
    addedAt: input.addedAt ?? new Date().toISOString(),
    source: input.source,
  };

  writeSnapshot({
    ...snapshot,
    hallId: getHallProfile().hallId,
    favorites: [favorite, ...snapshot.favorites].slice(0, MAX_HALL_CLASSICS),
    updatedAt: new Date().toISOString(),
  });

  return { ok: true, favorite };
}

export function removeHallFavorite(slug: string): boolean {
  const key = slugKey(slug);
  const snapshot = getHallFavoritesSnapshot();
  const next = snapshot.favorites.filter((f) => slugKey(f.slug) !== key);
  if (next.length === snapshot.favorites.length) return false;

  writeSnapshot({
    ...snapshot,
    favorites: next,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

/** One-time import of legacy catalog bookmarks into Hall Classics. */
export function migrateCatalogSavedMealsToHallFavorites(): void {
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return;
    const saved = getSavedMeals().filter((m) => m.id.startsWith("catalog:"));
    for (const meal of saved) {
      if (!canAddHallFavorite()) break;
      const slug = meal.id.replace(/^catalog:/, "");
      addHallFavorite({
        slug,
        title: meal.recipe.title,
        source: "migrated_saved_meal",
      });
    }
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export const localHallFavoritesStore: HallFavoritesStore = {
  getSnapshot: getHallFavoritesSnapshot,
  getFavorites: getHallFavorites,
  addFavorite: (input) => {
    const result = addHallFavorite(input);
    return result.ok ? result.favorite : null;
  },
  removeFavorite: removeHallFavorite,
  isFavorite: isHallFavorite,
};
