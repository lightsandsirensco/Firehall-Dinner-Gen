/**
 * Firehall Meals — generator category taxonomy (single source of truth).
 *
 * Product rule: UI labels, API payloads, DB keys, and pool validation all use these IDs.
 */
import type { MasterCategoryId } from "./categories/constants.js";

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

/** Map generator categories → master editorial taxonomy (Explore / catalog). */
export const FIREHALL_TO_MASTER_CATEGORY: Record<FirehallCategoryId, MasterCategoryId[]> = {
  crew_favorites: ["firehall_classics"],
  quick_meals: ["quick_shift_meals", "rookie_friendly"],
  comfort_food: ["comfort_food"],
  high_protein: ["healthy_performance"],
  bbq_smoker: ["bbq_grill_nights"],
  healthy_options: ["healthy_performance"],
  easy_cleanup: ["rookie_friendly", "meal_prep_leftovers"],
  feed_a_crowd: ["big_crew_feeders"],
  game_day: ["game_day_watch_party", "bbq_grill_nights"],
};

export interface FirehallCategoryRule {
  /** Max total minutes for quick shift filtering (when > 0). */
  maxMinutes?: number;
  /** Prefer Performance 50 catalog entries. */
  preferPerformance?: boolean;
  /** Exclude breakfast-format meals from dinner generator. */
  excludeBreakfast?: boolean;
}

export const FIREHALL_CATEGORY_RULES: Record<FirehallCategoryId, FirehallCategoryRule> = {
  crew_favorites: { excludeBreakfast: true },
  quick_meals: { maxMinutes: 40, excludeBreakfast: true },
  comfort_food: { excludeBreakfast: true },
  high_protein: { preferPerformance: true, excludeBreakfast: true },
  bbq_smoker: { excludeBreakfast: true },
  healthy_options: { preferPerformance: true, excludeBreakfast: true },
  easy_cleanup: { excludeBreakfast: true },
  feed_a_crowd: { excludeBreakfast: true },
  game_day: { excludeBreakfast: true },
};

/**
 * Category keys stored in curated DB `curated_recipe_categories.category_key`.
 * Supporting tags use `fh_tag:<id>` and `fh_primary:<id>` in curated_recipe_tags.
 */
export function firehallCategoryKey(id: FirehallCategoryId): string {
  return `fh:${id}`;
}

export function firehallCategoryTagKey(id: FirehallCategoryId): string {
  return `fh_tag:${id}`;
}

export function firehallCategoryPrimaryTagKey(id: FirehallCategoryId): string {
  return `fh_primary:${id}`;
}

/** Whether DB category keys assign this recipe to the requested generator category. */
export function slugMatchesFirehallCategory(
  categoryKeys: readonly string[],
  categoryId: FirehallCategoryId,
): boolean {
  const normalized = new Set(categoryKeys.map((k) => k.trim().toLowerCase()));
  const primary = firehallCategoryKey(categoryId).toLowerCase();
  const tag = firehallCategoryTagKey(categoryId).toLowerCase();
  const primaryTag = firehallCategoryPrimaryTagKey(categoryId).toLowerCase();
  return normalized.has(primary) || normalized.has(tag) || normalized.has(primaryTag);
}

export function isFirehallCategoryId(value: string): value is FirehallCategoryId {
  return (FIREHALL_CATEGORY_IDS as readonly string[]).includes(value);
}

/** Legacy explore / saved-filter aliases → generator category ids. */
const FIREHALL_CATEGORY_ALIASES: Record<string, FirehallCategoryId | undefined> = {
  all: undefined,
  healthy: "healthy_options",
  bbq_grill: "bbq_smoker",
  bbq: "bbq_smoker",
  quick: "quick_meals",
  comfort: "comfort_food",
};

/** Normalize client firehall_category before Zod — drops invalid values. */
export function normalizeGenerateFirehallCategory(value: unknown): FirehallCategoryId | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === "all") return undefined;
  if (isFirehallCategoryId(trimmed)) return trimmed;
  const mapped = FIREHALL_CATEGORY_ALIASES[trimmed];
  if (mapped) return mapped;
  return undefined;
}

/** Reject invalid legacy assignment keys (e.g. fh:breakfast). */
export function isValidFirehallCategoryDbKey(key: string): boolean {
  if (!key.startsWith("fh:")) return true;
  const id = key.slice(3);
  return isFirehallCategoryId(id);
}
