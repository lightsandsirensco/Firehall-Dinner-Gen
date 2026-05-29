/**
 * Slug-locked Explore image paths — never cross-recipe fallbacks.
 */

import path from "node:path";
import fs from "node:fs";
import { getClassicHallMeal } from "./classic-hall-meals.js";
import { editorialPathForRole } from "./editorial-image-delivery.js";
import { resolveCatalogHeroPath, normalizeCatalogSlug } from "./hall-catalog/gate.js";

export type ExploreCatalogImageKind =
  | "firehall_catalog"
  | "performance_meal"
  | "hall_classic"
  | "smoothie";

export interface SlugLockedImagePaths {
  hero: string;
  thumb: string;
  mobile: string;
  rail: string;
  /** Ordered candidates for card display — first existing file wins at runtime */
  cardCandidates: string[];
}

export function slugLockedImagePaths(slug: string, kind: ExploreCatalogImageKind): SlugLockedImagePaths {
  const s = normalizeCatalogSlug(slug);
  const thumb = editorialPathForRole("thumb", s, "jpg");
  const mobile = editorialPathForRole("mobile", s, "jpg");
  const rail = editorialPathForRole("rail", s, "jpg");

  if (kind === "smoothie") {
    const hero = `/images/smoothies/${s}.jpg`;
    return {
      hero,
      thumb,
      mobile,
      rail,
      cardCandidates: [thumb, hero, mobile, rail],
    };
  }

  if (kind === "hall_classic") {
    const classic = getClassicHallMeal(s);
    const hero = classic?.heroImagePath?.trim() || resolveCatalogHeroPath(s);
    const cardCandidates = classic?.heroImagePath?.trim()
      ? [thumb, classic.heroImagePath.trim(), hero, mobile, rail]
      : [thumb, hero, mobile, rail];
    return {
      hero,
      thumb,
      mobile,
      rail,
      cardCandidates,
    };
  }

  const hero = resolveCatalogHeroPath(s);
  return {
    hero,
    thumb,
    mobile,
    rail,
    cardCandidates: [thumb, hero, mobile, rail],
  };
}

export function publicImageAbsolute(publicPath: string, publicRoot?: string): string {
  const root = publicRoot ?? path.join(process.cwd(), "client", "public");
  const rel = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return path.join(root, rel.replace(/\//g, path.sep));
}

export function imageFileExists(publicPath: string, publicRoot?: string): boolean {
  try {
    return fs.existsSync(publicImageAbsolute(publicPath, publicRoot));
  } catch {
    return false;
  }
}

/** Pick the first slug-locked candidate that exists on disk. */
export function resolveExistingSlugImage(
  slug: string,
  kind: ExploreCatalogImageKind,
  publicRoot?: string,
): { hero: string; thumb: string; cardImage: string; found: boolean } {
  const paths = slugLockedImagePaths(slug, kind);
  const cardImage =
    paths.cardCandidates.find((candidate) => imageFileExists(candidate, publicRoot)) ??
    paths.hero;

  const heroFound = imageFileExists(paths.hero, publicRoot);
  const thumbFound = imageFileExists(paths.thumb, publicRoot);
  const cardFound = imageFileExists(cardImage, publicRoot);

  return {
    hero: paths.hero,
    thumb: paths.thumb,
    cardImage,
    found: heroFound || thumbFound || cardFound,
  };
}
