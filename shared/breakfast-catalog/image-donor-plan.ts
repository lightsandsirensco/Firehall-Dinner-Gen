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
]);

/** Slugs that need donor copy — target slug → accurate donor slug. */
export const BREAKFAST_IMAGE_DONOR_PLAN: Record<string, string> = {
  // Hash family — shared accurate cast-iron hash (duplicates OK)
  "bbq-breakfast-hash": "bacon-egg-hash-skillet",
  "steakhouse-hash-skillet": "bacon-egg-hash-skillet",
  "sheet-pan-breakfast-hash": "chorizo-breakfast-hash",
  "ham-pepper-skillet": "cast-iron-breakfast-skillet",
  "bacon-egg-hash": "bacon-egg-hash-skillet",

  // Oats — golden oatmeal casserole hero
  "apple-cinnamon-baked-oatmeal": "broccoli-oatmeal-breakfast-casserole",
  "big-pot-savory-oats": "broccoli-oatmeal-breakfast-casserole",

  // French toast / baked breakfast
  "crew-french-toast-bake": "overnight-french-toast-bake",
  "french-toast-casserole": "overnight-french-toast-bake",

  // Burrito / wrap family
  "breakfast-burrito-bar": "breakfast-crunchwraps",
  "hall-breakfast-burritos": "breakfast-crunchwraps",
  "turkey-sausage-burritos": "chorizo-breakfast-burritos",

  // Egg bakes / casseroles
  "denver-breakfast-casserole": "ham-cheddar-egg-bake",
  "turkey-sausage-egg-bake": "southwest-egg-bake",

  // Handheld / sandwich / taco
  "breakfast-sandwich-trays": "sheet-pan-breakfast-sandwiches",
  "sausage-egg-cheese-sandwiches": "sheet-pan-breakfast-sandwiches",
  "chorizo-breakfast-tacos": "quick-egg-tacos",

  // Pancakes
  "buttermilk-pancakes": "maple-sausage-pinwheels",
  "protein-pancake-tray": "maple-sausage-pinwheels",
  "pancake-short-stack": "maple-sausage-pinwheels",

  // Biscuits & gravy — bread-based breakfast until AI regen (better than pizza)
  "hall-sausage-biscuits-gravy": "monte-cristo-sandwiches",
  "biscuits-gravy": "monte-cristo-sandwiches",

  // Skillet (non-hash)
  "red-lead-skillet": "cowboy-breakfast-skillet",
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
