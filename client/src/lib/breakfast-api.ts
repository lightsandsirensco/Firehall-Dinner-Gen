import type { BreakfastCatalogIndex, BreakfastRecipePage } from "@shared/breakfast-schema";
import { breakfastPageJsonPath } from "@shared/fuel-catalog/paths";
import { fetchJsonResourceOrThrow } from "@/lib/fetch-json";

export async function fetchBreakfastCatalogIndex(): Promise<BreakfastCatalogIndex> {
  return fetchJsonResourceOrThrow<BreakfastCatalogIndex>(
    "/catalog/breakfast/index.json",
    "Failed breakfast index",
  );
}

export async function fetchBreakfastRecipePage(slug: string): Promise<BreakfastRecipePage> {
  return fetchJsonResourceOrThrow<BreakfastRecipePage>(
    breakfastPageJsonPath(slug),
    "Failed breakfast page",
  );
}
