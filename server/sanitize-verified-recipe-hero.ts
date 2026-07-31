/**
 * Strip unverified hero paths from recipe pages when image reuse is disabled.
 */

import { resolveApprovedCatalogKind } from "../shared/approved-catalog.js";
import { isSmoothieCatalogSlug } from "../shared/fuel-catalog/smoothies/catalog-data.js";
import {
  getCanonicalExploreHeroPath,
  validateExploreImageMapping,
  type ExploreImageMappingContext,
} from "../shared/explore-image-mapping.js";
import { isImageReuseAndFallbacksDisabled } from "../shared/image-reuse-policy.js";
import { normalizeCatalogSlug } from "../shared/hall-catalog/gate.js";
import { buildAllApprovedCatalogEntries } from "./approved-catalog.js";
import { buildCrossCatalogHeroAuditContext } from "./cross-catalog-hero-index.js";
import { CATALOG_ASSET_REVISION } from "../shared/meal-catalog/asset-revision.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";

/**
 * Cross-catalog MD5 duplicate-hero index — same one Explore's grid uses.
 *
 * Root cause of a previous gap: `isVerifiedRecipeHero` used to build a
 * throwaway single-entry context per call, which can never detect a hero
 * byte-for-byte duplicated with a DIFFERENT recipe (there's nothing to
 * compare against). That let recipes flagged `duplicate_conflict` on the
 * Explore grid still show their wrong, borrowed photo on every other
 * surface (recipe detail pages, Related Recipes, raw catalog index
 * consumers). Reusing the same full-catalog context Explore builds fixes
 * every surface at once.
 */
let cachedContext: { context: ExploreImageMappingContext; peerLookup: Map<string, Pick<ApprovedCatalogEntry, "title" | "mealFormat">> } | null = null;
let cachedRevision: string | null = null;

function getCrossCatalogContext() {
  if (cachedContext && cachedRevision === CATALOG_ASSET_REVISION) return cachedContext;
  const allEntries = buildAllApprovedCatalogEntries();
  cachedContext = buildCrossCatalogHeroAuditContext(allEntries);
  cachedRevision = CATALOG_ASSET_REVISION;
  return cachedContext;
}

/**
 * `resolveApprovedCatalogKind` requires an explicit `isSmoothie` flag to
 * resolve smoothie slugs to kind "smoothie" — without it, every smoothie
 * silently falls through to the "firehall_catalog" default, which computes
 * the wrong canonical hero path (`/images/golden-100/...` instead of
 * `/images/smoothies/...`) and fails eligibility, blanking every smoothie's
 * perfectly valid hero/thumb image. Always resolve kind through here.
 */
function resolveKindForSlug(slug: string): ReturnType<typeof resolveApprovedCatalogKind> {
  return resolveApprovedCatalogKind(slug, isSmoothieCatalogSlug(slug));
}

export type RecipeHeroSurface = {
  slug: string;
  title: string;
  heroImage?: string | null;
  thumbImage?: string | null;
  category?: string;
  mealFormat?: string;
  tags?: string[];
};

export type SanitizedRecipeHeroSurface = RecipeHeroSurface & {
  heroVerified: boolean;
};

export function isVerifiedRecipeHero(row: {
  slug: string;
  title: string;
  kind: ReturnType<typeof resolveApprovedCatalogKind>;
  category?: string;
  mealFormat?: string;
  tags?: string[];
  heroImage?: string | null;
}): boolean {
  const slug = normalizeCatalogSlug(row.slug);
  const heroImage = (row.heroImage || "").trim() || getCanonicalExploreHeroPath(slug, row.kind);
  const { context, peerLookup } = getCrossCatalogContext();
  const validated = validateExploreImageMapping(
    {
      slug,
      title: row.title,
      kind: row.kind,
      category: row.category || "",
      mealFormat: row.mealFormat || "",
      heroImage,
      tags: row.tags || [],
    },
    context,
    { peerLookup },
  );
  return validated.exploreEligible;
}

export function sanitizeRecipeHeroSurface<T extends RecipeHeroSurface>(page: T): SanitizedRecipeHeroSurface & T {
  if (!isImageReuseAndFallbacksDisabled()) {
    return { ...page, heroVerified: true };
  }

  const slug = normalizeCatalogSlug(page.slug);
  const kind = resolveKindForSlug(slug);
  const verified = isVerifiedRecipeHero({
    slug,
    title: page.title,
    kind,
    category: page.category,
    mealFormat: page.mealFormat,
    tags: page.tags,
    heroImage: page.heroImage,
  });

  if (verified) {
    return { ...page, heroVerified: true };
  }

  return {
    ...page,
    heroImage: "",
    thumbImage: "",
    heroVerified: false,
  };
}

/**
 * Sanitize every entry in a catalog INDEX response (list of many recipes)
 * the same way individual recipe detail pages are sanitized.
 *
 * Root cause: index endpoints (`/api/catalog/golden-100`,
 * `/api/catalog/performance-meals`, `/api/catalog/hall-expansion`,
 * `/api/catalog/pizza-night`, `/api/catalog/smoothies`) were returning the
 * raw catalog JSON straight off disk with no eligibility check at all —
 * unlike the per-slug detail endpoints and the `/api/catalog/approved`
 * Explore feed, which both call `sanitizeRecipeHeroSurface` /
 * `filterExploreEligibleCatalogEntries`. Any client surface that reads
 * recipe cards from an index response (Related Recipes rails, the
 * generator wheel hub, SEO landing/product pages) inherited unverified
 * hero/thumb images — including recipes with permanently blank images and
 * recipes sharing byte-identical hero images with an unrelated dish.
 *
 * This blanks `heroImage`/`thumbImage` on any entry that fails the same
 * verification check used everywhere else, so every surface renders the
 * branded "Missing image" placeholder instead of a broken request or a
 * wrong photo — never silently reusing another recipe's image.
 */
export function sanitizeRecipeIndexEntries<T extends RecipeHeroSurface>(entries: T[]): T[] {
  if (!isImageReuseAndFallbacksDisabled()) return entries;

  return entries.map((entry) => {
    const slug = normalizeCatalogSlug(entry.slug);
    const kind = resolveKindForSlug(slug);
    const verified = isVerifiedRecipeHero({
      slug,
      title: entry.title,
      kind,
      category: entry.category,
      mealFormat: entry.mealFormat,
      tags: entry.tags,
      heroImage: entry.heroImage,
    });

    if (verified) return entry;
    return { ...entry, heroImage: "", thumbImage: "" };
  });
}
