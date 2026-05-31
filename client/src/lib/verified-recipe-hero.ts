import { extractSlugFromImagePath } from "@shared/explore-image-mapping";
import { isImageReuseAndFallbacksDisabled, MISSING_RECIPE_IMAGE_LABEL } from "@shared/image-reuse-policy";

export { MISSING_RECIPE_IMAGE_LABEL };

/** Client-safe hero src — never substitute another recipe's image when reuse is disabled. */
export function displayRecipeHeroSrc(
  slug: string,
  heroImage?: string | null,
  heroVerified?: boolean,
): string {
  const normalizedSlug = slug.trim().toLowerCase();
  const src = (heroImage || "").trim();

  if (heroVerified === false) return "";
  if (!src) return "";

  if (isImageReuseAndFallbacksDisabled()) {
    const pathSlug = extractSlugFromImagePath(src);
    if (pathSlug !== normalizedSlug) return "";
  }

  return src;
}
