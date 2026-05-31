/**
 * Temporary production guard — disable cross-recipe hero reuse and editorial fallbacks.
 * Correct image > missing placeholder > wrong image.
 */
export const IMAGE_REUSE_AND_FALLBACKS_DISABLED = true;

export function isImageReuseAndFallbacksDisabled(): boolean {
  return IMAGE_REUSE_AND_FALLBACKS_DISABLED;
}

export const MISSING_RECIPE_IMAGE_LABEL = "Missing image";
