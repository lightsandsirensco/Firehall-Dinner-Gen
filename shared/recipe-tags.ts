import type { RecipeTags } from "./schema.js";

/** Fill partial AI/Spoonacular tag objects into the canonical RecipeTags contract. */
export function normalizeRecipeTags(
  partial: Partial<RecipeTags> | undefined,
  fallback: Partial<RecipeTags> = {},
): RecipeTags {
  const cuisine = partial?.cuisine || fallback.cuisine || "american";
  const cooking_method =
    partial?.cooking_method || fallback.cooking_method || "stovetop";
  const base_carb = partial?.base_carb || fallback.base_carb || "none";
  const key_ingredients =
    partial?.key_ingredients?.length
      ? partial.key_ingredients
      : fallback.key_ingredients?.length
        ? fallback.key_ingredients
        : [];
  return {
    cuisine,
    cooking_method,
    base_carb,
    key_ingredients,
    high_protein: partial?.high_protein ?? fallback.high_protein ?? false,
    high_fiber: partial?.high_fiber ?? fallback.high_fiber ?? false,
    quick_cleanup: partial?.quick_cleanup ?? fallback.quick_cleanup ?? false,
  };
}
