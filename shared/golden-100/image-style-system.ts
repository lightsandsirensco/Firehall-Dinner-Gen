/**
 * Golden 100 — centralized editorial image prompt system.
 * Aligned with shared/food-imagery master style v4 (photoreal).
 */

import type { MasterCategoryId } from "../categories/constants.js";
import type { GoldenRecipeDefinition } from "./types.js";
import {
  FIREHALL_PHOTO_BASELINE,
  FIREHALL_MASTER_EDITORIAL_STYLE,
  FOOD_IMAGERY_STYLE_VERSION,
  getMasterStylePromptLines,
} from "../food-imagery/master-style.js";
import { buildMasterNegativePrompt } from "../food-imagery/negative-prompt.js";

export const GOLDEN_IMAGE_STYLE_VERSION = "2.0" as const;

/** Master positive prompt — photoreal baseline on every Golden 100 generation. */
export const GOLDEN_MASTER_POSITIVE_PROMPT = [
  FIREHALL_PHOTO_BASELINE,
  "photorealistic restaurant menu photograph",
  FIREHALL_MASTER_EDITORIAL_STYLE.realism,
  FIREHALL_MASTER_EDITORIAL_STYLE.colorGrade,
].join(", ");

/** Master negative prompt — brand-wide rejection list. */
export const GOLDEN_MASTER_NEGATIVE_PROMPT = buildMasterNegativePrompt();

export interface GoldenImageCompositionRules {
  camera: string;
  lighting: string;
  background: string;
  plating: string;
  colorGrade: string;
}

export const GOLDEN_COMPOSITION_RULES: GoldenImageCompositionRules = {
  camera:
    "locked shot preset angle per meal format — 50mm full-frame, center-weighted with 12% safe margin, shallow natural depth of field",
  lighting: FIREHALL_MASTER_EDITORIAL_STYLE.lighting,
  background: FIREHALL_MASTER_EDITORIAL_STYLE.background,
  plating:
    "generous firehall portion scale on cast iron, dark tray, or rustic platter — hearty not fine-dining, minimal props",
  colorGrade: FIREHALL_MASTER_EDITORIAL_STYLE.colorGrade,
};

/** Per master-category modifiers appended after the master positive prompt. */
export const GOLDEN_CATEGORY_MODIFIERS: Record<MasterCategoryId, string> = {
  firehall_classics: "station classic energy, familiar comfort, warm kitchen glow, crew-night appetite",
  bbq_grill_nights: "real grill char, subtle smoke, char marks visible, BBQ hall night",
  comfort_food: "gentle steam when hot, natural cheese melt, post-shift comfort, generous bowl or plate",
  healthy_performance: "vibrant but realistic lean fuel, fresh herbs, clean protein zone, not diet-food sterile",
  quick_shift_meals: "fast line energy, one-pan or skillet implied, efficient station cook, still premium",
  pizza_night: "natural cheese bubble and crust char, whole pie or controlled slice, hall pizza night",
  big_crew_feeders: "massive portion scale, family-style tray implied, feeds the whole hall",
  breakfast_brunch: "morning shift warmth, soft natural light, hearty breakfast portions",
  global_flavors: "authentic global cues without stereotype props, recognizable dish geometry",
  game_day_watch_party: "shareable spread energy, handheld-friendly, game-night indulgence",
  meal_prep_leftovers: "batch tray or portioned containers, reheat-ready realism, intentional leftovers",
  rookie_friendly: "approachable plating, clear layers, forgiving cook cues in presentation",
};

/** Per meal-format plating modifiers — must match shot-presets.ts angles. */
export const GOLDEN_FORMAT_MODIFIERS: Record<string, string> = {
  burger: "stacked handheld on glossy bun, visible layers, napkin at edge only",
  tacos: "street-style tacos on dark plate, charred edges visible",
  pasta: "twirled pasta in wide bowl, restrained garnish, generous portion",
  pizza: "whole pie or controlled slice, natural cheese bubble",
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
    ...getMasterStylePromptLines(),
    `Style ${FOOD_IMAGERY_STYLE_VERSION}`,
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
  return buildMasterNegativePrompt(extra);
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
