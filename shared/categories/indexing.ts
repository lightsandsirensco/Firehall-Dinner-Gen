/**
 * Recommendation-ready indexing — vectors + category score maps.
 */

import type { MasterCategoryId } from "./constants.js";
import { MASTER_CATEGORY_IDS } from "./constants.js";
import { MASTER_CATEGORIES_BY_ID } from "./definitions.js";
import type { RecommendationIndexEntry } from "./schema.js";
import { recommendationIndexEntrySchema } from "./schema.js";
import {
  rankCategoriesForRecipe,
  type CategoryScoreInput,
} from "./scoring.js";
import { assignMasterCategories, type AssignRecipeInput } from "./assignment.js";

/** Normalized 12-dim vector from category scores (0–1 per master category, fixed order) */
export function buildRecommendationVector(
  categoryScores: Record<string, number>,
): number[] {
  return MASTER_CATEGORY_IDS.map((id) => {
    const raw = categoryScores[id] ?? 0;
    return Math.round((raw / 100) * 1000) / 1000;
  });
}

export function buildRecommendationIndexEntry(
  input: AssignRecipeInput,
): RecommendationIndexEntry {
  const classification = assignMasterCategories(input);
  const categoryScores: Record<MasterCategoryId, number> = {} as Record<
    MasterCategoryId,
    number
  >;
  for (const s of classification.scores) {
    categoryScores[s.categoryId] = s.score;
  }

  const entry = {
    recipeKey: input.recipeKey,
    categoryScores,
    primaryCategoryId: classification.primary,
    vector: buildRecommendationVector(categoryScores),
    indexedAt: new Date().toISOString(),
  };

  return recommendationIndexEntrySchema.parse(entry);
}

/** Future ML hook — stub personalizes vector with user prefs */
export function personalizeVector(
  baseVector: number[],
  prefs: Partial<{
    shiftUrgency: number;
    crewScale: number;
    comfortSeeking: number;
    performanceFocus: number;
  }> = {},
): number[] {
  if (Object.keys(prefs).length === 0) return baseVector;
  return baseVector.map((v, i) => {
    const catId = MASTER_CATEGORY_IDS[i];
    const def = MASTER_CATEGORIES_BY_ID[catId];
    if (!def) return v;
    let boost = 0;
    if (prefs.shiftUrgency != null) {
      boost += def.recommendation.shiftUrgency * prefs.shiftUrgency * 0.15;
    }
    if (prefs.crewScale != null) {
      boost += def.recommendation.crewScale * prefs.crewScale * 0.15;
    }
    if (prefs.comfortSeeking != null) {
      boost += def.recommendation.comfortSeeking * prefs.comfortSeeking * 0.15;
    }
    if (prefs.performanceFocus != null) {
      boost += def.recommendation.performanceFocus * prefs.performanceFocus * 0.15;
    }
    return Math.min(1, v + boost);
  });
}

export function indexRecipeForRecommendations(
  input: CategoryScoreInput & { recipeKey: string },
): RecommendationIndexEntry {
  return buildRecommendationIndexEntry(input);
}
