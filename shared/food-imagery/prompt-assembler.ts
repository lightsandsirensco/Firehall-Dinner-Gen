import { FOOD_IMAGERY_STYLE_VERSION, getMasterStylePromptLines } from "./master-style.js";
import { buildMasterNegativePrompt } from "./negative-prompt.js";
import type { MealShotPreset } from "./shot-presets.js";
import { shotPresetPromptLines } from "./shot-presets.js";
import type { FoodImageryPromptSpec } from "./types.js";

export interface AssemblePromptInput {
  dishTitle: string;
  cuisineLine: string;
  proteinLine: string;
  ingredientLine?: string;
  textureLine: string;
  shotPreset: MealShotPreset;
  dishSpecificPlating?: string;
  extraNegative?: string[];
  /** Master category editorial overrides */
  categoryMood?: string;
  categoryLighting?: string;
}

/**
 * Builds the positive prompt in a fixed section order so hashing and QA stay stable.
 */
export function assembleEditorialPositive(input: AssemblePromptInput): string {
  const sections = [
    `Editorial menu photograph of "${input.dishTitle}"`,
    input.cuisineLine,
    input.proteinLine,
    input.dishSpecificPlating ? `Dish presentation: ${input.dishSpecificPlating}` : "",
    input.ingredientLine ? `Visible ingredients: ${input.ingredientLine}` : "",
    `Texture cues: ${input.textureLine}`,
    ...shotPresetPromptLines(input.shotPreset),
    ...getMasterStylePromptLines(),
  ].filter(Boolean);

  return sections.join(". ");
}

export function assembleEditorialPromptSpec(input: AssemblePromptInput): FoodImageryPromptSpec {
  const positive = assembleEditorialPositive(input);
  const negative = buildMasterNegativePrompt(input.extraNegative ?? []);

  return {
    positive,
    negative,
    styleTags: ["firehall-editorial", "cinematic-dark", "comfort-food", "menu-hero"],
    composition: input.shotPreset.plating,
    lighting:
      input.categoryLighting ||
      getMasterStylePromptLines().find((l) => l.startsWith("Lighting:"))?.replace("Lighting: ", "") ||
      "",
    camera: `${input.shotPreset.angle}; ${input.shotPreset.lens}`,
    mood: input.categoryMood || "premium firehall comfort, single-brand consistency",
    styleVersion: FOOD_IMAGERY_STYLE_VERSION,
    shotPresetId: input.shotPreset.id,
    aspectRatio: "1:1",
  };
}

export function assembleFinalModelPrompt(spec: FoodImageryPromptSpec): string {
  return `${spec.positive} Avoid: ${spec.negative}.`;
}
