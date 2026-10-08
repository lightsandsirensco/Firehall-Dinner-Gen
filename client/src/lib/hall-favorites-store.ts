/**
 * Hall Classics — read projection over the canonical saved-meals store.
 *
 * Personal favourites are owned by lib/saved-meals (→ user_saved_recipes).
 * "Hall Classics" is the catalog subset of those saves, so pinning on a
 * recipe page, the wheel, or a dashboard is the same Save the generator and
 * Explore use.
 *
 * Legacy: `firehall_hall_favorites_v1` was a separate 10-item device store.
 * It is never deleted or rewritten here; it stays readable for cloud sync
 * (`personal_favorites` snapshot) and is imported into saved meals once per
 * slug (tracked in IMPORTED_KEY, so a later un-save is not undone by a
 * re-import).
 */
import {
  HALL_FAVORITES_SCHEMA_VERSION,
  type HallFavorite,
  type HallFavoritesSnapshot,
} from "@shared/hall-favorites/types";
import { getHallProfile } from "@/lib/hall-profile-store";
import {
  getSavedMeals,
  isCatalogMealSaved,
  notifySavedMealsChanged,
  removeCatalogMeal,
  saveCatalogMeal,
  HALL_FAVORITES_CHANGED_EVENT,
} from "@/lib/saved-meals";

const LEGACY_STORAGE_KEY = "firehall_hall_favorites_v1";
const IMPORTED_KEY = "firehall_hall_favorites_imported_v1";

export { HALL_FAVORITES_CHANGED_EVENT };

function slugKey(slug: string): string {
  return slug.trim().toLowerCase();
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
    const favorites = parsed.favorites.filter(
      (f): f is HallFavorite =>
        !!f && typeof f.slug === "string" && typeof f.title === "string" && typeof f.addedAt === "string",
    );
    return { ...parsed, favorites };
  } catch {
    return emptySnapshot(hallId);
  }
}

/** Legacy device snapshot, read-only. Used by cloud sync and the import below. */
export function getHallFavoritesSnapshot(): HallFavoritesSnapshot {
  const hallId = getHallProfile().hallId;
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return emptySnapshot(hallId);
    return parseSnapshot(raw, hallId);
  } catch {
    return emptySnapshot(hallId);
  }
}

function getImportedSlugs(): Set<string> {
  try {
    const raw = localStorage.getItem(IMPORTED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : []);
  } catch {
    return new Set();
  }
}

let importedThisSession = false;

/**
 * Copies legacy Hall Favorites into saved meals. Idempotent: each legacy slug
 * is imported at most once per device, and existing saves are never
 * overwritten. Call again after a sync pull may have brought new legacy rows.
 */
export function importLegacyHallFavorites(): number {
  importedThisSession = true;
  try {
    const legacy = getHallFavoritesSnapshot().favorites;
    if (legacy.length === 0) return 0;
    const imported = getImportedSlugs();
    let added = 0;
    for (const fav of legacy) {
      const slug = slugKey(fav.slug);
      if (!slug || imported.has(slug)) continue;
      const result = saveCatalogMeal(
        {
          slug,
          title: fav.title,
          recipePath: fav.recipePath,
          savedAt: fav.addedAt,
          source: fav.source ?? "legacy_hall_favorite",
        },
        { notify: false },
      );
      if (result.saved) added += 1;
      imported.add(slug);
    }
    localStorage.setItem(IMPORTED_KEY, JSON.stringify([...imported]));
    if (added > 0) notifySavedMealsChanged();
    return added;
  } catch {
    return 0;
  }
}

function ensureImported(): void {
  if (!importedThisSession && typeof window !== "undefined") importLegacyHallFavorites();
}

export function getHallFavorites(): HallFavorite[] {
  ensureImported();
  return getSavedMeals()
    .filter((m) => m.id.startsWith("catalog:"))
    .map((m) => ({
      slug: m.id.slice("catalog:".length),
      title: m.recipe.title,
      recipePath: m.recipePath,
      addedAt: m.savedAt,
      source: m.source,
    }));
}

export function getHallFavoritesCount(): number {
  return getHallFavorites().length;
}

export function isHallFavorite(slug: string): boolean {
  ensureImported();
  return isCatalogMealSaved(slug);
}

export type AddHallFavoriteResult =
  | { ok: true; favorite: HallFavorite }
  | { ok: false; reason: "duplicate" | "invalid" };

export function addHallFavorite(
  input: Omit<HallFavorite, "addedAt"> & { addedAt?: string },
): AddHallFavoriteResult {
  const slug = slugKey(input.slug);
  if (!slug) return { ok: false, reason: "invalid" };
  const addedAt = input.addedAt ?? new Date().toISOString();
  const result = saveCatalogMeal({
    slug,
    title: input.title,
    recipePath: input.recipePath,
    source: input.source,
    savedAt: addedAt,
  });
  if (result.duplicate) return { ok: false, reason: "duplicate" };
  if (!result.saved) return { ok: false, reason: "invalid" };
  return {
    ok: true,
    favorite: { slug, title: input.title.trim(), recipePath: input.recipePath, addedAt, source: input.source },
  };
}

export function removeHallFavorite(slug: string): boolean {
  return removeCatalogMeal(slug);
}
