export function smoothieRecipePath(slug: string): string {
  return `/smoothies/${slug}`;
}

export function smoothiesIndexPath(): string {
  return "/smoothies";
}

export function breakfastIndexPath(): string {
  return "/breakfast";
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
  return `/images/smoothies/${slug.trim().toLowerCase()}.jpg`;
}
