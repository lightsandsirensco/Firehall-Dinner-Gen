export function smoothieRecipePath(slug: string): string {
  return `/smoothies/${slug}`;
}

export function smoothiesIndexPath(): string {
  return "/smoothies";
}

export function breakfastIndexPath(): string {
  return "/breakfast";
}

export function breakfastRecipePath(slug: string): string {
  return `/breakfast/${(slug || "").trim().toLowerCase()}`;
}

export function breakfastPerformanceIndexPath(): string {
  return "/breakfast/performance";
}

export function breakfastPerformanceRecipePath(slug: string): string {
  return `/breakfast/performance/${(slug || "").trim().toLowerCase()}`;
}

export function breakfastCatalogPerformanceIndexPath(): string {
  return "/catalog/breakfast/performance/index.json";
}

export function breakfastPageJsonPath(slug: string): string {
  return `/catalog/breakfast/pages/${(slug || "").trim().toLowerCase()}.json`;
}

export function performanceFuelPath(): string {
  return "/performance-fuel";
}

export function performanceFuelRecipePath(slug: string): string {
  return `/performance-fuel/${slug}`;
}

export function smoothieCatalogIndexPath(): string {
  return "/catalog/smoothies/index.json";
}

export function smoothiePageJsonPath(slug: string): string {
  return `/catalog/smoothies/pages/${slug}.json`;
}

export function smoothieHeroImagePath(slug: string): string {
  // Canonical smoothie hero format is .webp (see
  // shared/explore-image-paths.ts's slugLockedImagePaths, which prefers the
  // .webp file when present). Every smoothie image is generated in both
  // formats; storing the .jpg path here caused the catalog JSON to disagree
  // with the canonical resolver used by Explore-eligibility checks, so
  // otherwise-valid smoothie heroes were being flagged as "not canonical"
  // and blanked once the index endpoint was sanitized like every other
  // collection.
  return `/images/smoothies/${slug.trim().toLowerCase()}.webp`;
}
