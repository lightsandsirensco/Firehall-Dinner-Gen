/**
 * Customer-facing Explore filter taxonomy (Category + Protein).
 *
 * Stored recipe indexes use inconsistent protein/category strings
 * ("bacon" vs "Bacon", "plant", "Protein blend", …). Explore never shows those
 * raw values: entries are canonicalized here, and filter matching compares
 * normalized keys so legacy values and old `?protein=` links keep working.
 */

/** Lowercase, trimmed, single-spaced comparison key (`_`/`-` treated as spaces). */
export function normalizeTaxonomyKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

const PRESERVED_ACRONYMS: Record<string, string> = {
  bbq: "BBQ",
};

const LOWERCASE_JOINERS = new Set(["and", "or", "of", "the", "with", "&"]);

/** Title Case with intentional acronyms preserved ("bbq & grill" → "BBQ & Grill"). */
export function toTaxonomyTitleCase(value: string): string {
  return normalizeTaxonomyKey(value)
    .split(" ")
    .filter(Boolean)
    .map((word, index) => {
      if (PRESERVED_ACRONYMS[word]) return PRESERVED_ACRONYMS[word];
      if (index > 0 && LOWERCASE_JOINERS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/** Raw protein value (normalized key) → canonical customer-facing label. */
const PROTEIN_ALIASES: Record<string, string> = {
  bacon: "Bacon",
  beef: "Beef",
  steak: "Beef",
  chicken: "Chicken",
  egg: "Eggs",
  eggs: "Eggs",
  fish: "Fish",
  lamb: "Lamb",
  pork: "Pork",
  salmon: "Salmon",
  sausage: "Sausage",
  seafood: "Seafood",
  shrimp: "Shrimp",
  turkey: "Turkey",
  vegetarian: "Vegetarian",
  plant: "Vegetarian",
  "plant based": "Vegetarian",
  mixed: "Mixed Protein",
  "mixed protein": "Mixed Protein",
  "protein mix": "Mixed Protein",
  "sausage and beef": "Mixed Protein",
  blend: "Smoothies",
  "protein blend": "Smoothies",
  smoothie: "Smoothies",
  smoothies: "Smoothies",
};

/**
 * Recipes whose stored protein contradicts the dish (scrambled BBQ manifests,
 * breakfast tag heuristic falling back to "Eggs", catch-all "seafood", sausage
 * dinners filed under pork). Explore-only; stored indexes are not rewritten.
 */
export const EXPLORE_PROTEIN_SLUG_OVERRIDES: Record<string, string> = {
  // BBQ catalog
  "andouille-po-boy-rolls-crew": "Sausage",
  "brisket-style-beef-sandwiches-au-jus": "Beef",
  "cajun-grilled-cod-crew": "Fish",
  "cast-iron-steak-fajita-sizzlers": "Beef",
  "charred-broccolini-lemon-tray": "Fish",
  "chili-lime-grilled-tilapia": "Fish",
  "competition-bbq-chicken-thighs": "Chicken",
  "firehall-antipasto-pasta-salad": "Pork",
  "firehall-hibachi-mixed-grill-crew": "Mixed Protein",
  "firehall-street-elote-cups": "Vegetarian",
  "flat-top-philly-cheesesteaks-crew": "Beef",
  "griddle-smash-sausage-peppers": "Sausage",
  "grilled-chicken-pesto-panini-crew": "Chicken",
  "grilled-cod-lemon-packets": "Fish",
  "grilled-peach-burrata-salad": "Pork",
  "grilled-reuben-sandwiches-crew": "Beef",
  "hickory-smoked-chicken-breast": "Chicken",
  "honey-chipotle-chicken-thighs": "Chicken",
  "honey-sriracha-shrimp-skewers": "Shrimp",
  "hot-honey-grilled-sausage-peppers": "Sausage",
  "jalapeno-cheddar-smoked-sausages": "Sausage",
  "lamb-merguez-skewers-crew": "Lamb",
  "loaded-ranch-potato-salad-crew": "Pork",
  "maple-bourbon-grilled-trout": "Fish",
  "mixed-lamb-chop-grill-board": "Lamb",
  "mongolian-beef-flat-top-crew": "Beef",
  "pollo-asado-citrus-platter": "Chicken",
  "pork-satay-skewers-crew": "Pork",
  "portuguese-linguica-grill-platter": "Sausage",
  "pressed-cuban-sandwiches-crew": "Pork",
  "reverse-seared-ribeye-crew": "Beef",
  "smoked-baked-beans-crew": "Bacon",
  "smoked-bbq-chicken-wings-tray": "Chicken",
  "smoked-mac-and-cheese-crew": "Vegetarian",
  "smoked-picanha-steak-platter": "Beef",
  "smoked-potato-salad-tray": "Vegetarian",
  "spiedie-chicken-platter-crew": "Chicken",
  "tandoori-lamb-chop-platter": "Lamb",
  "texas-central-brisket-crew": "Beef",
  "yakiniku-grill-platter-crew": "Beef",
  // Breakfast catalog
  "bagel-lox-breakfast-board": "Salmon",
  "chicken-and-waffles-crew": "Chicken",
  "chorizo-breakfast-hash": "Sausage",
  "corned-beef-hash-breakfast": "Beef",
  "scrapple-and-eggs-skillet": "Pork",
  "shrimp-and-grits-breakfast": "Shrimp",
  "smoked-salmon-benedit": "Salmon",
  "turkey-sausage-burritos": "Sausage",
  // Hall / Firehall catalogs
  "best-tuna-melt-for-the-hall": "Fish",
  "breakfast-sausage-pizza": "Sausage",
  "cajun-lime-shrimp-black-bean-bowls": "Shrimp",
  "cedar-plank-salmon": "Salmon",
  "garlic-butter-shrimp": "Shrimp",
  "ginger-salmon-bowls": "Salmon",
  "hall-blt-sandwich-feed": "Bacon",
  "kielbasa-cabbage-potato-skillet": "Sausage",
  "lemon-herb-cod-roasted-vegetables": "Fish",
  "lemon-herb-salmon": "Salmon",
  "mostaccioli-sausage-bake": "Sausage",
  "sausage-egg-bake": "Sausage",
  "sausage-peppers-on-buns": "Sausage",
  "sausage-peppers-onions": "Sausage",
  "sheet-pan-sausage-peppers": "Sausage",
  "smoked-sausage-platter": "Sausage",
  "teriyaki-salmon-grill": "Salmon",
};

/** Canonical Explore protein label for a stored value (and optional recipe slug). */
export function canonicalExploreProtein(raw: string | null | undefined, slug?: string): string {
  const override = slug ? EXPLORE_PROTEIN_SLUG_OVERRIDES[slug.trim().toLowerCase()] : undefined;
  if (override) return override;
  const key = normalizeTaxonomyKey(raw);
  if (!key) return "Mixed Protein";
  return PROTEIN_ALIASES[key] ?? toTaxonomyTitleCase(key);
}

/** Filter id for a protein value — stable lowercase key of its canonical label. */
export function exploreProteinFilterId(raw: string | null | undefined): string {
  return normalizeTaxonomyKey(canonicalExploreProtein(raw));
}

/**
 * Category id → customer-facing label. Mirrors `displayName` in
 * shared/categories/definitions.ts (kept local so the client bundle does not
 * pull in the full master-category definitions).
 */
export const EXPLORE_CATEGORY_LABELS: Record<string, string> = {
  bbq_grill_nights: "BBQ & Grill Nights",
  big_crew_feeders: "Big Crew Feeders",
  breakfast_brunch: "Breakfast & Brunch",
  comfort_food: "Comfort Food",
  firehall_classics: "Firehall Classics",
  game_day_watch_party: "Game Day & Watch Party",
  global_flavors: "Global Flavors",
  healthy_performance: "Healthy & Performance",
  meal_prep_leftovers: "Meal Prep & Leftovers",
  pizza_night: "Pizza Night",
  quick_shift_meals: "Quick Shift Meals",
  rookie_friendly: "Rookie-Friendly Meals",
  smoothies: "Smoothies",
};

/** Canonical category id (snake_case) for a stored value. */
export function exploreCategoryFilterId(raw: string | null | undefined): string {
  return normalizeTaxonomyKey(raw).replace(/ /g, "_");
}

export function canonicalExploreCategoryLabel(raw: string | null | undefined): string {
  const id = exploreCategoryFilterId(raw);
  return EXPLORE_CATEGORY_LABELS[id] ?? toTaxonomyTitleCase(id);
}
