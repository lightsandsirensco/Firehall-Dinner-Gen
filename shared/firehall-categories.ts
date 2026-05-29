/**
 * Firehall Meals — practical browsing categories (mobile-first).
 *
 * Product rule: These are the PRIMARY navigation categories (not cuisines/diets).
 */
export const FIREHALL_CATEGORY_IDS = [
  "crew_favorites",
  "quick_meals",
  "comfort_food",
  "high_protein",
  "bbq_smoker",
  "healthy_options",
  "easy_cleanup",
  "feed_a_crowd",
  "game_day",
] as const;

export type FirehallCategoryId = (typeof FIREHALL_CATEGORY_IDS)[number];

export const FIREHALL_CATEGORY_LABEL: Record<FirehallCategoryId, string> = {
  crew_favorites: "Crew Favorites",
  quick_meals: "Quick Meals",
  comfort_food: "Comfort Food",
  high_protein: "High Protein",
  bbq_smoker: "BBQ & Smoker",
  healthy_options: "Healthy Options",
  easy_cleanup: "Easy Cleanup",
  feed_a_crowd: "Feed a Crowd",
  game_day: "Game Day",
};

/**
 * Category keys stored in curated DB `curated_recipe_categories.category_key`.
 * Keep this stable — server and client both rely on it.
 */
export function firehallCategoryKey(id: FirehallCategoryId): string {
  return `fh:${id}`;
}

