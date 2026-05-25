import type { FoodImageryContext } from "./types.js";

/** Meal categories map to fixed camera/plating — never random per recipe. */
export type MealShotCategory =
  | "burger"
  | "tacos"
  | "sandwich"
  | "pasta"
  | "soup_chili"
  | "bowl"
  | "grill"
  | "pizza"
  | "salad"
  | "plated_main"
  | "breakfast"
  | "seafood";

export interface MealShotPreset {
  id: MealShotCategory;
  /** Camera angle — locked per category */
  angle: string;
  /** Lens / distance */
  lens: string;
  /** How the dish sits in frame */
  plating: string;
  /** Category-specific shadow/plate notes */
  surface: string;
}

export const MEAL_SHOT_PRESETS: Record<MealShotCategory, MealShotPreset> = {
  burger: {
    id: "burger",
    angle: "low 35-degree hero angle slightly off-center, bun crown visible",
    lens: "85mm equivalent close hero, shallow depth of field",
    plating: "stacked handheld burger on dark slate or wood board, layers visible, optional cheese pull",
    surface: "cast iron skillet edge blurred in background",
  },
  tacos: {
    id: "tacos",
    angle: "45-degree three-quarter view along the row of tacos",
    lens: "50mm equivalent, medium close",
    plating: "street-style tacos on dark ceramic plate, charred tortilla edges, restrained garnish",
    surface: "lime wedge and coarse salt out of focus at frame edge only",
  },
  sandwich: {
    id: "sandwich",
    angle: "45-degree cross-section or stacked diagonal",
    lens: "85mm close hero",
    plating: "toasted bread visible, fillings layered, cut face toward camera",
    surface: "dark linen under half the plate",
  },
  pasta: {
    id: "pasta",
    angle: "40-degree into the bowl, steam visible",
    lens: "50mm, bowl fills lower two-thirds of frame",
    plating: "twirled pasta in wide shallow bowl, parmesan and herbs minimal",
    surface: "wood table tone matching brand background",
  },
  soup_chili: {
    id: "soup_chili",
    angle: "35-degree above rim, steam rising",
    lens: "50mm, tight on bowl",
    plating: "deep bowl ladle-ready, toppings clustered center not scattered",
    surface: "dark bowl on matte wood",
  },
  bowl: {
    id: "bowl",
    angle: "45-degree three-quarter bowl, not flat overhead",
    lens: "50mm",
    plating: "distinct protein and grain zones visible, generous portion",
    surface: "single bowl centered, no multiple competing vessels",
  },
  grill: {
    id: "grill",
    angle: "40-degree hero on protein forward",
    lens: "85mm, char detail sharp",
    plating: "grill marks on protein, rustic dark platter, sides at blurred edges",
    surface: "cast iron or grill grate suggestion in bokeh",
  },
  pizza: {
    id: "pizza",
    angle: "42-degree whole-pie hero or controlled slice pull at same angle family",
    lens: "50mm, entire pie centered",
    plating: "blistered leopard-spot crust rim, bubbling cheese, toppings evenly distributed",
    surface: "dark pizza steel or peel edge blurred",
  },
  salad: {
    id: "salad",
    angle: "45-degree into bowl, not flat lay",
    lens: "50mm",
    plating: "abundant bowl with grilled protein on top, hearty not sparse café",
    surface: "dark bowl, minimal props",
  },
  plated_main: {
    id: "plated_main",
    angle: "42-degree classic menu hero, protein forward center",
    lens: "85mm editorial close",
    plating: "generous plated main, sides implied at soft edges, sauce gloss controlled",
    surface: "dark ceramic plate, single-plate composition",
  },
  breakfast: {
    id: "breakfast",
    angle: "45-degree into plate, morning warmth",
    lens: "50mm",
    plating: "eggs, potatoes, or breakfast proteins on dark plate, steam if hot",
    surface: "warm wood tone consistent with brand",
  },
  seafood: {
    id: "seafood",
    angle: "40-degree along fillet or shellfish arrangement",
    lens: "85mm, moisture highlights",
    plating: "seafood glisten natural, lemon as single accent only",
    surface: "dark slate, cool-warm balanced grade still warm overall",
  },
};

export const PIZZA_SHOT_PRESET = MEAL_SHOT_PRESETS.pizza;

export function inferMealShotCategory(
  mealFormat?: string,
  title?: string,
  cuisine?: string,
): MealShotCategory {
  const fmt = (mealFormat || "").toLowerCase().replace(/-/g, "_");
  if (fmt in MEAL_SHOT_PRESETS) return fmt as MealShotCategory;

  const t = (title || "").toLowerCase();
  const c = (cuisine || "").toLowerCase();

  if (/pizza/.test(t) || fmt === "pizza") return "pizza";
  if (/burger|smash|patty/.test(t)) return "burger";
  if (/taco|tostada|quesadilla/.test(t)) return "tacos";
  if (/sandwich|sub|hoagie|panini/.test(t)) return "sandwich";
  if (/pasta|spaghetti|penne|lasagna|macaroni|parm/.test(t)) return "pasta";
  if (/chili|soup|stew|chowder|bisque/.test(t)) return "soup_chili";
  if (/bowl|burrito bowl|rice bowl|grain bowl/.test(t)) return "bowl";
  if (/grill|steak|chop|ribs|bbq plate|smoked/.test(t)) return "grill";
  if (/salad/.test(t)) return "salad";
  if (/breakfast|egg|pancake|waffle|omelet|bacon/.test(t)) return "breakfast";
  if (/salmon|shrimp|fish|cod|scallop|seafood|lobster/.test(t) || /seafood/.test(c)) return "seafood";

  return "plated_main";
}

export function resolveShotPreset(ctx: FoodImageryContext): MealShotPreset {
  if (ctx.mealFormat === "pizza" || ctx.recipeKey.startsWith("pizza:")) {
    return PIZZA_SHOT_PRESET;
  }
  const cat = inferMealShotCategory(ctx.mealFormat, ctx.title, ctx.cuisine);
  return MEAL_SHOT_PRESETS[cat];
}

export function shotPresetPromptLines(preset: MealShotPreset): string[] {
  return [
    `Camera angle (locked preset ${preset.id}): ${preset.angle}`,
    `Lens: ${preset.lens}`,
    `Plating (preset): ${preset.plating}`,
    `Surface: ${preset.surface}`,
  ];
}
