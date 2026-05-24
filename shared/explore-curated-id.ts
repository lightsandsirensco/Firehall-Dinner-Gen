/**
 * Stable positive Explore card ids for publisher/curated recipes (non-Spoonacular).
 * Range 900_000_000–998_999_999 avoids collision with Spoonacular ids.
 */

const BASE = 900_000_000;
const SPAN = 99_000_000;

export function exploreIdFromRecipeId(recipeId: string): number {
  let h = 0;
  for (let i = 0; i < recipeId.length; i++) {
    h = (Math.imul(31, h) + recipeId.charCodeAt(i)) | 0;
  }
  return BASE + (Math.abs(h) % SPAN);
}

export function isSyntheticExploreId(id: number): boolean {
  return id >= BASE && id < BASE + SPAN;
}
