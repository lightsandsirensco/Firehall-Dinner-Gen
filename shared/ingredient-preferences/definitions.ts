/**
 * Canonical "Foods to Avoid" preference definitions (Firehall Meals Pro).
 *
 * This is a PERSONAL TASTE PREFERENCE system, not a food-safety/allergen
 * system. It is intentionally separate from shared/dietary/ — that database
 * remains the sole source of truth for allergen/dietary classification and
 * is never modified or read by this module.
 *
 * Matching architecture mirrors the longest-keyword-wins pattern established
 * in shared/dietary/ingredient-database.ts (see match.ts), but is a fully
 * independent implementation — no imports from, or edits to, the dietary
 * system. Each preference below defines the ingredient forms it matches and
 * any explicit exceptions (ingredient forms that must NOT trigger a match,
 * e.g. "olive oil" for the "Olives" preference).
 *
 * The curated list (18 items) was derived from an actual frequency scan of
 * every published recipe's ingredient list — see the "MATCHING QUALITY"
 * section of the Pro V1 Feature 2 report for per-preference catalog counts
 * and sample matches. A candidate was only included if it matches reliably
 * (deterministic keyword matching, no ambiguity with an unrelated common
 * ingredient) — see each preference's comment for its specific policy.
 */

export interface FoodPreferenceDefinition {
  /** Stable key — used in persistence, URL state, analytics. Never renamed. */
  key: string;
  /** User-facing label — natural language, not clinical. */
  label: string;
  /** Ingredient-line substrings this preference matches (longest-match-wins). */
  matches: string[];
  /**
   * Ingredient-line substrings that must NOT count as a match even though
   * they may contain a `matches` keyword as a substring (e.g. "olive oil"
   * contains "olive"). Exceptions always win when they form a longer/more
   * specific match at the same location — see match.ts.
   */
  exceptions?: string[];
  /** One-line internal note on the matching policy for this preference. */
  policyNote: string;
}

