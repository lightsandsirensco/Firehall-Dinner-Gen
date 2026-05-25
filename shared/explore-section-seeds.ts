import { CLASSIC_HALL_MEALS, resolveClassicHeroImage } from "./classic-hall-meals.js";
import type { ExploreSectionDef } from "./explore-editorial.js";
import type { ExploreRecipeCard } from "./explore-recipe.js";
import { normalizeExploreRecipeCard } from "./explore-recipe.js";

/** Verified hall meals — always render with real CDN/local heroes (no live API required). */
export function buildSeededExploreCards(
  section: ExploreSectionDef,
  daySeed: number,
  limit: number,
): ExploreRecipeCard[] {
  const pool = [...CLASSIC_HALL_MEALS];
  if (pool.length === 0) return [];

  const hash = section.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const start = (daySeed + hash) % pool.length;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];

  const cards: ExploreRecipeCard[] = [];
  const seenIds = new Set<number>();
  const seenTitles = new Set<string>();

  for (const meal of rotated) {
    if (cards.length >= limit) break;
    const card = normalizeExploreRecipeCard(
      {
        id: meal.spoonacularRecipeId,
        title: meal.title,
        image: resolveClassicHeroImage(meal),
        imageAlt: meal.imageAlt,
        readyInMinutes: meal.exploreReadyMinutes ?? 45,
        servings: meal.exploreServings ?? 8,
        summary: meal.exploreSummary ?? meal.description,
        sourceUrl: meal.externalUrl || "",
        cuisines: meal.cuisine ? [meal.cuisine] : [],
        diets: [],
        _pool: section.poolTag,
        _curatedSlug: meal.slug,
        hookLine: meal.exploreHookLine ?? meal.tagline,
        primaryProtein: meal.protein,
        qualityScore: 72,
      },
      `seed-${section.id}`,
    );
    if (!card || seenIds.has(card.id)) continue;
    const titleKey = card.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
    if (seenTitles.has(titleKey)) continue;
    seenIds.add(card.id);
    seenTitles.add(titleKey);
    cards.push(card);
  }

  return cards;
}
