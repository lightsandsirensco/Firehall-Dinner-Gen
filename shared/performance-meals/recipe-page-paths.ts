/**
 * Public paths for Performance Meals catalog (separate from Golden 100).
 */

import { editorialPathForRole } from "../editorial-image-delivery.js";

export function performancePageHeroPath(slug: string): string {
  // Unify with the editorial imagery system (same hero/mobile/thumb/rail pipeline as Golden 100).
  return editorialPathForRole("hero", slug, "jpg");
}

export function performancePageMobilePath(slug: string): string {
  return editorialPathForRole("mobile", slug, "jpg");
}

export function performancePageThumbPath(slug: string): string {
  return editorialPathForRole("thumb", slug, "jpg");
}

export function performancePageRailPath(slug: string): string {
  return editorialPathForRole("rail", slug, "jpg");
}

export function performancePageImageSet(slug: string) {
  return {
    heroImage: performancePageHeroPath(slug),
    mobileImage: performancePageMobilePath(slug),
    thumbImage: performancePageThumbPath(slug),
    railImage: performancePageRailPath(slug),
  };
}

export function performancePageJsonPath(slug: string): string {
  return `/catalog/performance-meals/pages/${slug}.json`;
}

export function performanceCatalogIndexPath(): string {
  return "/catalog/performance-meals/index.json";
}
