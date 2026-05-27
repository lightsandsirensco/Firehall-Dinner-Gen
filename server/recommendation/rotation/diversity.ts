/**
 * Display sequencing — protein and image-host diversity within a rail.
 */

import { sequenceExploreCardsForDisplay } from "../../../shared/recipe-ranking.js";
import type { ExploreRecipeCard } from "../../../shared/explore-recipe.js";
import type { ScoredExploreCard } from "../../../shared/recommendation/types.js";
import { isPublishableExploreScore } from "../scoring/recipe-scorer.js";
import { PENALTY_DUPLICATE_IMAGE_HOST } from "../../../shared/recommendation/weights.js";

function imageHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Sort by composite, filter weak cards, apply diversity penalties */
export function rankScoredCardsForRail(
  scored: ScoredExploreCard[],
  feedImageHosts?: Set<string>,
): ScoredExploreCard[] {
  const adjusted = scored.map((s) => {
    let composite = s.compositeScore;
    const host = imageHost(s.card.image);
    if (host && feedImageHosts?.has(host)) {
      composite -= PENALTY_DUPLICATE_IMAGE_HOST;
    }
    return { ...s, compositeScore: composite };
  });

  return adjusted
    .filter((s) => isPublishableExploreScore(s.compositeScore))
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

export function cardsFromScored(
  scored: ScoredExploreCard[],
  daySeed: number,
): ExploreRecipeCard[] {
  const cards = scored.map((s) => s.card);
  return sequenceExploreCardsForDisplay(cards, daySeed);
}
