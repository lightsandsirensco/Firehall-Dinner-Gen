import { PIZZA_NIGHT_COUNT, PIZZA_NIGHT_RECIPES } from "./recipes-data.js";
import type { GoldenRecipeDefinition } from "../golden-100/types.js";

export { PIZZA_NIGHT_COUNT, PIZZA_NIGHT_RECIPES };

export const PIZZA_NIGHT_SET_TAG = "pizza-night" as const;
export const PIZZA_NIGHT_SET_VERSION = 1 as const;

export function getPizzaNightRecipeBySlug(slug: string): GoldenRecipeDefinition | undefined {
  return PIZZA_NIGHT_RECIPES.find((r) => r.slug === slug);
}

export function isPizzaNightSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return PIZZA_NIGHT_RECIPES.some((r) => r.slug === slug);
}

export function pizzaNightManifestSummary() {
  return {
    version: PIZZA_NIGHT_SET_VERSION,
    tag: PIZZA_NIGHT_SET_TAG,
    total: PIZZA_NIGHT_COUNT,
    slugs: PIZZA_NIGHT_RECIPES.map((r) => r.slug),
  };
}
