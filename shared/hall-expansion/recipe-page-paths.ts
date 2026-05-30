export function hallExpansionHeroPath(slug: string): string {
  return `/images/hall-expansion/${slug}.jpg`;
}

export function hallExpansionThumbPath(slug: string): string {
  return `/images/thumbs/hall-expansion/${slug}.jpg`;
}

export function hallExpansionMobilePath(slug: string): string {
  return `/images/mobile/hall-expansion/${slug}.jpg`;
}

export function hallExpansionRailPath(slug: string): string {
  return `/images/rails/hall-expansion/${slug}.jpg`;
}

export function hallExpansionPageImageSet(slug: string) {
  return {
    heroImage: hallExpansionHeroPath(slug),
    thumbImage: hallExpansionThumbPath(slug),
    mobileImage: hallExpansionMobilePath(slug),
    railImage: hallExpansionRailPath(slug),
  };
}

export function hallExpansionCatalogPagePath(slug: string): string {
  return `/catalog/hall-expansion/pages/${slug}.json`;
}

export function hallExpansionCatalogIndexPath(): string {
  return "/catalog/hall-expansion/index.json";
}

export function hallExpansionRecipeUrlPath(slug: string): string {
  return `/recipes/${slug}`;
}
