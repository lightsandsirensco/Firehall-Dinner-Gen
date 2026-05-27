/**
 * Personalization foundation — hooks only; no full personalization in Stage 4.
 */

import type { MasterCategoryId } from "../../../shared/categories/constants.js";

export interface TasteProfile {
  favoriteProteins: string[];
  favoriteCuisines: string[];
  savedRecipeIds: number[];
  comfortBias: number;
  performanceBias: number;
  repeatWindowDays: number;
}

export interface PersonalizationRequestHints {
  favoriteProteins?: string[];
  favoriteCuisines?: string[];
  savedIds?: number[];
  comfortBias?: number;
  performanceBias?: number;
}

const DEFAULT_PROFILE: TasteProfile = {
  favoriteProteins: [],
  favoriteCuisines: [],
  savedRecipeIds: [],
  comfortBias: 0.5,
  performanceBias: 0.5,
  repeatWindowDays: 14,
};

export function buildTasteProfile(hints: PersonalizationRequestHints = {}): TasteProfile {
  return {
    ...DEFAULT_PROFILE,
    favoriteProteins: hints.favoriteProteins ?? [],
    favoriteCuisines: hints.favoriteCuisines ?? [],
    savedRecipeIds: hints.savedIds ?? [],
    comfortBias: hints.comfortBias ?? DEFAULT_PROFILE.comfortBias,
    performanceBias: hints.performanceBias ?? DEFAULT_PROFILE.performanceBias,
  };
}

/** Future: boost saved / favored proteins — returns 0 today */
export function personalizationBoost(
  _profile: TasteProfile,
  _categoryId: MasterCategoryId,
  _protein: string,
): number {
  return 0;
}