export const FOOD_PREFERENCE_DEFINITIONS: FoodPreferenceDefinition[] = [
  {
    key: "mushrooms",
    label: "Mushrooms",
    matches: ["cremini mushrooms", "mushrooms", "mushroom"],
    policyNote: "Matches mushrooms in any form (including mushroom stock/broth, which is rare in-catalog).",
  },
  {
    key: "onions",
    label: "Onions",
    matches: [
      "yellow onion",
      "red onion",
      "white onion",
      "pickled onions",
      "pickled red onions",
      "onions",
      "onion",
    ],
    exceptions: ["onion powder", "green onions", "green onion", "shallots", "shallot"],
    policyNote:
      "Matches bulb onion (fresh or pickled) only. Onion powder (a mild dried seasoning) and " +
      "scallions/green onions/shallots (milder, culinarily distinct alliums many onion-dislikers " +
      "still tolerate) are explicitly excluded so the filter stays useful rather than excluding " +
      "nearly half the catalog.",
  },
  {
    key: "olives",
    label: "Olives",
    matches: [
      "kalamata olives",
      "castelvetrano olives",
      "green olives",
      "black olives",
      "olives",
      "olive",
    ],
    exceptions: ["olive oil", "extra-virgin olive oil", "extra virgin olive oil"],
    policyNote: "Matches the whole-olive food only. Olive oil is a fundamentally different product and is never matched.",
  },
  {
    key: "cilantro",
    label: "Cilantro",
    matches: ["fresh cilantro", "cilantro"],
    policyNote: "Single distinct herb — no derivative product requires an exception.",
  },
  {
    key: "mayonnaise",
    label: "Mayonnaise",
    matches: ["mayonnaise", "mayo", "aioli"],
    policyNote:
      "Matches ingredient lines that explicitly name mayo/mayonnaise/aioli only. Composed sauces " +
      "that may contain mayo (ranch, thousand island, tartar sauce) are NOT matched — their " +
      "ingredient line doesn't name mayonnaise, and guessing recipe composition beyond the literal " +
      "ingredient text would be unreliable.",
  },
  {
    key: "pickles",
    label: "Pickles",
    matches: [
      "dill pickle chips",
      "dill pickles",
      "pickle chips",
      "pickle relish",
      "pickle brine",
      "cornichons",
      "giardiniera",
      "pickles",
      "pickle",
    ],
    exceptions: ["pickled onions", "pickled red onions", "pickled jalapeños", "pickled jalapenos"],
    policyNote:
      "Matches cucumber-based pickle products only. Pickled onions/jalapeños are covered by the " +
      "Onions/Jalapeños preferences instead, so a single ingredient line is never double-counted " +
      "across two different avoid tags.",
  },
  {
    key: "tomatoes",
    label: "Tomatoes (fresh)",
    matches: [
      "cherry tomatoes",
      "grape tomatoes",
      "roma tomatoes",
      "heirloom cherry tomatoes",
      "tomato slices",
      "tomatoes",
      "tomato",
    ],
    exceptions: [
      "diced tomatoes",
      "crushed tomatoes",
      "canned tomato",
      "canned tomatoes",
      "san marzano crushed tomatoes",
      "tomato paste",
      "tomato sauce",
      "marinara sauce",
      "marinara",
      "pizza sauce",
      "sun-dried tomato",
      "sun dried tomato",
      "diced tomatoes with green chiles",
    ],
    policyNote:
      "Scoped to fresh/whole tomato forms only. Canned/crushed/diced-for-sauce, paste, marinara, " +
      "pizza sauce, and sun-dried forms are excluded — telling fresh-topping use apart from " +
      "sauce-base use isn't reliable from ingredient text alone, so this preference is deliberately " +
      "narrowed to the form that IS reliably distinguishable rather than guessing.",
  },
  {
    key: "bell_peppers",
    label: "Bell peppers",
    matches: ["bell peppers", "bell pepper", "poblano peppers", "roasted red peppers"],
    policyNote: "Distinct from black pepper (a spice) and from hot/jalapeño-type peppers, which are their own preference.",
  },
  {
    key: "jalapenos",
    label: "Jalapeños & spicy peppers",
    matches: [
      "pickled jalapeños",
      "pickled jalapenos",
      "jalapeño peppers",
      "jalapeños",
      "jalapenos",
      "jalapeno",
      "serrano",
      "thai bird chilies",
      "thai chilies",
      "scotch bonnet peppers",
      "scotch bonnet",
      "habanero",
    ],
    policyNote: "Fresh hot-pepper family — distinct from bell peppers and from black pepper.",
  },
  {
    key: "avocado",
    label: "Avocado",
    matches: ["avocados", "avocado", "guacamole"],
    policyNote: "Includes guacamole (avocado-based by definition) — no unrelated derivative product exists.",
  },
  {
    key: "mustard",
    label: "Mustard",
    matches: [
      "yellow mustard",
      "dijon mustard",
      "whole-grain mustard",
      "creole mustard",
      "dry mustard",
      "mustard",
    ],
    policyNote:
      "Matches every mustard form (including dry/powdered). Unlike onion powder, dry mustard " +
      "carries the same core flavor as prepared mustard, so no exception is warranted.",
  },
  {
    key: "blue_cheese",
    label: "Blue cheese",
    matches: ["blue cheese", "gorgonzola"],
    policyNote: "Small but reliably distinct — never confused with any other cheese profile.",
  },
  {
    key: "feta",
    label: "Feta",
    matches: ["feta cheese", "crumbled feta", "feta"],
    policyNote: "Distinct cheese, reliably named on its own ingredient lines.",
  },
  {
    key: "beans",
    label: "Beans",
    matches: [
      "kidney beans",
      "kidney bean",
      "black beans",
      "black bean",
      "pinto beans",
      "pinto bean",
      "cannellini beans",
      "cannellini",
      "chickpeas",
      "chickpea",
      "garbanzo",
      "butter beans",
      "butter bean",
      "lima beans",
      "lima bean",
      "great northern beans",
      "navy beans",
      "fava beans",
      "white beans",
      "baked beans",
      "beans",
      "bean",
    ],
    policyNote: "Covers all common bean varieties. Lentils are a culinarily distinct legume and are intentionally not included.",
  },
  {
    key: "corn",
    label: "Corn",
    matches: ["corn kernels", "frozen corn", "sweet corn", "corn on the cob", "corn"],
    exceptions: ["corn tortilla", "corn tortillas", "corn starch", "corn syrup"],
    policyNote:
      "Matches corn as a vegetable/kernel only. Corn tortillas, cornstarch, and corn syrup are " +
      "different manufactured products with a different texture/use and are excluded (mirrors the " +
      "onion-powder / olive-oil exception pattern). Cornmeal/cornbread are single fused words and " +
      "never match the word-boundary keyword \"corn\" in the first place.",
  },
  {
    key: "spinach",
    label: "Spinach",
    matches: ["fresh spinach", "baby spinach", "spinach"],
    policyNote: "Single distinct leafy green — no derivative product requires an exception.",
  },
  {
    key: "broccoli",
    label: "Broccoli",
    matches: ["broccolini", "broccoli"],
    policyNote: "Includes broccolini (a broccoli hybrid) — no unrelated derivative product exists.",
  },
  {
    key: "coconut",
    label: "Coconut",
    matches: ["coconut milk", "coconut cream", "shredded coconut", "coconut"],
    policyNote: "Matches coconut in food form. Coconut oil/water/aminos are rare in-catalog and share the same core flavor, so no exception is needed.",
  },
];

export const FOOD_PREFERENCE_KEYS: readonly string[] = FOOD_PREFERENCE_DEFINITIONS.map((d) => d.key);

const FOOD_PREFERENCE_BY_KEY = new Map(FOOD_PREFERENCE_DEFINITIONS.map((d) => [d.key, d]));

export function isFoodPreferenceKey(key: string): boolean {
  return FOOD_PREFERENCE_BY_KEY.has(key);
}

export function getFoodPreferenceDefinition(key: string): FoodPreferenceDefinition | undefined {
  return FOOD_PREFERENCE_BY_KEY.get(key);
}

/** Filters a raw array down to known canonical keys, de-duplicated, order-preserving. Unknown values are silently dropped. */
export function sanitizeFoodPreferenceKeys(raw: readonly string[] | null | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    const key = String(value ?? "").trim();
    if (!key || seen.has(key) || !FOOD_PREFERENCE_BY_KEY.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
