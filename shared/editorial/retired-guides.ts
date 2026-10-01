/**
 * Guides retired in the Phase 2 guide consolidation. Each entry either 301s
 * straight to the live guide that absorbed its useful content, or (target
 * `null`) returns 410 Gone because the topic has no cooking equivalent on
 * the site. Targets must be live guide slugs, never another retired slug,
 * so no redirect chain can form (enforced by `assertRetiredGuideMap`).
 */

export interface RetiredGuide {
  /** Live guide slug that absorbed this page, or null for 410 Gone. */
  target: string | null;
  reason: "consolidated" | "off_topic";
}

export const RETIRED_GUIDES: Readonly<Record<string, RetiredGuide>> = {
  // Crew-size duplicates of the quantities/pans/timing guide.
  "meals-feeding-10-firefighters": { target: "cooking-for-10-firefighters", reason: "consolidated" },
  "feeding-ten-firefighters": { target: "cooking-for-10-firefighters", reason: "consolidated" },

  // "What do firefighters cook" listicles.
  "legendary-firehall-meals": { target: "most-popular-firefighter-meals", reason: "consolidated" },
  "meals-every-firefighter-knows": { target: "most-popular-firefighter-meals", reason: "consolidated" },
  "meals-firefighters-actually-cook": { target: "most-popular-firefighter-meals", reason: "consolidated" },
  "25-firefighter-dinner-ideas": { target: "most-popular-firefighter-meals", reason: "consolidated" },

  // Post-call / comfort food.
  "comfort-food-after-a-long-shift": { target: "firehouse-comfort-meals", reason: "consolidated" },
  "best-meals-after-busy-shift": { target: "firehouse-comfort-meals", reason: "consolidated" },
  "recovery-meals-after-hard-calls": { target: "firehouse-comfort-meals", reason: "consolidated" },
  "eating-during-high-stress-shifts": { target: "firehouse-comfort-meals", reason: "off_topic" },

  // Kitchen culture and dinner organisation.
  "better-station-food-culture": { target: "firehall-kitchen-culture", reason: "consolidated" },
  "organize-firehall-dinners": { target: "planning-tonights-station-dinner", reason: "consolidated" },
  "avoid-living-on-takeout": { target: "planning-tonights-station-dinner", reason: "consolidated" },
  "busy-shift-dinner-strategies": { target: "feeding-a-firehall-crew", reason: "consolidated" },
  "how-crews-split-groceries": { target: "firehall-grocery-planning", reason: "consolidated" },
  "best-firehall-meals-busy-nights": { target: "feeding-a-firehall-crew", reason: "consolidated" },
  "quick-meals-between-calls": { target: "fast-firehall-meals-under-30-minutes", reason: "consolidated" },
  "meal-prep-for-shift-workers": { target: "firehall-meal-prep-ideas", reason: "consolidated" },
  "dutch-oven-meals-firefighters": { target: "one-pot-firehall-meals", reason: "consolidated" },

  // Duplicate breakfast and 24-hour-shift pages.
  "firehall-breakfast-and-brunch": { target: "firefighter-breakfast-guide", reason: "consolidated" },
  "firefighter-breakfast-ideas": { target: "firefighter-breakfast-guide", reason: "consolidated" },
  "eating-well-on-24-hour-shifts": { target: "best-meals-24-hour-shift", reason: "consolidated" },
  "nutrition-after-overnight-calls": { target: "best-meals-24-hour-shift", reason: "consolidated" },
  "best-foods-for-long-shifts": { target: "best-meals-24-hour-shift", reason: "off_topic" },

  // Nutrition and wellness pages reduced to the cooking-related keepers.
  "healthy-meals-for-active-crews": { target: "healthy-meals-that-still-taste-good", reason: "consolidated" },
  "healthy-firefighter-meals-fill-you-up": { target: "healthy-meals-that-still-taste-good", reason: "consolidated" },
  "meals-wont-wreck-energy-levels": { target: "healthy-meals-that-still-taste-good", reason: "off_topic" },
  "performance-nutrition-firefighters": { target: "high-protein-firehall-meals", reason: "off_topic" },
  "firefighter-recovery-nutrition": { target: "high-protein-firehall-meals", reason: "off_topic" },
  "hydration-for-firefighters": { target: null, reason: "off_topic" },
};

export function getRetiredGuide(slug: string): RetiredGuide | undefined {
  return Object.prototype.hasOwnProperty.call(RETIRED_GUIDES, slug) ? RETIRED_GUIDES[slug] : undefined;
}

export function isRetiredGuideSlug(slug: string): boolean {
  return getRetiredGuide(slug) !== undefined;
}

/** Throws if any target is itself retired or is not a live guide slug. */
export function assertRetiredGuideMap(liveSlugs: Iterable<string>): void {
  const live = new Set(liveSlugs);
  for (const [slug, { target }] of Object.entries(RETIRED_GUIDES)) {
    if (live.has(slug)) throw new Error(`[retired-guides] "${slug}" is retired but still published`);
    if (target === null) continue;
    if (RETIRED_GUIDES[target]) throw new Error(`[retired-guides] "${slug}" → "${target}" would chain`);
    if (!live.has(target)) throw new Error(`[retired-guides] "${slug}" → "${target}" is not a live guide`);
  }
}
