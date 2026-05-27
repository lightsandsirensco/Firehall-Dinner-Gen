/**
 * Golden 100 — centralized editorial image prompt system.
 * Single visual identity across hero, mobile, thumb, and rail variants.
 */

import type { MasterCategoryId } from "../categories/constants.js";
import type { GoldenRecipeDefinition } from "./types.js";

export const GOLDEN_IMAGE_STYLE_VERSION = "1.0" as const;

/** Master positive prompt — identical base on every Golden 100 generation. */
export const GOLDEN_MASTER_POSITIVE_PROMPT =
  "cinematic firefighter station meal photography, realistic food texture, moody lighting, warm highlights, dark industrial kitchen atmosphere, hearty portions, rugged but premium presentation, shallow depth of field, realistic steam, natural food imperfections, editorial food photography, black background accents, matte textures";

/** Master negative prompt — brand-wide rejection list. */
export const GOLDEN_MASTER_NEGATIVE_PROMPT =
  "cartoon, CGI, fake cheese, floating ingredients, tiny portions, over-garnished, unrealistic textures, glossy plastic food, fine dining plating, anime, illustration, duplicate items, malformed utensils, extra hands, 3d render, neon lighting, cold blue cast, white seamless background, garnish explosion, microgreen avalanche, text, logos, watermarks, people, hands, faces";

export interface GoldenImageCompositionRules {
  camera: string;
  lighting: string;
  background: string;
  plating: string;
  colorGrade: string;
}

export const GOLDEN_COMPOSITION_RULES: GoldenImageCompositionRules = {
  camera:
    "45° three-quarter hero angle, eye-level, center-weighted subject with 12% safe margin for mobile crop, shallow depth of field f/2.8 look",
  lighting:
    "warm directional key from camera-left at 45°, soft fill from right, controlled rim light, subtle steam only when dish is hot, deep readable shadows",
  background:
    "dark matte firehall kitchen surface — weathered wood or slate, brushed steel accents blurred, no bright white backgrounds",
  plating:
    "generous firehall portion scale on cast iron, dark tray, or rustic platter — hearty not fine-dining, minimal props",
  colorGrade:
    "cinematic warm grade — amber highlights, rich chocolate shadows, muted greens, controlled warmth, not oversaturated",
};

/** Per master-category modifiers appended after the master positive prompt. */
export const GOLDEN_CATEGORY_MODIFIERS: Record<MasterCategoryId, string> = {
  firehall_classics:
    "station classic energy, familiar comfort, warm tungsten kitchen glow, crew-night appetite",
  bbq_grill_nights:
    "smoky grill char, ember rim light, char marks visible, masculine BBQ hall night",
  comfort_food:
    "steam from hot dish, melty cheese where appropriate, post-shift comfort, generous bowl or plate",
  healthy_performance:
    "vibrant but realistic lean fuel, fresh herbs, clean protein zone, not diet-food sterile",
  quick_shift_meals:
    "fast line energy, one-pan or skillet implied, efficient station cook, still premium",
  pizza_night:
    "cheese bubble and crust char, whole pie or controlled slice, hall pizza night",
  big_crew_feeders:
    "massive portion scale, family-style tray implied, feeds the whole hall",
  breakfast_brunch:
    "morning shift warmth, soft golden light, hearty breakfast portions",
  global_flavors:
    "authentic global cues without stereotype props, recognizable dish geometry",
  game_day_watch_party:
    "shareable spread energy, handheld-friendly, game-night indulgence",
  meal_prep_leftovers:
    "batch tray or portioned containers, reheat-ready realism, intentional leftovers",
  rookie_friendly:
    "approachable plating, clear layers, forgiving cook cues in presentation",
};

/** Per meal-format plating modifiers. */
export const GOLDEN_FORMAT_MODIFIERS: Record<string, string> = {
  burger: "stacked handheld on glossy bun, visible layers, napkin at edge only",
  tacos: "street-style tacos on dark plate, charred edges visible",
  pasta: "twirled pasta in wide bowl, restrained garnish, generous portion",
  pizza: "whole pie or controlled slice pull, bubbling cheese",
  soup_chili: "deep bowl, toppings centered, visible steam",
  bowl: "generous bowl, distinct zones, protein forward",
  grill: "protein on rustic platter, grill marks visible",
  sandwich: "toasted roll, stacked fillings, handheld line ready",
  sheet_pan: "sheet pan edge visible, caramelized veg, one-pan efficiency",
  skillet: "cast iron skillet, sizzle texture, handle at frame edge",
  salad: "hearty salad bowl, protein visible, not sparse diet portion",
  plated_main: "single generous plate, sides soft at edges",
};

export function buildGoldenCategoryModifier(categoryId: MasterCategoryId): string {
  return GOLDEN_CATEGORY_MODIFIERS[categoryId] ?? GOLDEN_CATEGORY_MODIFIERS.firehall_classics;
}

export function buildGoldenFormatModifier(mealFormat: string): string {
  const key = mealFormat.toLowerCase();
  return GOLDEN_FORMAT_MODIFIERS[key] ?? GOLDEN_FORMAT_MODIFIERS.plated_main;
}

export function buildGoldenImagePositivePrompt(def: GoldenRecipeDefinition): string {
  const parts = [
    GOLDEN_MASTER_POSITIVE_PROMPT,
    GOLDEN_COMPOSITION_RULES.lighting,
    GOLDEN_COMPOSITION_RULES.background,
    GOLDEN_COMPOSITION_RULES.plating,
    GOLDEN_COMPOSITION_RULES.colorGrade,
    GOLDEN_COMPOSITION_RULES.camera,
    buildGoldenCategoryModifier(def.masterCategoryId),
    buildGoldenFormatModifier(def.mealFormat),
    def.imagery.promptFocus,
    `Dish: ${def.title}. ${def.hookLine}`,
  ];
  return parts.filter(Boolean).join(". ");
}

export function buildGoldenImageNegativePrompt(def: GoldenRecipeDefinition): string {
  const extra: string[] = [];
  if (def.masterCategoryId === "healthy_performance") {
    extra.push("sad diet portion", "clinical white plate");
  }
  if (def.mealFormat === "grill" || def.masterCategoryId === "bbq_grill_nights") {
    extra.push("raw interior meat", "daylight flat lighting");
  }
  return [GOLDEN_MASTER_NEGATIVE_PROMPT, ...extra].join(", ");
}

/** Ordered prompt lines for logging / manifest QA. */
export function getGoldenImagePromptBreakdown(def: GoldenRecipeDefinition) {
  return {
    version: GOLDEN_IMAGE_STYLE_VERSION,
    master: GOLDEN_MASTER_POSITIVE_PROMPT,
    composition: GOLDEN_COMPOSITION_RULES,
    category: buildGoldenCategoryModifier(def.masterCategoryId),
    format: buildGoldenFormatModifier(def.mealFormat),
    focus: def.imagery.promptFocus,
    negative: buildGoldenImageNegativePrompt(def),
    full: buildGoldenImagePositivePrompt(def),
  };
}
