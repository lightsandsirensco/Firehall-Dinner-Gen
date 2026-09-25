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
import { pizzaNightCatalogIndexPath } from "@shared/pizza-night/recipe-page-paths";
import { fetchApprovedCatalogTotal } from "@/lib/approved-catalog-api";
import { fetchJsonResource } from "@/lib/fetch-json";

const API_INDEX = "/api/catalog/golden-100";
const API_PAGE = (slug: string) => `/api/catalog/golden-100/${encodeURIComponent(slug)}`;
const API_LINK_GRAPH_INDEX = "/api/catalog/recipe-link-graph";
/** Static BBQ catalog index — same public dir convention as the other
 * per-catalog `index.json` files (see `server/bbq-catalog/catalog.ts`). */
const BBQ_CATALOG_INDEX_PATH = "/catalog/bbq/index.json";

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

/**
 * Cross-catalog related-recipe link graph — same recipes as
 * `fetchGoldenCatalogIndex()` (Golden + Performance + Hall Expansion) PLUS
 * BBQ and Pizza Night, so any recipe from any of those five catalogs can
 * find itself (and be found as a related-link candidate) when a
 * `/recipes/:slug` page computes its "Related firefighter meals" /
 * internal-link clusters. Explore/Home/the dinner picker are untouched —
 * this is only ever used for related-recipe generation.
 */
export async function fetchRecipeLinkGraphCatalogIndex(): Promise<GoldenCatalogIndex> {
  const apiIndex = await fetchJsonResource<GoldenCatalogIndex>(API_LINK_GRAPH_INDEX);
  if (apiIndex) return apiIndex;

  // Static fallback (API unreachable) — mirrors `loadStaticCatalogIndex()`
  // plus the two catalogs the live route adds.
  const hall = await loadStaticCatalogIndex();
  const [bbq, pizza] = await Promise.all([
    fetchJsonResource<GoldenCatalogIndex>(BBQ_CATALOG_INDEX_PATH),
    fetchJsonResource<GoldenCatalogIndex>(pizzaNightCatalogIndexPath()),
  ]);
  return mergeHallCatalogIndexes(hall, bbq, pizza);
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
