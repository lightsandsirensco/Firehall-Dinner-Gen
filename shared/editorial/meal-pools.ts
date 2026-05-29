/**
 * Curated recipe pools for editorial recommendations — timing and intent aligned.
 */

/** Slugs that need long unattended cook (smoke, low-and-slow, large bakes) */
export const SLOW_COOK_SLUGS = new Set([
  "smoked-brisket",
  "memphis-dry-rub-ribs",
  "texas-beef-ribs",
  "bbq-brisket-burnt-ends",
  "batch-lasagna",
  "pulled-pork",
]);

/** Under ~45 min active / realistic busy-night picks */
export const FAST_SHIFT_SLUGS = new Set([
  "fast-philly-skillet",
  "garlic-butter-shrimp",
  "five-ingredient-pasta",
  "one-pot-chicken-rice",
  "chicken-quesadillas",
  "pad-thai",
  "beef-broccoli",
  "skillet-chicken-alfredo",
  "pork-carnitas-tacos",
  "chili-mac",
  "sheet-pan-fajitas",
  "sheet-pan-sausage-peppers",
  "smash-burgers",
  "chicken-quesadillas",
  "teriyaki-donburi",
  "philly-cheesesteak-skillet",
]);

export const CROCKPOT_FRIENDLY_SLUGS = new Set([
  "big-chili",
  "sunday-chili-batch",
  "turkey-chili",
  "pulled-pork",
  "beef-barley-soup",
  "chicken-dumpling-soup",
]);

export const COMFORT_POST_CALL_SLUGS = new Set([
  "chicken-pot-pie",
  "mac-and-cheese-bake",
  "chili-garlic-bread",
  "beef-stroganoff",
  "loaded-baked-potato-bar",
  "chicken-parm",
  "shepherds-pie",
  "meatloaf-mashed",
]);

export const HEALTHY_PERFORMANCE_SLUGS = new Set([
  "greek-chicken-bowls",
  "ginger-salmon-bowls",
  "turkey-chili",
  "cedar-plank-salmon",
  "chicken-souvlaki",
  "mediterranean-chickpea",
  "turkey-meatball-zoodles",
  "lemon-herb-salmon",
  "performance-burrito-bowls",
  "herb-roasted-thighs",
]);

export function isSlowCookSlug(slug: string): boolean {
  return SLOW_COOK_SLUGS.has(slug);
}

export function isFastShiftSlug(slug: string): boolean {
  return FAST_SHIFT_SLUGS.has(slug);
}
