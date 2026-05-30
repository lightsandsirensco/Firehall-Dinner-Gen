/**
 * Catalog-wide image donor overrides — slug → donor slug for remediate scripts.
 * Donor paths resolve per collection (Golden editorial, breakfast, hall-expansion).
 */
export type CatalogImageDonorOverride = {
  donorSlug: string;
  donorCollection: "golden_100" | "breakfast" | "performance_meals" | "hall_expansion";
};

export const CATALOG_IMAGE_DONOR_OVERRIDES: Record<string, CatalogImageDonorOverride> = {
  /** Golden 100 hash was showing dessert square — use breakfast skillet hash hero. */
  "bacon-egg-hash": { donorSlug: "bacon-egg-hash-skillet", donorCollection: "breakfast" },
  /** Performance egg casserole — use accurate breakfast egg bake hero. */
  "veggie-egg-casserole-tray": { donorSlug: "ham-cheddar-egg-bake", donorCollection: "breakfast" },
  /** Golden loaded nacho skillet — share accurate nacho bar hero until regen. */
  "loaded-nacho-skillet": { donorSlug: "game-day-nachos", donorCollection: "golden_100" },
};

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
