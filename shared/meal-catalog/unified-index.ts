/**
 * Hall dinner catalog — Golden 100 + Performance Meals in one feed.
 * Smoothies / fuel drinks stay in the separate fuel catalog.
 */

import type { GoldenCatalogIndex, GoldenCatalogIndexEntry } from "../golden-100/recipe-page-schema.js";

export const HALL_CATALOG_RECIPE_COUNT = 198 as const;

export function performanceEntryToCatalogIndex(entry: {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  cuisine: string;
  protein: string;
  mealFormat: string;
  cookTime: number;
  difficulty: "easy" | "medium" | "hard";
  heroImage: string;
  thumbImage: string;
  tags: string[];
  firefighterScore: number;
  popularityWeight: number;
  searchTerms: string[];
}): GoldenCatalogIndexEntry {
  return {
    slug: entry.slug,
    title: entry.title,
    subtitle: entry.subtitle,
    category: entry.category,
    cuisine: entry.cuisine,
    protein: entry.protein,
    mealFormat: entry.mealFormat,
    cookTime: entry.cookTime,
    difficulty: entry.difficulty,
    heroImage: entry.heroImage,
    thumbImage: entry.thumbImage,
    tags: entry.tags,
    firefighterScore: entry.firefighterScore,
    popularityWeight: entry.popularityWeight,
    searchTerms: entry.searchTerms,
  };
}

/** Merge Golden + Performance + Hall Expansion; first catalog wins on slug collision. */
export function mergeHallCatalogIndexes(
  golden: GoldenCatalogIndex,
  performance: GoldenCatalogIndex | null | undefined,
  expansion?: GoldenCatalogIndex | null,
): GoldenCatalogIndex {
  const bySlug = new Map<string, GoldenCatalogIndexEntry>();
  for (const r of golden.recipes) {
    bySlug.set(r.slug, r);
  }
  for (const r of performance?.recipes ?? []) {
    if (!bySlug.has(r.slug)) {
      bySlug.set(r.slug, r);
    }
  }
  for (const r of expansion?.recipes ?? []) {
    if (!bySlug.has(r.slug)) {
      bySlug.set(r.slug, r);
    }
  }
  const recipes = [...bySlug.values()].sort((a, b) => a.title.localeCompare(b.title));
  return {
    version: Math.max(golden.version, performance?.version ?? 1, expansion?.version ?? 1),
    contentVersion: Math.max(
      golden.contentVersion,
      performance?.contentVersion ?? 1,
      expansion?.contentVersion ?? 1,
    ),
    generatedAt: new Date().toISOString(),
    recipeCount: recipes.length,
    recipes,
  };
}
