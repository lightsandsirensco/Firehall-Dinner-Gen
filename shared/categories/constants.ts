/**
 * Firehall Meals — 12 master editorial categories (platform taxonomy v1).
 */

export const MASTER_CATEGORY_SCHEMA_VERSION = 1 as const;

/** Stable ids — used in DB, CDN paths, recommendation indexes */
export const MASTER_CATEGORY_IDS = [
  "firehall_classics",
  "bbq_grill_nights",
  "quick_shift_meals",
  "comfort_food",
  "healthy_performance",
  "pizza_night",
  "big_crew_feeders",
  "breakfast_brunch",
  "global_flavors",
  "game_day_watch_party",
  "meal_prep_leftovers",
  "rookie_friendly",
] as const;

export type MasterCategoryId = (typeof MASTER_CATEGORY_IDS)[number];

/** Legacy explore pool tags — bridge only, not primary taxonomy */
export const LEGACY_EXPLORE_POOL_IDS = [
  "trending",
  "bbq",
  "comfort",
  "quick",
  "one_pot",
  "pasta",
  "hearty",
  "handheld",
  "chicken",
  "beef",
  "bowl",
  "slow",
  "healthy",
  "game_day",
  "breakfast",
] as const;

export type LegacyExplorePoolId = (typeof LEGACY_EXPLORE_POOL_IDS)[number];

/** Editorial section theme tokens (CSS / Explore) */
export const CATEGORY_THEME_TOKENS = [
  "ember",
  "smoke",
  "gold",
  "steel",
  "copper",
  "ocean",
  "midnight",
  "hearth",
] as const;

export type CategoryThemeToken = (typeof CATEGORY_THEME_TOKENS)[number];

export const SHIFT_CONTEXTS = [
  "post_call",
  "pre_shift",
  "slow_night",
  "busy_night",
  "training_day",
  "weekend_watch",
  "meal_prep_sunday",
] as const;

export type ShiftContext = (typeof SHIFT_CONTEXTS)[number];

export const CREW_DYNAMICS = [
  "solo_cook",
  "pair_cook",
  "full_hall",
  "large_batch",
  "rookie_led",
] as const;

export type CrewDynamic = (typeof CREW_DYNAMICS)[number];
