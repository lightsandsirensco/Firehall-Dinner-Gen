/**
 * Bridge master categories ↔ legacy Explore sections / pool tags.
 */

import type { ExploreSectionDef } from "../explore-editorial.js";
import { EXPLORE_DISCOVERY_SECTIONS } from "../explore-discovery-catalog.js";
import type { MasterCategoryId } from "./constants.js";
import { MASTER_CATEGORIES_BY_ID } from "./definitions.js";

/** Explore section id → primary master category */
export const EXPLORE_SECTION_MASTER_CATEGORY: Record<string, MasterCategoryId> = {
  trending_tonight: "firehall_classics",
  bbq_grill: "bbq_grill_nights",
  comfort_food: "comfort_food",
  fast_30: "quick_shift_meals",
  hearty_soups: "comfort_food",
  healthy_good: "healthy_performance",
  chicken_dinners: "quick_shift_meals",
  beef_dinners: "big_crew_feeders",
  pasta_night: "global_flavors",
  handhelds: "game_day_watch_party",
  breakfast_dinner: "breakfast_brunch",
  slow_cooker: "meal_prep_leftovers",
  one_pot: "rookie_friendly",
  bowls_rice: "healthy_performance",
};

/** Legacy pool tag → best master category */
export const LEGACY_POOL_TO_MASTER: Record<string, MasterCategoryId> = {
  trending: "firehall_classics",
  bbq: "bbq_grill_nights",
  comfort: "comfort_food",
  quick: "quick_shift_meals",
  one_pot: "rookie_friendly",
  pasta: "global_flavors",
  hearty: "comfort_food",
  handheld: "game_day_watch_party",
  chicken: "quick_shift_meals",
  beef: "big_crew_feeders",
  bowl: "healthy_performance",
  slow: "meal_prep_leftovers",
  healthy: "healthy_performance",
  game_day: "game_day_watch_party",
  breakfast: "breakfast_brunch",
};

export function masterCategoryForExploreSection(sectionId: string): MasterCategoryId {
  return EXPLORE_SECTION_MASTER_CATEGORY[sectionId] || "firehall_classics";
}

export function masterCategoryForLegacyPool(poolTag: string): MasterCategoryId {
  return LEGACY_POOL_TO_MASTER[poolTag] || "firehall_classics";
}

export interface ExploreSectionWithMasterCategory extends ExploreSectionDef {
  masterCategoryId: MasterCategoryId;
  masterCategoryDisplayName: string;
}

export function enrichExploreSectionWithMasterCategory(
  section: ExploreSectionDef,
): ExploreSectionWithMasterCategory {
  const masterCategoryId =
    EXPLORE_SECTION_MASTER_CATEGORY[section.id] ||
    masterCategoryForLegacyPool(section.poolTag);
  const def = MASTER_CATEGORIES_BY_ID[masterCategoryId];
  return {
    ...section,
    masterCategoryId,
    masterCategoryDisplayName: def?.displayName || section.title,
  };
}

export function getDiscoverySectionsWithMasterCategories(): ExploreSectionWithMasterCategory[] {
  return EXPLORE_DISCOVERY_SECTIONS.map(enrichExploreSectionWithMasterCategory);
}
