/** Explore grid pagination — mobile Safari must not mount the full catalog at once. */
export const EXPLORE_CATALOG_PAGE_SIZE_MOBILE = 24;
export const EXPLORE_CATALOG_PAGE_SIZE_DESKTOP = 48;

export function exploreCatalogPageSize(isMobile: boolean): number {
  return isMobile ? EXPLORE_CATALOG_PAGE_SIZE_MOBILE : EXPLORE_CATALOG_PAGE_SIZE_DESKTOP;
}
