/**
 * Thin client wrapper around the shared deterministic pricing engine.
 * Free surface only — reads the signed-in user's structured profile
 * location (never a street address) to pick the best regional baseline.
 * Premium "Cook What's On Sale" will call `estimateRecipeCost` directly
 * with `saleOverrides` from the same shared engine — no separate cost system.
 */
import { useMemo } from "react";
import { estimateRecipeCost, type LocationQuery, type RecipeCostIngredientInput } from "@shared/pricing";
import type { ClientIngredient } from "@shared/schema";

export function profileToLocationQuery(profile: {
  city?: string | null;
  province_state?: string | null;
  postal_code?: string | null;
  country?: string | null;
} | null | undefined): LocationQuery {
  return {
    city: profile?.city ?? null,
    province_state: profile?.province_state ?? null,
    postal_code: profile?.postal_code ?? null,
    country: profile?.country ?? null,
  };
}

export function useRecipeCostEstimate(
  ingredients: ClientIngredient[] | undefined,
  servings: number,
  location: LocationQuery,
) {
  const key = ingredients?.map((i) => `${i.name}|${i.qty}|${i.unit}`).join(",") ?? "";
  return useMemo(() => {
    if (!ingredients?.length) return null;
    const inputs: RecipeCostIngredientInput[] = ingredients.map((i) => ({
      name: i.name,
      quantity: i.qty,
      unit: i.unit,
    }));
    return estimateRecipeCost(inputs, servings, location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, servings, location.city, location.province_state, location.postal_code, location.country]);
}
