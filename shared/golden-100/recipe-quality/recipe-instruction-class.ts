/**
 * Recipe instruction classes — route editorial steps by dish type, not one grill template.
 */

import type { GoldenRecipeDefinition } from "../types.js";

export type RecipeInstructionClass =
  | "wings_smoke"
  | "bbq_smoke"
  | "bbq_ribs"
  | "burnt_ends"
  | "steak_grill"
  | "chicken_grill"
  | "pork_grill"
  | "salmon_grill"
  | "veg_grill"
  | "pizza"
  | "pasta"
  | "chili"
  | "burger"
  | "tacos"
  | "breakfast"
  | "sheet_pan"
  | "bowl"
  | "sandwich"
  | "soup"
  | "skillet"
  | "bake"
  | "plated"
  | "dip"
  | "one_pot"
  | "roast"
  | "salad";

const SLUG_CLASS: Partial<Record<string, RecipeInstructionClass>> = {
  "smoked-wings-white-sauce": "wings_smoke",
  "smoked-brisket": "bbq_smoke",
  "texas-beef-ribs": "bbq_ribs",
  "memphis-dry-rub-ribs": "bbq_ribs",
  "bbq-brisket-burnt-ends": "burnt_ends",
  "ny-strip-herb-butter": "steak_grill",
  "flank-chimichurri": "steak_grill",
  "beef-dip": "steak_grill",
  "steak-sandwiches": "steak_grill",
  "steak-tacos": "steak_grill",
  "beer-can-chicken": "chicken_grill",
  "jerk-chicken": "chicken_grill",
  "chicken-souvlaki": "chicken_grill",
  "honey-garlic-pork-tenderloin": "pork_grill",
  "grilled-pork-chops": "pork_grill",
  "carolina-mustard-pork": "pork_grill",
  "cedar-plank-salmon": "salmon_grill",
  "teriyaki-salmon-grill": "salmon_grill",
  "lemon-herb-salmon": "salmon_grill",
  "grilled-corn-cotija": "veg_grill",
  "five-ingredient-pasta": "pasta",
  "garlic-butter-shrimp": "skillet",
  "big-chili": "chili",
  "chili-garlic-bread": "chili",
  "sunday-chili-batch": "chili",
  "turkey-chili": "chili",
  "smash-burgers": "burger",
  "slider-bar": "burger",
  "turkey-burgers": "burger",
  "buffalo-chicken-dip": "dip",
  "pancake-short-stack": "breakfast",
  "biscuits-gravy": "breakfast",
  "breakfast-burrito-bar": "breakfast",
  "chorizo-breakfast-tacos": "breakfast",
  "herb-roasted-thighs": "roast",
  "chicken-caesar": "salad",
  "jambalaya": "one_pot",
};

export function inferRecipeInstructionClass(def: GoldenRecipeDefinition): RecipeInstructionClass {
  const mapped = SLUG_CLASS[def.slug];
  if (mapped) return mapped;

  const slug = def.slug;
  const title = def.title.toLowerCase();

  if (/\bwing\b/.test(slug) || /\bwings\b/.test(title)) return "wings_smoke";
  if (/\bbrisket\b/.test(slug) || /\bsmoked\b/.test(title) && def.protein === "beef") return "bbq_smoke";
  if (/\bburnt-ends\b/.test(slug)) return "burnt_ends";
  if (/\brib\b/.test(slug) || /\bribs\b/.test(title)) return "bbq_ribs";
  if (def.mealFormat === "pizza" || /\bpizza\b/.test(title)) return "pizza";
  if (def.mealFormat === "soup_chili" || /\bchili\b/.test(title) || /\bsoup\b/.test(title)) return "chili";
  if (def.mealFormat === "burger" || /\bburger\b/.test(title)) return "burger";
  if (def.mealFormat === "tacos" || /\btaco\b/.test(title)) return "tacos";
  if (def.mealFormat === "breakfast" || def.explorePools.includes("breakfast")) return "breakfast";
  if (def.mealFormat === "sheet_pan") return "sheet_pan";
  if (def.mealFormat === "bowl") return "bowl";
  if (def.mealFormat === "sandwich" || def.mealFormat === "handheld") return "sandwich";
  if (def.mealFormat === "pasta") return "pasta";
  if (def.mealFormat === "skillet") return "skillet";
  if (def.mealFormat === "bake") return "bake";
  if (def.mealFormat === "one_pot") return "one_pot";
  if (def.mealFormat === "salad") return "salad";
  if (def.mealFormat === "roast") return "roast";
  if (/\bdip\b/.test(title)) return "dip";
  if (def.protein === "seafood" && def.mealFormat === "grill") return "salmon_grill";
  if (def.protein === "vegetarian" && def.mealFormat === "grill") return "veg_grill";
  if (def.protein === "beef" && def.mealFormat === "grill") return "steak_grill";
  if (def.protein === "pork" && def.mealFormat === "grill") return "pork_grill";
  if (def.protein === "chicken" && def.mealFormat === "grill") return "chicken_grill";
  if (def.mealFormat === "plated_main") return "plated";

  return "skillet";
}

/** Legacy 3-step grill template titles — never acceptable for published pages. */
export const GENERIC_GRILL_STEP_TITLES = new Set([
  "prep grill",
  "grill to temp",
  "glaze and rest",
]);

export const BANNED_STEP_TITLES = new Set([
  "set the line",
  "build flavor",
  "cook the main",
  "finish and serve",
  "prep the line",
  "sear and simmer",
  "serve the hall",
]);

export function usesGenericGrillTemplate(
  steps: Array<{ title?: string }>,
): boolean {
  const titles = steps.map((s) => (s.title || "").trim().toLowerCase());
  let match = 0;
  for (const t of GENERIC_GRILL_STEP_TITLES) {
    if (titles.includes(t)) match++;
  }
  return match >= 2;
}
