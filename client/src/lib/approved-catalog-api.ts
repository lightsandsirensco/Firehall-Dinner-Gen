import type { ApprovedCatalogResponse } from "@shared/approved-catalog";
import {
  APPROVED_CATALOG_TOTAL,
  marketingRecipeCount,
} from "@shared/meal-catalog/curated-count";

const API_APPROVED = "/api/catalog/approved";

export const approvedCatalogQueryKey = [API_APPROVED] as const;
export const approvedCatalogTotalQueryKey = ["approved-catalog-total"] as const;

export async function fetchApprovedCatalog(): Promise<ApprovedCatalogResponse> {
  const res = await fetch(API_APPROVED);
  if (!res.ok) {
    throw new Error(`Catalog ${res.status}`);
  }
  return res.json();
}

/** Approved catalog size for homepage, explore, and marketing copy. */
export async function fetchApprovedCatalogTotal(): Promise<number> {
  try {
    const catalog = await fetchApprovedCatalog();
    return marketingRecipeCount(catalog.recipeCount);
  } catch {
    return marketingRecipeCount(APPROVED_CATALOG_TOTAL);
  }
}
