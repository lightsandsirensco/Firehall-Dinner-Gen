/**
 * Classics Wheel imagery — owned heroes only (no Spoonacular / stock URLs).
 */

import type { ClassicHallMealMeta } from "./classic-hall-meals.js";
import { goldenPageHeroPath, goldenPageMobilePath, goldenPageThumbPath } from "./golden-100/recipe-page-paths.js";
import { resolveSoftHeldImageryLabel } from "./explore-imagery-status.js";

export type ClassicWheelImageryStatus = "approved" | "soft_held";

export interface ClassicWheelImagery {
  heroImage: string;
  thumbImage: string;
  mobileImage: string;
  imageApproved: boolean;
  imageryStatus: ClassicWheelImageryStatus;
  heldImageryLabel: string;
}

const OWNED_HERO_PREFIXES = [
  "/images/golden-100/",
  "/images/explore/",
  "/images/thumbs/",
  "/images/mobile/",
  "/images/rails/",
] as const;

export function isSpoonacularOrExternalHeroUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u) return false;
  if (u.startsWith("http://") || u.startsWith("https://")) {
    return u.includes("spoonacular.com") || !u.includes("/images/");
  }
  return false;
}

export function isOwnedCatalogHeroPath(path: string): boolean {
  const p = path.trim();
  if (!p.startsWith("/images/")) return false;
  return OWNED_HERO_PREFIXES.some((prefix) => p.startsWith(prefix));
}

function resolveOwnedHeroPath(meal: ClassicHallMealMeta): string {
  const pinned = meal.heroImagePath?.trim() ?? "";
  if (pinned && isOwnedCatalogHeroPath(pinned) && !isSpoonacularOrExternalHeroUrl(pinned)) {
    return pinned;
  }
  return goldenPageHeroPath(meal.slug);
}

/** Resolve wheel / package / Explore classic imagery (single source of truth). */
export function resolveClassicWheelImagery(meal: ClassicHallMealMeta): ClassicWheelImagery {
  const heroCandidate = resolveOwnedHeroPath(meal);
  const thumbImage = goldenPageThumbPath(meal.slug);
  const mobileImage = goldenPageMobilePath(meal.slug);
  const imageApproved =
    Boolean(heroCandidate) &&
    isOwnedCatalogHeroPath(heroCandidate) &&
    !isSpoonacularOrExternalHeroUrl(heroCandidate);

  return {
    heroImage: imageApproved ? heroCandidate : "",
    thumbImage,
    mobileImage,
    imageApproved,
    imageryStatus: imageApproved ? "approved" : "soft_held",
    heldImageryLabel: resolveSoftHeldImageryLabel(meal.slug),
  };
}
