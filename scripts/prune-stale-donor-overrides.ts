#!/usr/bin/env tsx
/** One-off analysis — stale vs active donor override mappings. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { BREAKFAST_IMAGE_DONOR_PLAN } from "../shared/breakfast-catalog/image-donor-plan.js";
import {
  CATALOG_IMAGE_DONOR_OVERRIDES,
  resolveDonorHeroPath,
  type CatalogImageDonorOverride,
} from "../shared/catalog-image-donor-overrides.js";
import { HALL_EXPANSION_IMAGE_DONOR_OVERRIDES } from "../shared/hall-expansion/image-donor-overrides.js";
import { TRUST_FIRST_EXPLORE_DONORS } from "../shared/curated-image-governance/trust-first-explore-donors.js";
import { hallExpansionHeroPath } from "../shared/hall-expansion/recipe-page-paths.js";
import { breakfastCatalogHeroPath } from "../shared/breakfast-catalog/slug-registry.js";
import { golden100HeroPath } from "../server/imagery/paths.js";

const PUBLIC = path.join(process.cwd(), "client/public");

function md5Public(publicPath: string): string | null {
  const abs = path.join(PUBLIC, publicPath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return null;
  return crypto.createHash("md5").update(fs.readFileSync(abs)).digest("hex");
}

function classify(slug: string, donorSlug: string, ownPath: string, donorPath: string) {
  const ownMd5 = md5Public(ownPath);
  const donorMd5 = md5Public(donorPath);
  if (!ownMd5) return "missing_own";
  if (ownMd5 && donorMd5 && ownMd5 === donorMd5) return "active_copy";
  return "stale";
}

const breakfastStale: string[] = [];
const breakfastActive: string[] = [];
const breakfastMissing: string[] = [];

for (const [slug, donor] of Object.entries(BREAKFAST_IMAGE_DONOR_PLAN)) {
  const result = classify(
    slug,
    donor,
    breakfastCatalogHeroPath(slug),
    breakfastCatalogHeroPath(donor),
  );
  if (result === "stale") breakfastStale.push(slug);
  else if (result === "active_copy") breakfastActive.push(slug);
  else breakfastMissing.push(slug);
}

console.log("breakfast", {
  total: Object.keys(BREAKFAST_IMAGE_DONOR_PLAN).length,
  stale: breakfastStale.length,
  active: breakfastActive.length,
  missing: breakfastMissing.length,
});
console.log("breakfast stale:", breakfastStale.join(", ") || "(none)");
console.log("breakfast active:", breakfastActive.join(", ") || "(none)");
console.log("breakfast missing:", breakfastMissing.join(", ") || "(none)");

let hallStale = 0;
let hallActive = 0;
for (const [slug, donor] of Object.entries(HALL_EXPANSION_IMAGE_DONOR_OVERRIDES)) {
  const r = classify(slug, donor, hallExpansionHeroPath(slug), golden100HeroPath(donor));
  if (r === "active_copy") hallActive++;
  else if (r === "stale") hallStale++;
}
console.log("hall", { total: Object.keys(HALL_EXPANSION_IMAGE_DONOR_OVERRIDES).length, stale: hallStale, active: hallActive });

for (const [slug, override] of Object.entries(CATALOG_IMAGE_DONOR_OVERRIDES)) {
  const o = override as CatalogImageDonorOverride;
  const own = golden100HeroPath(slug);
  const donor = resolveDonorHeroPath(o.donorSlug, o.donorCollection);
  console.log("catalog", slug, classify(slug, o.donorSlug, own, donor));
}
