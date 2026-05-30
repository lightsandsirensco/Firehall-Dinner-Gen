import type { GoldenCatalogIndex } from "@shared/golden-100/recipe-page-schema";
import { pizzaNightCatalogIndexPath } from "@shared/pizza-night/recipe-page-paths";
import { fetchJsonResource } from "@/lib/fetch-json";

const API_INDEX = "/api/catalog/pizza-night";

export const pizzaNightCatalogQueryKey = ["pizza-night-catalog"] as const;

export async function fetchPizzaNightCatalog(): Promise<GoldenCatalogIndex> {
  const apiIndex = await fetchJsonResource<GoldenCatalogIndex>(API_INDEX);
  if (apiIndex) return apiIndex;

  const staticIndex = await fetchJsonResource<GoldenCatalogIndex>(pizzaNightCatalogIndexPath());
  if (!staticIndex) throw new Error("Pizza Night catalog unavailable");
  return staticIndex;
}

export function pizzaNightRecipePath(slug: string): string {
  return `/recipes/${slug}`;
}
