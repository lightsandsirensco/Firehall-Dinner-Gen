/**
 * Hall Favorites — legacy device snapshot shape (sync key `personal_favorites`,
 * legacy `hall_favorites`). Personal favourites are canonical in saved meals /
 * `user_saved_recipes`; client Hall Classics is a projection of catalog saves.
 */

export const HALL_FAVORITES_SCHEMA_VERSION = 1 as const;

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
