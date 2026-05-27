/**
 * Recommendation & discovery engine — shared types.
 */

import type { MasterCategoryId } from "../categories/constants.js";
import type { ExploreRecipeCard } from "../explore-recipe.js";

export type TimeOfDaySlot = "morning" | "afternoon" | "evening" | "late";
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RecommendationContext {
  /** UTC day bucket for rotation */
  daySeed: number;
  timeSlot: TimeOfDaySlot;
  dayOfWeek: DayOfWeek;
  crewSize?: number;
  maxReadyMinutes?: number;
  /** 0 = max comfort, 1 = max performance */
  performanceMode?: number;
  /** User / session seen recipe ids (anti-repeat) */
  seenRecipeIds: number[];
  /** Recent proteins to down-rank */
  recentProteins: string[];
  /** Category boosts from context */
  preferredCategories: MasterCategoryId[];
  /** Allergy / diet filters */
  diet?: string;
  intolerances?: string;
  excludeIngredients?: string;
  /** Future: weather hook */
  weatherHint?: "cold" | "hot" | "mild";
}

export interface RecommendationDimensionScores {
  appetiteAppeal: number;
  imageQuality: number;
  comfortScore: number;
  healthyScore: number;
  cleanupScore: number;
  hallSuitability: number;
  popularity: number;
  generationSuccess: number;
  freshness: number;
  realism: number;
  rookieFriendly: number;
  crewScaling: number;
  visualQuality: number;
  categoryAffinity: number;
  trendingBoost: number;
  trustScore: number;
}

export interface ScoredExploreCard {
  card: ExploreRecipeCard;
  compositeScore: number;
  dimensions: RecommendationDimensionScores;
  primaryCategoryId: MasterCategoryId;
  reasons: string[];
}

export interface RecommendationRailMeta {
  id: string;
  masterCategoryId: MasterCategoryId;
  displayName: string;
  tagline: string;
  firefighterHook: string;
  theme?: string;
  priority: number;
}

export interface ExploreFeedRecommendationMeta {
  engineVersion: number;
  daySeed: number;
  contextHints: string[];
  curatedPublished: number;
  curatedOnly: boolean;
  totalRecipes: number;
  sectionSources: Record<string, { curated: number; spoonacular: number; catalog: number; seed: number }>;
  railsBuilt: number;
}
