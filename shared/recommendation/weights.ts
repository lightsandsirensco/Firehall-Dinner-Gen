/**
 * Composite recommendation weights — tune discovery ranking here.
 */

export const RECOMMENDATION_ENGINE_VERSION = 1 as const;

/** Dimension contribution to composite (must sum ~1.0) */
export const EXPLORE_COMPOSITE_WEIGHTS = {
  appetiteAppeal: 0.14,
  imageQuality: 0.12,
  visualQuality: 0.08,
  comfortScore: 0.06,
  healthyScore: 0.04,
  cleanupScore: 0.04,
  hallSuitability: 0.1,
  popularity: 0.08,
  trendingBoost: 0.07,
  freshness: 0.06,
  realism: 0.08,
  rookieFriendly: 0.04,
  crewScaling: 0.05,
  categoryAffinity: 0.1,
  trustScore: 0.08,
  generationSuccess: 0.06,
} as const;

export const MIN_EXPLORE_COMPOSITE = 42;
export const MIN_PUBLISHER_IMAGE_BOOST = 8;

/** Context category boost when meal matches shift context */
export const CONTEXT_CATEGORY_BOOST = 18;

/** Penalties */
export const PENALTY_SEEN_RECIPE = 35;
export const PENALTY_REPEAT_PROTEIN = 14;
export const PENALTY_DUPLICATE_IMAGE_HOST = 8;
export const PENALTY_LOW_QUALITY_TITLE = 40;
