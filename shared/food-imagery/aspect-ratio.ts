/**
 * Consistent generation dimensions — GPT Image API sizes.
 */

import {
  GPT_IMAGE_SIZE_SQUARE,
  parseGptImageDimensions,
  type GptImageApiSize,
} from "../openai-image-sizes.js";

export type FoodImageryOutputSize = GptImageApiSize;

export const FOOD_IMAGERY_HERO_SIZE = GPT_IMAGE_SIZE_SQUARE;

export const FOOD_IMAGERY_DISPLAY_ASPECT = {
  /** CSS / layout target for heroes */
  ratio: "5/4" as const,
  mobileMaxVh: 48,
  desktopMaxVh: 52,
};

export function resolveGenerationSize(_mealFormat?: string): FoodImageryOutputSize {
  return FOOD_IMAGERY_HERO_SIZE;
}

export function parseSizeDimensions(size: Exclude<FoodImageryOutputSize, "auto">): {
  width: number;
  height: number;
} {
  return parseGptImageDimensions(size);
}
