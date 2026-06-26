/**
 * In-memory cache for buildApprovedCatalog() — invalidated by CATALOG_ASSET_REVISION.
 */
import type { ApprovedCatalogResponse } from "../shared/approved-catalog.js";
import { CATALOG_ASSET_REVISION } from "../shared/meal-catalog/asset-revision.js";
import { buildApprovedCatalog } from "./approved-catalog.js";
import { log } from "./logger.js";

export interface ApprovedCatalogCacheStats {
  hits: number;
  misses: number;
  builds: number;
  lastBuildMs: number;
  warmedAt: string | null;
  assetRevision: string;
  recipeCount: number | null;
}

let cached: ApprovedCatalogResponse | null = null;
let cachedRevision: string | null = null;

const stats: ApprovedCatalogCacheStats = {
  hits: 0,
  misses: 0,
  builds: 0,
  lastBuildMs: 0,
  warmedAt: null,
  assetRevision: CATALOG_ASSET_REVISION,
  recipeCount: null,
};

function isCacheValid(): boolean {
  return cached !== null && cachedRevision === CATALOG_ASSET_REVISION;
}

export function getApprovedCatalog(): ApprovedCatalogResponse {
  if (isCacheValid() && cached) {
    stats.hits++;
    return cached;
  }

  const start = performance.now();
  cached = buildApprovedCatalog();
  cachedRevision = CATALOG_ASSET_REVISION;
  stats.misses++;
  stats.builds++;
  stats.lastBuildMs = Math.round(performance.now() - start);
  stats.assetRevision = cached.assetRevision;
  stats.recipeCount = cached.recipeCount;
  return cached;
}

export function warmApprovedCatalogCache(): ApprovedCatalogResponse {
  const catalog = getApprovedCatalog();
  if (!stats.warmedAt) {
    stats.warmedAt = new Date().toISOString();
    log(
      `[catalog-cache] Warmed ${catalog.recipeCount} recipes in ${stats.lastBuildMs}ms rev=${CATALOG_ASSET_REVISION}`,
      "catalog",
    );
  }
  return catalog;
}

export function invalidateApprovedCatalogCache(): void {
  cached = null;
  cachedRevision = null;
}

export function getApprovedCatalogCacheStats(): ApprovedCatalogCacheStats {
  return { ...stats };
}
