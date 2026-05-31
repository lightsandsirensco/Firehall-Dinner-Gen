/**
 * Image donor override resolver — slug-locked heroes first.
 * Configured donors apply only while the recipe hero is missing or still byte-identical to the donor.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import { BREAKFAST_IMAGE_DONOR_PLAN } from "./breakfast-catalog/image-donor-plan.js";
import {
  CATALOG_IMAGE_DONOR_OVERRIDES,
  resolveDonorHeroPath,
} from "./catalog-image-donor-overrides.js";
import { TRUST_FIRST_EXPLORE_DONORS } from "./curated-image-governance/trust-first-explore-donors.js";
import { HALL_EXPANSION_IMAGE_DONOR_OVERRIDES } from "./hall-expansion/image-donor-overrides.js";
import { imageFileExists, publicImageAbsolute } from "./explore-image-paths.js";
import { normalizeCatalogSlug } from "./hall-catalog/gate.js";

function md5PublicImage(publicPath: string, publicRoot?: string): string | null {
  const trimmed = (publicPath || "").trim();
  if (!trimmed || !imageFileExists(trimmed, publicRoot)) return null;
  try {
    const abs = publicImageAbsolute(trimmed, publicRoot);
    return crypto.createHash("md5").update(fs.readFileSync(abs)).digest("hex");
  } catch {
    return null;
  }
}

export type ImageDonorOverrideSource =
  | "breakfast_plan"
  | "hall_expansion"
  | "catalog"
  | "trust_first";

/** Raw configured donor slug (ignores staleness). */
export function lookupConfiguredImageDonorSlug(slug: string): string | null {
  const s = normalizeCatalogSlug(slug);
  if (BREAKFAST_IMAGE_DONOR_PLAN[s]) return BREAKFAST_IMAGE_DONOR_PLAN[s];
  if (HALL_EXPANSION_IMAGE_DONOR_OVERRIDES[s]) return HALL_EXPANSION_IMAGE_DONOR_OVERRIDES[s];
  const catalog = CATALOG_IMAGE_DONOR_OVERRIDES[s];
  if (catalog?.donorSlug) return catalog.donorSlug;
  if (TRUST_FIRST_EXPLORE_DONORS[s]) return TRUST_FIRST_EXPLORE_DONORS[s];
  return null;
}

/** Resolve donor hero public path for a slug/donor pair. */
export function resolveConfiguredDonorHeroPath(slug: string, donorSlug: string): string {
  const s = normalizeCatalogSlug(slug);
  const catalog = CATALOG_IMAGE_DONOR_OVERRIDES[s];
  if (catalog?.donorSlug === donorSlug) {
    return resolveDonorHeroPath(catalog.donorSlug, catalog.donorCollection);
  }
  if (BREAKFAST_IMAGE_DONOR_PLAN[s] === donorSlug || BREAKFAST_IMAGE_DONOR_PLAN[donorSlug]) {
    return `/images/breakfast/${donorSlug}.jpg`;
  }
  if (HALL_EXPANSION_IMAGE_DONOR_OVERRIDES[s] === donorSlug) {
    return `/images/hall-expansion/${donorSlug}.jpg`;
  }
  return `/images/golden-100/${donorSlug}.jpg`;
}

/** Donor override is active only when hero is missing or still matches donor bytes. */
export function isImageDonorOverrideActive(
  slug: string,
  heroPath: string,
  options: {
    heroMd5?: string | null;
    donorSlug?: string | null;
    publicRoot?: string;
  } = {},
): boolean {
  const donorSlug = options.donorSlug ?? lookupConfiguredImageDonorSlug(slug);
  if (!donorSlug || donorSlug === normalizeCatalogSlug(slug)) return false;

  const heroExists = imageFileExists(heroPath, options.publicRoot);
  if (!heroExists) return true;

  const heroMd5 = options.heroMd5 ?? md5PublicImage(heroPath, options.publicRoot);
  const donorPath = resolveConfiguredDonorHeroPath(slug, donorSlug);
  const donorMd5 = md5PublicImage(donorPath, options.publicRoot);

  if (!heroMd5 || !donorMd5) return false;
  return heroMd5 === donorMd5;
}

/** Active donor slug for audits/remediation — null when recipe owns a unique hero. */
export function resolveActiveImageDonorSlug(
  slug: string,
  heroPath: string,
  options: { heroMd5?: string | null; publicRoot?: string } = {},
): string | null {
  const donorSlug = lookupConfiguredImageDonorSlug(slug);
  if (!donorSlug) return null;
  return isImageDonorOverrideActive(slug, heroPath, { ...options, donorSlug }) ? donorSlug : null;
}

/** @deprecated pass heroPath for staleness-aware resolution */
export function configuredImageDonorSlug(
  slug: string,
  heroPath?: string,
  options: { heroMd5?: string | null; publicRoot?: string } = {},
): string | null {
  if (heroPath) {
    return resolveActiveImageDonorSlug(slug, heroPath, options);
  }
  return lookupConfiguredImageDonorSlug(slug);
}
