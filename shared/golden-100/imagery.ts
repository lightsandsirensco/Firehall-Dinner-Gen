/**
 * Golden 100 imagery — preset resolution + prompt fragments (shared-only).
 */

import type { FoodImageryContext } from "../food-imagery/types.js";
import { buildFoodImageryPrompt } from "../food-imagery/prompt-builder.js";
import { getImageStylePreset, resolveImageStylePreset } from "../image-style-presets.js";
import type { ImageStylePresetId } from "../image-style-presets.js";
import { buildGoldenImagePositivePrompt, buildGoldenImageNegativePrompt } from "./image-style-system.js";
import { GOLDEN_SET_TAG } from "./types.js";
import type { GoldenImageryMeta, GoldenRecipeDefinition } from "./types.js";

export function resolveGoldenStylePreset(def: GoldenRecipeDefinition): ImageStylePresetId {
  return resolveImageStylePreset(def.masterCategoryId, [
    def.mealFormat,
    def.protein,
    def.imagery.shotPreset,
    def.imagery.lightingStyle,
  ]);
}

export function buildGoldenImageryMeta(def: GoldenRecipeDefinition): GoldenImageryMeta & {
  stylePreset: ImageStylePresetId;
  promptFragment: string;
} {
  const stylePreset = resolveGoldenStylePreset(def);
  const preset = getImageStylePreset(stylePreset);
  const promptFragment = [
    preset.identity,
    preset.lighting,
    def.imagery.promptFocus,
  ].join(". ");
  return { ...def.imagery, stylePreset, promptFragment };
}

export function goldenImageryContext(def: GoldenRecipeDefinition): FoodImageryContext {
  return {
    recipeKey: `golden:${def.slug}`,
    title: def.title,
    summary: def.hookLine,
    mealFormat: def.mealFormat,
    protein: def.protein,
    cuisine: def.cuisine,
    tags: [GOLDEN_SET_TAG, `cat:${def.masterCategoryId}`, def.imagery.shotPreset],
  };
}

/** Base hero prompt — uses unified food-imagery assembler (same as Explore + generator heroes). */
export function buildGoldenHeroPrompt(def: GoldenRecipeDefinition): string {
  return buildFoodImageryPrompt(goldenImageryContext(def));
}

export { buildGoldenImagePositivePrompt, buildGoldenImageNegativePrompt } from "./image-style-system.js";
