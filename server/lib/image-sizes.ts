/**
 * Server-side GPT Image size helpers — re-exports + editorial role mapping.
 */

export {
  GPT_IMAGE_API_SIZES,
  GPT_IMAGE_SIZE_AUTO,
  GPT_IMAGE_SIZE_LANDSCAPE,
  GPT_IMAGE_SIZE_PORTRAIT,
  GPT_IMAGE_SIZE_SQUARE,
  isGptImageApiSize,
  normalizeGptImageSize,
  parseGptImageDimensions,
  type GptImageApiSize,
} from "../../shared/openai-image-sizes.js";

import {
  GPT_IMAGE_SIZE_AUTO,
  GPT_IMAGE_SIZE_LANDSCAPE,
  GPT_IMAGE_SIZE_PORTRAIT,
  GPT_IMAGE_SIZE_SQUARE,
  type GptImageApiSize,
} from "../../shared/openai-image-sizes.js";

export type EditorialImageApiRole = "hero" | "mobile" | "rail" | "thumb";

/** OpenAI API size for a given editorial asset role (before local sharp crops). */
export function resolveEditorialApiSize(role: EditorialImageApiRole): GptImageApiSize {
  switch (role) {
    case "mobile":
      return GPT_IMAGE_SIZE_PORTRAIT;
    case "rail":
      return GPT_IMAGE_SIZE_LANDSCAPE;
    case "hero":
    case "thumb":
    default:
      return GPT_IMAGE_SIZE_SQUARE;
  }
}

/** Default master generation for Golden 100 / food-imagery heroes */
export const DEFAULT_HERO_GENERATION_SIZE = GPT_IMAGE_SIZE_SQUARE;
