#!/usr/bin/env tsx
/**
 * Bootstrap missing hero/thumb/mobile/rail images for batch-250 expansion + breakfast seeds.
 * Copies from same-protein hall-expansion or breakfast peers until editorial imagery runs.
 */
import fs from "node:fs";
import path from "node:path";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import { resolveExistingSlugImage } from "../shared/explore-image-paths.js";
import { BATCH_250_RECIPES } from "../shared/hall-expansion/adapted/batch-250.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client/public");

const EXPANSION_DONORS = [
  "smoked-turkey-breast",
  "smoked-meatloaf",
  "fajita-bar-night",
  "pasta-bar-night",
  "hall-burger-bar",
];

const BREAKFAST_DONORS = [
  "cowboy-breakfast-skillet",
  "red-lead-skillet",
  "apple-cinnamon-baked-oatmeal",
  "hall-sausage-biscuits-gravy",
];

function copyIfMissing(srcRel: string, destRel: string): boolean {
  const src = path.join(PUBLIC, srcRel.replace(/^\//, ""));
  const dest = path.join(PUBLIC, destRel.replace(/^\//, ""));
  if (fs.existsSync(dest)) return false;
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function bootstrapHallExpansion(slug: string, donor: string): number {
  let n = 0;
  const pairs = [
    [`/images/hall-expansion/${donor}.jpg`, `/images/hall-expansion/${slug}.jpg`],
    [`/images/thumbs/hall-expansion/${donor}.jpg`, `/images/thumbs/hall-expansion/${slug}.jpg`],
    [`/images/mobile/hall-expansion/${donor}.jpg`, `/images/mobile/hall-expansion/${slug}.jpg`],
    [`/images/rails/hall-expansion/${donor}.jpg`, `/images/rails/hall-expansion/${slug}.jpg`],
  ];
  for (const [src, dest] of pairs) {
    if (copyIfMissing(src, dest)) n += 1;
  }
  return n;
}

function bootstrapBreakfast(slug: string, donor: string): number {
  let n = 0;
  const pairs = [
    [`/images/breakfast/${donor}.jpg`, `/images/breakfast/${slug}.jpg`],
    [`/images/thumbs/breakfast/${donor}.jpg`, `/images/thumbs/breakfast/${slug}.jpg`],
  ];
  for (const [src, dest] of pairs) {
    if (copyIfMissing(src, dest)) n += 1;
  }
  return n;
}

function main(): void {
  let copied = 0;
  const batchSlugs = new Set(BATCH_250_RECIPES.map((r) => r.slug));

  for (const [i, slug] of [...batchSlugs].entries()) {
    const resolved = resolveExistingSlugImage(slug, "hall_expansion");
    if (resolved.found) continue;
    const donor = EXPANSION_DONORS[i % EXPANSION_DONORS.length]!;
    copied += bootstrapHallExpansion(slug, donor);
  }

  const catalog = buildApprovedCatalog();
  for (const entry of catalog.recipes) {
    if (entry.isSmoothie) continue;
    const resolved = resolveExistingSlugImage(entry.slug, entry.kind);
    if (resolved.found) continue;
    if (entry.kind === "breakfast_catalog") {
      const donor = BREAKFAST_DONORS[entry.slug.length % BREAKFAST_DONORS.length]!;
      copied += bootstrapBreakfast(entry.slug, donor);
    } else if (batchSlugs.has(entry.slug)) {
      copied += bootstrapHallExpansion(entry.slug, EXPANSION_DONORS[0]!);
    }
  }

  console.log(`[bootstrap-catalog-250-images] copied ${copied} asset files`);
}

main();
