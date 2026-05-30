/**
 * Public paths for Pizza Night catalog JSON and imagery (shared golden image dirs).
 */

import { goldenPageImageSet } from "../golden-100/recipe-page-paths.js";

export function pizzaNightPageJsonPath(slug: string): string {
  return `/catalog/pizza-night/pages/${slug}.json`;
}

export function pizzaNightCatalogIndexPath(): string {
  return "/catalog/pizza-night/index.json";
}

/** Pizza Night uses the same editorial image paths as Golden 100. */
export function pizzaNightPageImageSet(slug: string) {
  return goldenPageImageSet(slug);
}
