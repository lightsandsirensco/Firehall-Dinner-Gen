import type { ApprovedCatalogResponse } from "@shared/approved-catalog";

const API_APPROVED = "/api/catalog/approved";

export const approvedCatalogQueryKey = [API_APPROVED] as const;

export async function fetchApprovedCatalog(): Promise<ApprovedCatalogResponse> {
  const res = await fetch(API_APPROVED);
  if (!res.ok) {
    throw new Error(`Catalog ${res.status}`);
  }
  return res.json();
}
