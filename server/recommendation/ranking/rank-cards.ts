/**
 * Rail-level ranking — wraps scorer + diversity + rotation.
 */

import type { MasterCategoryId } from "../../../shared/categories/constants.js";
import type { ExploreSectionDef } from "../../../shared/explore-editorial.js";
import type { ExploreRecipeCard } from "../../../shared/explore-recipe.js";
import type { RecommendationContext } from "../../../shared/recommendation/types.js";
import { scoreExploreCardForRecommendation } from "../scoring/recipe-scorer.js";
import { FeedRotationMemory } from "../rotation/memory.js";
import { rankScoredCardsForRail, cardsFromScored } from "../rotation/diversity.js";

export function rankExploreCardsForRail(
  cards: ExploreRecipeCard[],
  section: ExploreSectionDef,
  ctx: RecommendationContext,
  rotation: FeedRotationMemory,
): ExploreRecipeCard[] {
  const masterCategoryId = section.id as MasterCategoryId;
  const scored = cards.map((card) =>
    scoreExploreCardForRecommendation(
      card,
      masterCategoryId,
      ctx,
      section.appetiteBoost ?? 0,
      rotation.feedProteins,
    ),
  );

  const ranked = rankScoredCardsForRail(scored, rotation.feedImageHosts);
  const sequenced = cardsFromScored(ranked, ctx.daySeed + section.priority);
  const deduped = rotation.dedupe(sequenced);
  rotation.recordCards(deduped);
  return deduped;
}
