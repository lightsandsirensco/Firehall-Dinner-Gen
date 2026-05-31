/**
 * Strip unverified hero paths from recipe pages when image reuse is disabled.
 */

import { resolveApprovedCatalogKind } from "../shared/approved-catalog.js";
import {
  buildExploreImageMappingContext,
  getCanonicalExploreHeroPath,
  validateExploreImageMapping,
} from "../shared/explore-image-mapping.js";
import { isImageReuseAndFallbacksDisabled } from "../shared/image-reuse-policy.js";
import { normalizeCatalogSlug } from "../shared/hall-catalog/gate.js";

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
  const context = buildExploreImageMappingContext([{ slug, heroImage }]);
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
  );
  return validated.exploreEligible;
}

export function sanitizeRecipeHeroSurface<T extends RecipeHeroSurface>(page: T): SanitizedRecipeHeroSurface & T {
  if (!isImageReuseAndFallbacksDisabled()) {
    return { ...page, heroVerified: true };
  }

  const slug = normalizeCatalogSlug(page.slug);
  const kind = resolveApprovedCatalogKind(slug);
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
