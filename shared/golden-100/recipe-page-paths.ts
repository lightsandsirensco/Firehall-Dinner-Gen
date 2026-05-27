/**
 * Canonical public paths for Golden 100 recipe page imagery.
 */

import { editorialPathForRole } from "../editorial-image-delivery.js";

export function goldenPageHeroPath(slug: string): string {
  return editorialPathForRole("hero", slug, "jpg");
}

export function goldenPageMobilePath(slug: string): string {
  return editorialPathForRole("mobile", slug, "jpg");
}

export function goldenPageThumbPath(slug: string): string {
  return editorialPathForRole("thumb", slug, "jpg");
}

export function goldenPageRailPath(slug: string): string {
  return editorialPathForRole("rail", slug, "jpg");
}

export function goldenPageImageSet(slug: string) {
  return {
    heroImage: goldenPageHeroPath(slug),
    mobileImage: goldenPageMobilePath(slug),
    thumbImage: goldenPageThumbPath(slug),
    railImage: goldenPageRailPath(slug),
  };
}

/** Static JSON page served from public catalog. */
export function goldenPageJsonPath(slug: string): string {
  return `/catalog/golden-100/pages/${slug}.json`;
}

export function goldenCatalogIndexPath(): string {
  return "/catalog/golden-100/index.json";
}
