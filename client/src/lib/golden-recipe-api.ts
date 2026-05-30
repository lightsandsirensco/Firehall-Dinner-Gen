import type { GoldenCatalogIndex, GoldenRecipePage } from "@shared/golden-100/recipe-page-schema";
import { goldenCatalogIndexPath, goldenPageJsonPath } from "@shared/golden-100/recipe-page-paths";
import { pizzaNightPageJsonPath } from "@shared/pizza-night/recipe-page-paths";
import { isPizzaNightSlug } from "@shared/pizza-night/manifest";
import { performanceCatalogIndexPath, performancePageJsonPath } from "@shared/performance-meals/recipe-page-paths";
import {
  hallExpansionCatalogIndexPath,
  hallExpansionCatalogPagePath,
} from "@shared/hall-expansion/recipe-page-paths";
import { mergeHallCatalogIndexes } from "@shared/meal-catalog/unified-index";
import { hallCatalogIndexPath } from "@shared/hall-catalog/paths";
import { fetchApprovedCatalogTotal } from "@/lib/approved-catalog-api";
import { fetchJsonResource } from "@/lib/fetch-json";

const API_INDEX = "/api/catalog/golden-100";
const API_PAGE = (slug: string) => `/api/catalog/golden-100/${encodeURIComponent(slug)}`;

async function loadStaticCatalogIndex(): Promise<GoldenCatalogIndex> {
  // Preferred: unified hall file (Golden + Performance, breakfast excluded).
  const hall = await fetchJsonResource<GoldenCatalogIndex>(hallCatalogIndexPath());
  if (hall) return hall;

  const golden = await fetchJsonResource<GoldenCatalogIndex>(goldenCatalogIndexPath());
  if (!golden) throw new Error("Catalog index unavailable");

  const performance = await fetchJsonResource<GoldenCatalogIndex>(performanceCatalogIndexPath());
  if (performance) {
    let merged = mergeHallCatalogIndexes(golden, performance);
    const expansion = await fetchJsonResource<GoldenCatalogIndex>(hallExpansionCatalogIndexPath());
    if (expansion) {
      merged = mergeHallCatalogIndexes(golden, performance, expansion);
    }
    return merged;
  }
  return golden;
}

export async function fetchGoldenCatalogIndex(): Promise<GoldenCatalogIndex> {
  const apiIndex = await fetchJsonResource<GoldenCatalogIndex>(API_INDEX);
  if (apiIndex) return apiIndex;
  return loadStaticCatalogIndex();
}

/** Approved catalog total — homepage / marketing counts. */
export async function fetchCuratedRecipeTotal(): Promise<number> {
  return fetchApprovedCatalogTotal();
}

export async function fetchGoldenRecipePage(slug: string): Promise<GoldenRecipePage> {
  const normalized = slug.trim().toLowerCase();
  const pizzaNightFirst = isPizzaNightSlug(normalized);

  const candidates = pizzaNightFirst
    ? [
        pizzaNightPageJsonPath(normalized),
        API_PAGE(normalized),
        goldenPageJsonPath(normalized),
        performancePageJsonPath(normalized),
        hallExpansionCatalogPagePath(normalized),
      ]
    : [
        API_PAGE(normalized),
        goldenPageJsonPath(normalized),
        pizzaNightPageJsonPath(normalized),
        performancePageJsonPath(normalized),
        hallExpansionCatalogPagePath(normalized),
      ];

  for (const url of candidates) {
    const page = await fetchJsonResource<GoldenRecipePage>(url);
    if (page?.slug && page.title) return page;
  }

  throw new Error("Recipe not found");
}
