/**
 * Contextual category suggestions API payload.
 */

import { MASTER_CATEGORIES_BY_ID } from "../../../shared/categories/definitions.js";
import { scoreRecipeForCategory } from "../../../shared/categories/scoring.js";
import type { MasterCategoryId } from "../../../shared/categories/constants.js";
import { RECOMMENDATION_ENGINE_VERSION } from "../../../shared/recommendation/weights.js";
import { buildRecommendationContext, contextHintsForDisplay } from "./build-context.js";
import type { BuildRecommendationContextInput } from "./build-context.js";

export interface ContextualSuggestion {
  categoryId: MasterCategoryId;
  displayName: string;
  reason: string;
  score: number;
}

export function buildContextualSuggestions(
  input: BuildRecommendationContextInput = {},
): {
  engineVersion: number;
  timeSlot: string;
  suggestions: ContextualSuggestion[];
  hooks: string[];
} {
  const ctx = buildRecommendationContext(input);
  const suggestions: ContextualSuggestion[] = [];

  for (const catId of ctx.preferredCategories) {
    const def = MASTER_CATEGORIES_BY_ID[catId];
    if (!def) continue;
    const affinity = scoreRecipeForCategory(catId, {
      title: def.displayName,
      summary: def.tagline,
      totalMinutes: ctx.maxReadyMinutes,
      crewSize: ctx.crewSize,
    });
    suggestions.push({
      categoryId: catId,
      displayName: def.displayName,
      reason: def.emotional.firefighterHook,
      score: affinity.score,
    });
  }

  if (suggestions.length === 0) {
    const fallback: MasterCategoryId = "firehall_classics";
    const def = MASTER_CATEGORIES_BY_ID[fallback]!;
    suggestions.push({
      categoryId: fallback,
      displayName: def.displayName,
      reason: def.emotional.firefighterHook,
      score: 75,
    });
  }

  return {
    engineVersion: RECOMMENDATION_ENGINE_VERSION,
    timeSlot: ctx.timeSlot,
    suggestions: suggestions.slice(0, 6),
    hooks: contextHintsForDisplay(ctx),
  };
}
