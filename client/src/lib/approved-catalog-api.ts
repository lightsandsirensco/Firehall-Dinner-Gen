import type {
  ApprovedCatalogGridResponse,
  ApprovedCatalogResponse,
} from "@shared/approved-catalog";
import {
  APPROVED_CATALOG_TOTAL,
  marketingRecipeCount,
} from "@shared/meal-catalog/curated-count";

const API_APPROVED = "/api/catalog/approved";

export const approvedCatalogQueryKey = [API_APPROVED] as const;
export const approvedCatalogGridQueryKey = [`${API_APPROVED}?view=grid`] as const;
export const approvedCatalogTotalQueryKey = ["approved-catalog-total"] as const;

export async function fetchApprovedCatalog(): Promise<ApprovedCatalogResponse> {
  const res = await fetch(API_APPROVED);
  if (!res.ok) {
    throw new Error(`Catalog ${res.status}`);
  }
  return res.json();
}

/** Explore grid — no hero URLs in payload (mobile memory safe). */
export async function fetchApprovedCatalogGrid(): Promise<ApprovedCatalogGridResponse> {
  const res = await fetch(`${API_APPROVED}?view=grid`);
  if (!res.ok) {
    throw new Error(`Catalog ${res.status}`);
  }
  return res.json();
}

/** Approved catalog size — lightweight count endpoint (no full catalog download). */
export async function fetchApprovedCatalogTotal(): Promise<number> {
  try {
    const res = await fetch(`${API_APPROVED}/count`);
    if (!res.ok) {
      throw new Error(`Catalog count ${res.status}`);
    }
    const data = (await res.json()) as { recipeCount?: number };
    return marketingRecipeCount(data.recipeCount ?? APPROVED_CATALOG_TOTAL);
  } catch {
    return marketingRecipeCount(APPROVED_CATALOG_TOTAL);
  }
}
