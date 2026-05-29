/**
 * Hall catalog search for Explore / filter endpoints (Golden 100 + Performance 50).
 */

import { exploreIdFromRecipeId } from "../../shared/explore-curated-id.js";
import {
  normalizeExploreRecipeCard,
  type ExploreRecipeCard,
} from "../../shared/explore-recipe.js";
import {
  resolvePrimaryCatalogBadge,
  searchHallCatalog,
} from "../../shared/hall-catalog/gate.js";
import { getCuratedRecipeBySlug } from "../curated-recipe-store.js";

export function hallCatalogExploreCards(query: string, limit: number): ExploreRecipeCard[] {
  const hits = searchHallCatalog(query, limit);
  const cards: ExploreRecipeCard[] = [];

  for (const hit of hits) {
    const curated = getCuratedRecipeBySlug(hit.slug);
    const card = normalizeExploreRecipeCard(
      {
        id: exploreIdFromRecipeId(curated?.recipeId || hit.slug),
        title: hit.title,
        image: hit.heroImage,
        imageAlt: hit.title,
        readyInMinutes: curated?.totalMinutes || 45,
        servings: curated?.servingsBase || 6,
        summary: curated?.summary || `${hit.title} — from the Firehall Meals catalog.`,
        sourceUrl: curated?.source?.url || "",
        cuisines: hit.cuisine ? [hit.cuisine] : [],
        diets: [],
        _curatedSlug: hit.slug,
        fromCuratedDb: true,
        curatedRecipeId: curated?.recipeId,
        publisherMedia: true,
        primaryProtein: hit.protein,
        catalogBadge: resolvePrimaryCatalogBadge(hit.slug),
      },
      "hall_catalog",
    );
    if (card) cards.push(card);
  }

  return cards;
}

/** @deprecated Use hallCatalogExploreCards */
export function goldenCatalogExploreCards(query: string, limit: number): ExploreRecipeCard[] {
  return hallCatalogExploreCards(query, limit);
}
