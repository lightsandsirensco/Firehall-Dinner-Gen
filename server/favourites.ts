import { log } from "./index";

const MAX_FAVES = 5;

export interface FavouriteEntry {
  recipeId: string;
  addedAt: number;
}

const store = new Map<string, FavouriteEntry[]>();

export function getFavourites(userId: string): FavouriteEntry[] {
  return store.get(userId) || [];
}

export function addFavourite(userId: string, recipeId: string): FavouriteEntry[] {
  let faves = store.get(userId) || [];

  if (faves.some((f) => f.recipeId === recipeId)) {
    log(`Favourite idempotent skip: ${recipeId} already saved for ${userId}`, "fav");
    return faves;
  }

  faves.push({ recipeId, addedAt: Date.now() });
  faves.sort((a, b) => b.addedAt - a.addedAt);
  faves = faves.slice(0, MAX_FAVES);

  store.set(userId, faves);
  log(`Favourite added: ${recipeId} for ${userId} (${faves.length}/${MAX_FAVES})`, "fav");
  return faves;
}

export function removeFavourite(userId: string, recipeId: string): FavouriteEntry[] {
  const faves = store.get(userId) || [];
  const updated = faves.filter((f) => f.recipeId !== recipeId);
  store.set(userId, updated);
  log(`Favourite removed: ${recipeId} for ${userId} (${updated.length}/${MAX_FAVES})`, "fav");
  return updated;
}
