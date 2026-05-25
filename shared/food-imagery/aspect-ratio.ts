/**
 * Consistent generation dimensions — heroes are square for cache + mobile crop safety.
 */

export type FoodImageryOutputSize = "1024x1024" | "512x512";

export const FOOD_IMAGERY_HERO_SIZE: FoodImageryOutputSize = "1024x1024";

export const FOOD_IMAGERY_DISPLAY_ASPECT = {
  /** CSS / layout target for heroes */
  ratio: "5/4" as const,
  mobileMaxVh: 48,
  desktopMaxVh: 52,
};

export function resolveGenerationSize(_mealFormat?: string): FoodImageryOutputSize {
  return FOOD_IMAGERY_HERO_SIZE;
}

export function parseSizeDimensions(size: FoodImageryOutputSize): { width: number; height: number } {
  const [w, h] = size.split("x").map(Number);
  return { width: w || 1024, height: h || 1024 };
}
