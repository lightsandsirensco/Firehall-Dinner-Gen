/**
 * Hall Favorites — crew traditions pinned on this hall's device.
 */

export const HALL_FAVORITES_SCHEMA_VERSION = 1 as const;
export const MAX_HALL_CLASSICS = 10;

export interface HallFavorite {
  slug: string;
  title: string;
  recipePath?: string;
  addedAt: string;
  source?: string;
}

export interface HallFavoritesSnapshot {
  schemaVersion: typeof HALL_FAVORITES_SCHEMA_VERSION;
  hallId: string;
  favorites: HallFavorite[];
  updatedAt: string;
}

export interface MostCookedMeal {
  slug?: string;
  title: string;
  recipePath?: string;
  cookCount: number;
  lastCookedAt: string;
}

/** Account migration: implement for localStorage now, remote API later. */
export interface HallFavoritesStore {
  getSnapshot(): HallFavoritesSnapshot;
  getFavorites(): HallFavorite[];
  addFavorite(input: Omit<HallFavorite, "addedAt"> & { addedAt?: string }): HallFavorite | null;
  removeFavorite(slug: string): boolean;
  isFavorite(slug: string): boolean;
}
