/**
 * `/explore/recipe/:id` is a legacy/fallback detail route (see
 * `client/src/lib/explore-navigation.ts` — `@deprecated Prefer /recipes/:slug`).
 * Every recipe reachable through it that has an approved catalog slug already
 * gets client-side-redirected to `/recipes/:slug` once data loads (see
 * `resolveExploreLegacyRedirect` in `explore-recipe-detail-page.tsx`). Without
 * a server-side equivalent, crawlers and pre-JS clients see this URL as its
 * own page — with the homepage's title/canonical/OG tags leaking onto every
 * shared recipe link, and duplicate content vs. the real `/recipes/:slug`
 * page. This resolves the same redirect at the server layer (fast — reads
 * static package data or a synchronous SQLite lookup, no network calls) so
 * the 301 happens before any HTML is served.
 */

import { isApprovedCatalogSlug } from "../../shared/hall-catalog/gate.js";
import { recipePath } from "../../shared/seo/urls.js";
import { resolveHallPackageSlug } from "../hall-package-explore-detail.js";
import {
  getCuratedRecipeByExploreId,
  getCuratedRecipeById,
  getCuratedRecipeBySlug,
} from "../curated-recipe-store.js";

export interface ExploreLegacyHints {
  slug?: string;
  curatedRecipeId?: string;
}

/** Resolve a legacy `/explore/recipe/:id` request to its canonical `/recipes/:slug` path, if any. */
export function resolveExploreLegacyRedirectPath(
  exploreId: number,
  hints: ExploreLegacyHints = {},
): string | null {
  const hallSlug = resolveHallPackageSlug(exploreId, hints);
  if (hallSlug && isApprovedCatalogSlug(hallSlug)) return recipePath(hallSlug);

  if (hints.curatedRecipeId?.trim()) {
    const byId = getCuratedRecipeById(hints.curatedRecipeId.trim());
    if (byId && isApprovedCatalogSlug(byId.slug)) return recipePath(byId.slug);
  }

  const byExplore = getCuratedRecipeByExploreId(exploreId);
  if (byExplore && isApprovedCatalogSlug(byExplore.slug)) return recipePath(byExplore.slug);

  if (hints.slug?.trim()) {
    const bySlug = getCuratedRecipeBySlug(hints.slug.trim().toLowerCase());
    if (bySlug && isApprovedCatalogSlug(bySlug.slug)) return recipePath(bySlug.slug);
  }

  return null;
}
