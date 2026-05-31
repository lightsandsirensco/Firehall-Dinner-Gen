/**
 * Slug-locked Explore image paths — never cross-recipe fallbacks.
 */

import path from "node:path";
import fs from "node:fs";
import { getClassicHallMeal } from "./classic-hall-meals.js";
import { editorialPathForRole } from "./editorial-image-delivery.js";
import { resolveCatalogHeroPath, normalizeCatalogSlug } from "./hall-catalog/gate.js";
import { hallExpansionHeroPath, hallExpansionThumbPath } from "./hall-expansion/recipe-page-paths.js";
import {
  breakfastCatalogHeroPath,
  breakfastCatalogThumbPath,
} from "./breakfast-catalog/slug-registry.js";
import {
  bbqCatalogHeroPath,
  bbqCatalogThumbPath,
} from "./bbq-catalog/slug-registry.js";

export type ExploreCatalogImageKind =
  | "firehall_catalog"
  | "performance_meal"
  | "hall_expansion"
  | "breakfast_catalog"
  | "bbq_catalog"
  | "hall_classic"
  | "smoothie";

export interface SlugLockedImagePaths {
  hero: string;
  thumb: string;
  mobile: string;
  rail: string;
  /** Canonical hero only — Explore never borrows thumb/mobile/rail fallbacks. */
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
      cardCandidates: [hero],
    };
  }

  if (kind === "hall_classic") {
    const classic = getClassicHallMeal(s);
    const hero = classic?.heroImagePath?.trim() || resolveCatalogHeroPath(s);
    const cardCandidates = [hero];
    return {
      hero,
      thumb,
      mobile,
      rail,
      cardCandidates,
    };
  }

  if (kind === "hall_expansion") {
    const hero = hallExpansionHeroPath(s);
    const expansionThumb = hallExpansionThumbPath(s);
    return {
      hero,
      thumb: expansionThumb,
      mobile: `/images/mobile/hall-expansion/${s}.jpg`,
      rail: `/images/rails/hall-expansion/${s}.jpg`,
      cardCandidates: [hero],
    };
  }

  if (kind === "breakfast_catalog") {
    const hero = breakfastCatalogHeroPath(s);
    const breakfastThumb = breakfastCatalogThumbPath(s);
    return {
      hero,
      thumb: breakfastThumb,
      mobile: `/images/mobile/breakfast/${s}.jpg`,
      rail: `/images/rails/breakfast/${s}.jpg`,
      cardCandidates: [hero],
    };
  }

  if (kind === "bbq_catalog") {
    const hero = bbqCatalogHeroPath(s);
    const bbqThumb = bbqCatalogThumbPath(s);
    return {
      hero,
      thumb: bbqThumb,
      mobile: `/images/mobile/smoker-catalog/${s}.jpg`,
      rail: `/images/rails/smoker-catalog/${s}.jpg`,
      cardCandidates: [hero],
    };
  }

  const hero = resolveCatalogHeroPath(s);
  return {
    hero,
    thumb,
    mobile,
    rail,
    cardCandidates: [hero],
  };
}

export function publicImageAbsolute(publicPath: string, publicRoot?: string): string {
  const root = publicRoot ?? path.join(process.cwd(), "client", "public");
  const rel = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return path.join(root, rel.replace(/\//g, path.sep));
}

export function imageFileExists(publicPath: string, publicRoot?: string): boolean {
  const trimmed = (publicPath || "").trim();
  if (!trimmed) return false;
  try {
    const abs = publicImageAbsolute(trimmed, publicRoot);
    return fs.existsSync(abs) && fs.statSync(abs).isFile();
  } catch {
    return false;
  }
}

/** Resolve slug-locked hero only — never substitute neighboring variants. */
export function resolveExistingSlugImage(
  slug: string,
  kind: ExploreCatalogImageKind,
  publicRoot?: string,
): { hero: string; thumb: string; cardImage: string; found: boolean } {
  const paths = slugLockedImagePaths(slug, kind);
  const heroFound = imageFileExists(paths.hero, publicRoot);

  return {
    hero: paths.hero,
    thumb: paths.thumb,
    cardImage: paths.thumb || paths.rail || paths.mobile,
    found: heroFound,
  };
}
