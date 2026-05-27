/**
 * Controlled vocabulary for the Firehall canonical recipe platform.
 * Prefer these enums over arbitrary AI-generated strings.
 */

export const RECIPE_SCHEMA_VERSION = 1 as const;

export const PROTEINS = [
  "chicken",
  "beef",
  "pork",
  "turkey",
  "fish",
  "seafood",
  "vegetarian",
  "any",
] as const;

export const CUISINES = [
  "american",
  "mediterranean",
  "mexican",
  "italian",
  "asian",
  "korean",
  "thai",
  "indian",
  "middle_eastern",
  "bbq",
  "cajun",
  "canadian",
  "greek",
  "japanese",
] as const;

export const MEAL_TYPES = [
  "burger",
  "tacos",
  "wrap",
  "bowl",
  "pasta",
  "salad",
  "sheet_pan",
  "skillet",
  "stir_fry",
  "soup_chili",
  "stew",
  "grill",
  "one_pot",
  "sandwich",
  "casserole",
  "plated_main",
  "loaded_fries",
  "breakfast",
  "pizza",
] as const;

export const DIFFICULTY_LEVELS = ["easy", "moderate", "involved"] as const;

/** 1 = fastest cleanup, 5 = most involved */
export const CLEANUP_LEVELS = [1, 2, 3, 4, 5] as const;

export const SPICE_LEVELS = ["none", "mild", "medium", "hot"] as const;

export const EQUIPMENT = [
  "stovetop",
  "oven",
  "grill",
  "slow_cooker",
  "instant_pot",
  "air_fryer",
  "sheet_pan",
  "cast_iron",
  "microwave",
  "blender",
] as const;

export const HEAT_LEVELS = ["none", "low", "medium", "medium_high", "high"] as const;

export const INGREDIENT_CATEGORIES = [
  "protein",
  "produce",
  "dairy",
  "pantry",
  "spice",
  "starch",
  "sauce",
  "other",
] as const;

export const SHOPPING_CATEGORIES = [
  "protein",
  "produce",
  "dairy",
  "pantry",
  "frozen",
  "bakery",
  "other",
] as const;

export const SOURCE_TYPES = [
  "curated",
  "spoonacular",
  "publisher",
  "partner",
  "hall_classic",
  "manual",
  "generated",
  "template",
] as const;

export const VALIDATION_STATUSES = [
  "pending",
  "valid",
  "normalized",
  "rejected",
] as const;

/** Editorial / discovery tags (controlled + extensible custom) */
export const RECIPE_TAG_SLUGS = [
  "high_protein",
  "high_fiber",
  "quick_cleanup",
  "feeds_hard",
  "rookie_friendly",
  "station_favorite",
  "meal_prep",
  "freezer_friendly",
  "one_pan",
  "comfort",
  "lean",
  "game_day",
  "shift_night",
  "budget",
  "grill_night",
] as const;

export const UNIT_ALIASES: Record<string, string> = {
  tbsp: "tablespoon",
  tbs: "tablespoon",
  tbl: "tablespoon",
  tsp: "teaspoon",
  ts: "teaspoon",
  oz: "ounce",
  lb: "pound",
  lbs: "pound",
  g: "gram",
  kg: "kilogram",
  ml: "milliliter",
  l: "liter",
  cup: "cup",
  cups: "cup",
  clove: "clove",
  cloves: "clove",
  pinch: "pinch",
  can: "can",
  cans: "can",
};

export const INGREDIENT_NAME_ALIASES: Record<string, string> = {
  "chicken breast": "chicken breast",
  "chicken breasts": "chicken breast",
  "chicken thigh": "chicken thighs",
  "chicken thighs": "chicken thighs",
  "ground beef": "ground beef",
  "beef mince": "ground beef",
  "jasmine rice": "jasmine rice",
  "white rice": "white rice",
  "flour tortilla": "flour tortillas",
  "flour tortillas": "flour tortillas",
  "corn tortilla": "corn tortillas",
  "corn tortillas": "corn tortillas",
};
