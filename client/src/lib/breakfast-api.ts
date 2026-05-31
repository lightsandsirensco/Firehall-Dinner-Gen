import type { BreakfastCatalogIndex, BreakfastRecipePage } from "@shared/breakfast-schema";
import { breakfastPageJsonPath } from "@shared/fuel-catalog/paths";
import { fetchJsonResource, fetchJsonResourceOrThrow } from "@/lib/fetch-json";

const API_PAGE = (slug: string) => `/api/catalog/breakfast/${encodeURIComponent(slug)}`;

export async function fetchBreakfastCatalogIndex(): Promise<BreakfastCatalogIndex> {
  return fetchJsonResourceOrThrow<BreakfastCatalogIndex>(
    "/catalog/breakfast/index.json",
    "Failed breakfast index",
  );
}

export async function fetchBreakfastRecipePage(
  slug: string,
): Promise<BreakfastRecipePage & { heroVerified?: boolean }> {
  const normalized = slug.trim().toLowerCase();
  const apiPage = await fetchJsonResource<BreakfastRecipePage & { heroVerified?: boolean }>(
    API_PAGE(normalized),
  );
  if (apiPage?.slug && apiPage.title) return apiPage;

  return fetchJsonResourceOrThrow<BreakfastRecipePage & { heroVerified?: boolean }>(
    breakfastPageJsonPath(normalized),
    "Failed breakfast page",
  );
}
