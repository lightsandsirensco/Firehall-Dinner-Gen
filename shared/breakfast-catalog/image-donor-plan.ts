/**
 * Breakfast image donor plan — meal accuracy over uniqueness.
 * Multiple breakfast recipes MAY share the same accurate donor hero.
 * Do not assign random unique donors; every mapping must pass the firefighter glance test.
 */
export const BREAKFAST_CANONICAL_UNIQUE_SLUGS = new Set([
  /** Verified accurate self heroes — never overwrite with a donor copy. */
  "bacon-egg-hash-skillet",
  "chorizo-breakfast-hash",
  "cowboy-breakfast-skillet",
  "cast-iron-breakfast-skillet",
  "breakfast-crunchwraps",
  "breakfast-enchiladas",
  "breakfast-nachos-supreme",
  "breakfast-poutine",
  "breakfast-quesadillas",
  "breakfast-sliders",
  "fire-captain-omelette-bar",
  "firehall-breakfast-pizza",
  "hall-breakfast-wraps",
  "maple-sausage-pinwheels",
  "monte-cristo-sandwiches",
  "overnight-french-toast-bake",
  "protein-french-toast",
  "sheet-pan-breakfast-sandwiches",
  "firefighter-red-lead-recipe",
  "quick-egg-tacos",
  "high-protein-parfaits",
  "ham-cheddar-egg-bake",
  "southwest-egg-bake",
  "chorizo-breakfast-burritos",
  "bacon-hash-burritos",
  "veggie-egg-burritos",
  /** Batch-25 trusted classics — unique generated heroes only. */
  "huevos-rancheros-crew",
  "eggs-benedict-hall-style",
  "corned-beef-hash-breakfast",
  "chicken-and-waffles-crew",
  "chilaquiles-verde-bake",
  "shrimp-and-grits-breakfast",
  "country-fried-steak-eggs",
  "green-chile-breakfast-burritos",
  "migas-for-the-crew",
  "breakfast-fried-rice-crew",
  "belgian-waffle-platter",
  "farmers-breakfast-casserole",
  "tater-tot-breakfast-casserole",
  "smoked-salmon-benedit",
  "bagel-lox-breakfast-board",
  "irish-breakfast-fry-up",
  "sheet-pan-full-english",
  "german-potato-breakfast-skillet",
  "breakfast-stromboli-roll",
  "scrapple-and-eggs-skillet",
  "club-sandwich-breakfast-bake",
  "johnnycakes-with-syrup",
  "overnight-sausage-strata",
  "biscuit-french-toast-sliders",
  "lumberjack-breakfast-platter",
]);

/** Temporary slug → donor slug. Empty — use slug-locked heroes only. */
export const BREAKFAST_IMAGE_DONOR_PLAN: Record<string, string> = {
  // Re-add only when slug hero is missing on disk. Example:
  // "some-slug": "accurate-donor-slug",
};

export const GOLDEN_100_BREAKFAST_SLUGS = new Set([
  "bacon-egg-hash",
  "breakfast-burrito-bar",
  "pancake-short-stack",
  "french-toast-casserole",
  "chorizo-breakfast-tacos",
  "biscuits-gravy",
]);

export function recommendBreakfastDonor(slug: string): string | null {
  if (BREAKFAST_CANONICAL_UNIQUE_SLUGS.has(slug)) return null;
  return BREAKFAST_IMAGE_DONOR_PLAN[slug] ?? null;
}

export function listBreakfastRemediationSlugs(): string[] {
  return Object.keys(BREAKFAST_IMAGE_DONOR_PLAN);
}
