/**
 * Catalog-wide image donor overrides — slug → donor slug for remediate scripts.
 * TEMPORARY ONLY — remove once slug owns a unique hero on disk.
 */
export type CatalogImageDonorOverride = {
  donorSlug: string;
  donorCollection: "golden_100" | "breakfast" | "performance_meals" | "hall_expansion";
  /** When true, audit keeps flagging until removed manually. */
  temporary?: boolean;
};

/** No active catalog donor overrides — all slugs use their own heroes after photo replacement project. */
export const CATALOG_IMAGE_DONOR_OVERRIDES: Record<string, CatalogImageDonorOverride> = {};

/** Resolve donor hero public path for copying. */
export function resolveDonorHeroPath(
  donorSlug: string,
  donorCollection: CatalogImageDonorOverride["donorCollection"],
): string {
  switch (donorCollection) {
    case "breakfast":
      return `/images/breakfast/${donorSlug}.jpg`;
    case "hall_expansion":
      return `/images/hall-expansion/${donorSlug}.jpg`;
    case "performance_meals":
    case "golden_100":
    default:
      return `/images/golden-100/${donorSlug}.jpg`;
  }
}
