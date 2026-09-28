/**
 * Slug → real published catalog metadata (cuisine/protein/cookTime),
 * memoized in-process. Reuses the existing merged hall catalog index
 * (Golden 100 + Performance Meals + Hall Expansion) — no new catalog data,
 * no invented metadata.
 */
import { loadMergedHallCatalogIndex } from "../meal-catalog/load-index.js";

export interface RecipeMeta {
  cuisine: string | null;
  protein: string | null;
  cookTimeMin: number | null;
}

let cache: Map<string, RecipeMeta> | null = null;

function buildCache(): Map<string, RecipeMeta> {
  const index = loadMergedHallCatalogIndex();
  const map = new Map<string, RecipeMeta>();
  for (const r of index.recipes) {
    map.set(r.slug, {
      cuisine: r.cuisine?.trim() ? r.cuisine.trim().toLowerCase() : null,
      protein: r.protein?.trim() ? r.protein.trim().toLowerCase() : null,
      cookTimeMin: typeof r.cookTime === "number" && r.cookTime > 0 ? r.cookTime : null,
    });
  }
  return map;
}

export function getRecipeMeta(slug: string): RecipeMeta {
  if (!cache) cache = buildCache();
  return cache.get(slug) ?? { cuisine: null, protein: null, cookTimeMin: null };
}
