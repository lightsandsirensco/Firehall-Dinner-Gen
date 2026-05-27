/**
 * Twelve master-category Explore rails — editorial, emotionally distinct.
 */

import { MASTER_CATEGORY_IDS, type MasterCategoryId } from "../../../shared/categories/constants.js";
import { MASTER_CATEGORIES_BY_ID } from "../../../shared/categories/definitions.js";
import { EXPLORE_DISCOVERY_SECTIONS } from "../../../shared/explore-discovery-catalog.js";
import type { ExploreSectionDef, ExploreSectionTheme } from "../../../shared/explore-editorial.js";
import type { RecommendationRailMeta } from "../../../shared/recommendation/types.js";

/** Existing discovery section to source queries / pool for each master category */
const MASTER_SOURCE_SECTION: Partial<Record<MasterCategoryId, string>> = {
  firehall_classics: "trending_tonight",
  bbq_grill_nights: "bbq_grill",
  quick_shift_meals: "fast_30",
  comfort_food: "comfort_food",
  healthy_performance: "healthy_good",
  big_crew_feeders: "beef_dinners",
  breakfast_brunch: "breakfast_dinner",
  game_day_watch_party: "handhelds",
  meal_prep_leftovers: "slow_cooker",
  rookie_friendly: "one_pot",
};

const CUSTOM_MASTER_SECTIONS: Partial<Record<MasterCategoryId, ExploreSectionDef>> = {
  pizza_night: {
    id: "pizza_night",
    title: "Pizza Night",
    subtitle: "Hall table pizza — not delivery boxes",
    layout: "rail",
    priority: 85,
    poolTag: "handheld",
    theme: "ember",
    appetiteBoost: 9,
    queries: [
      { q: "homemade pepperoni pizza" },
      { q: "sheet pan pizza dinner" },
      { q: "cast iron pizza" },
      { q: "margherita pizza dinner" },
    ],
    limit: 6,
  },
  global_flavors: {
    id: "global_flavors",
    title: "Global Flavors",
    subtitle: "World plates that still work on a hall night",
    layout: "rail",
    priority: 72,
    poolTag: "pasta",
    theme: "ocean",
    appetiteBoost: 6,
    queries: [
      { q: "thai chicken dinner" },
      { q: "korean beef bowl dinner" },
      { q: "mexican street tacos dinner" },
      { q: "indian butter chicken dinner" },
    ],
    limit: 6,
  },
};

function themeForCategory(id: MasterCategoryId): ExploreSectionTheme | undefined {
  const token = MASTER_CATEGORIES_BY_ID[id]?.visual.themeToken;
  const allowed: ExploreSectionTheme[] = ["ember", "smoke", "gold", "steel", "copper", "ocean"];
  if (token && (allowed as string[]).includes(token)) return token as ExploreSectionTheme;
  return "ember";
}

/** One editorial rail per master category, ordered by feed priority */
export function getMasterCategoryRailSections(): ExploreSectionDef[] {
  const rails: ExploreSectionDef[] = [];

  for (const masterId of MASTER_CATEGORY_IDS) {
    const cat = MASTER_CATEGORIES_BY_ID[masterId];
    if (!cat) continue;

    const custom = CUSTOM_MASTER_SECTIONS[masterId];
    const sourceId = MASTER_SOURCE_SECTION[masterId];
    const base =
      custom ||
      (sourceId ? EXPLORE_DISCOVERY_SECTIONS.find((s) => s.id === sourceId) : undefined);

    if (!base) continue;

    rails.push({
      ...base,
      id: masterId,
      title: cat.displayName,
      subtitle: cat.tagline,
      priority: cat.feedPriority,
      appetiteBoost: cat.recommendation.appetiteBoost,
      theme: themeForCategory(masterId) ?? base.theme,
      poolTag: cat.legacyExplorePools?.[0] || base.poolTag,
      layout: "rail",
      limit: base.limit || 6,
    });
  }

  return rails.sort((a, b) => b.priority - a.priority);
}

export function getMasterCategoryRailMeta(): RecommendationRailMeta[] {
  return getMasterCategoryRailSections().map((section) => {
    const cat = MASTER_CATEGORIES_BY_ID[section.id as MasterCategoryId];
    return {
      id: section.id,
      masterCategoryId: section.id as MasterCategoryId,
      displayName: section.title,
      tagline: section.subtitle,
      firefighterHook: cat?.emotional.firefighterHook || section.subtitle,
      theme: section.theme,
      priority: section.priority,
    };
  });
}
