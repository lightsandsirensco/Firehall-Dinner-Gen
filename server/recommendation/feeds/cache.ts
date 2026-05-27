/**
 * Precomputed Explore feed cache — 10 minute TTL.
 */

import type { ExploreEditorialSection } from "../../../shared/explore-editorial.js";
import { countPublishedCuratedRecipes } from "../../curated-recipe-store.js";
import type { ExploreFeedSafetyFilters } from "../../explore-editorial.js";
import { editorialDaySeed } from "../../../shared/explore-editorial.js";

const feedCache = new Map<string, { at: number; sections: ExploreEditorialSection[] }>();
export const FEED_CACHE_TTL_MS = 10 * 60 * 1000;

export function exploreFeedCacheKey(
  safety: ExploreFeedSafetyFilters,
  daySeed: number,
  seenFingerprint: string,
): string {
  const published = countPublishedCuratedRecipes();
  return `v1:${daySeed}:pub${published}:${safety.diet || ""}:${safety.intolerances || ""}:${safety.excludeIngredients || ""}:${seenFingerprint}`;
}

export function getCachedExploreFeed(key: string): ExploreEditorialSection[] | null {
  const cached = feedCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.at >= FEED_CACHE_TTL_MS) {
    feedCache.delete(key);
    return null;
  }
  return cached.sections;
}

export function setCachedExploreFeed(key: string, sections: ExploreEditorialSection[]): void {
  feedCache.set(key, { at: Date.now(), sections });
}

export function currentDaySeed(): number {
  return editorialDaySeed();
}
