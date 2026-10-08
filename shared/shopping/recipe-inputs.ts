/**
 * Smart Shopping — adapters from app recipe shapes into ShoppingRecipeInput.
 *
 * Golden catalog pages already match RawRecipeIngredient and are passed
 * through directly. Generated / Shift Planner recipes use numeric `qty` and
 * have no `optional` flag, so optional status comes from the shared
 * isOptionalIngredient() markers ("(optional)" in the name) at build time.
 */

import type { ShoppingRecipeInput } from "./types";

/** Structural subset of ClientRecipeResponse — keeps the engine free of app schema imports. */
export interface ClientRecipeLike {
  title: string;
  servings?: number;
  ingredients: { name: string; qty: number; unit: string; optional?: boolean }[];
}

function formatQty(qty: number): string {
  return Number.isFinite(qty) && qty > 0 ? String(Math.round(qty * 10000) / 10000) : "";
}

export function clientRecipeToShoppingInput(
  slug: string,
  recipe: ClientRecipeLike,
  fallbackServings: number,
): ShoppingRecipeInput {
  return {
    slug,
    title: recipe.title,
    baseServings: recipe.servings || fallbackServings,
    ingredients: recipe.ingredients.map((ing) => {
      const quantity = formatQty(ing.qty);
      const unit = ing.unit?.trim() ?? "";
      return {
        name: ing.name,
        ...(quantity ? { quantity } : {}),
        ...(unit ? { unit } : {}),
        ...(ing.optional ? { optional: true } : {}),
      };
    }),
  };
}
