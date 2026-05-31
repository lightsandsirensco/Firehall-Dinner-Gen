#!/usr/bin/env tsx
/**
 * P0 trust remediation — meal accuracy over uniqueness.
 *
 *   npm run remediate:trust-p0
 *   npm run remediate:trust-p0 -- --only=bbq-breakfast-hash,chicken-parm
 *   npm run remediate:trust-p0 -- --skip-explore
 *   npm run remediate:trust-p0 -- --skip-breakfast
 */
import { loadProjectEnv } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore, getCuratedRecipeBySlug } from "../server/curated-recipe-store.js";
import { runDbMigrations } from "../server/db/migrate.js";
import { flushSqliteToDisk } from "../server/sqlite.js";
import { writeBreakfastCatalogImageVariants, writeEditorialImageVariants } from "../server/imagery/variants.js";
import { attachEditorialImagesToSlug } from "../server/imagery/update-recipe-images.js";
import { createEmptyEditorialImageMetadata } from "../shared/editorial-image-metadata.js";
import {
  BREAKFAST_IMAGE_DONOR_PLAN,
  GOLDEN_100_BREAKFAST_SLUGS,
} from "../shared/breakfast-catalog/image-donor-plan.js";
import { TRUST_FIRST_EXPLORE_DONORS } from "../shared/curated-image-governance/trust-first-explore-donors.js";
import {
  CATALOG_IMAGE_DONOR_OVERRIDES,
  resolveDonorHeroPath,
} from "../shared/catalog-image-donor-overrides.js";
import { HALL_EXPANSION_IMAGE_DONOR_OVERRIDES } from "../shared/hall-expansion/image-donor-overrides.js";
import { assertImageReuseAllowed } from "../shared/scripts/assert-image-reuse-allowed.js";
import {
  hallExpansionHeroPath,
  hallExpansionMobilePath,
  hallExpansionRailPath,
  hallExpansionThumbPath,
} from "../shared/hall-expansion/recipe-page-paths.js";
import { getMobileCropRule } from "../shared/mobile-crop-rules.js";
import { loadSharp } from "../server/imagery/sharp-utils.js";
import { readBreakfastRecipePageFromDisk, writeBreakfastRecipePage, writeBreakfastCatalogIndex } from "../server/breakfast-catalog/page-store.js";
import { readBreakfastCatalogIndexFromDisk } from "../server/breakfast-catalog/catalog.js";

const PUBLIC = path.join(process.cwd(), "client/public");

function parseOnly(argv: string[]): Set<string> | null {
  const arg = argv.find((a) => a.startsWith("--only="));
  if (!arg) return null;
  return new Set(arg.replace("--only=", "").split(",").map((s) => s.trim()).filter(Boolean));
}

function readDonorBuffer(donorSlug: string): Buffer {
  for (const rel of [
    `/images/breakfast/${donorSlug}.jpg`,
    `/images/golden-100/${donorSlug}.jpg`,
    `/images/hall-expansion/${donorSlug}.jpg`,
  ]) {
    const abs = path.join(PUBLIC, rel.replace(/^\//, ""));
    if (fs.existsSync(abs)) return fs.readFileSync(abs);
  }
  throw new Error(`Donor hero missing: ${donorSlug}`);
}

function syncBreakfastCatalog(slug: string, paths: { hero: string; thumb: string }): void {
  const page = readBreakfastRecipePageFromDisk(slug);
  if (page) {
    page.heroImage = paths.hero;
    page.thumbImage = paths.thumb;
    page.updatedAt = new Date().toISOString();
    writeBreakfastRecipePage(page);
  }
  const index = readBreakfastCatalogIndexFromDisk();
  if (!index) return;
  for (const entry of index.recipes) {
    if (entry.slug === slug) {
      entry.heroImage = paths.hero;
      entry.thumbImage = paths.thumb;
    }
  }
  writeBreakfastCatalogIndex(index);
}

function syncExplore(slug: string, paths: { hero: string; thumb: string; mobile: string; rail: string }): boolean {
  initCuratedRecipeStore();
  const recipe = getCuratedRecipeBySlug(slug);
  if (!recipe) return false;
  const meta = createEmptyEditorialImageMetadata(slug, "breakfast_shift", slug, 2);
  meta.heroImage = paths.hero;
  meta.thumbnailImage = paths.thumb;
  meta.mobileHeroImage = paths.mobile;
  meta.railPreviewImage = paths.rail;
  meta.imageApproved = true;
  meta.generatedAt = new Date().toISOString();
  return attachEditorialImagesToSlug({ slug, metadata: meta, markApproved: true, forceApprove: true });
}

async function applyBreakfastDonor(slug: string, donorSlug: string): Promise<void> {
  const isGolden = GOLDEN_100_BREAKFAST_SLUGS.has(slug);
  const buffer = readDonorBuffer(donorSlug);
  const paths = isGolden
    ? await (async () => {
        const v = await writeEditorialImageVariants(slug, buffer, "breakfast_shift", 2);
        return { hero: v.hero, thumb: v.thumb, mobile: v.mobile, rail: v.rail };
      })()
    : await writeBreakfastCatalogImageVariants(slug, buffer, 2);

  if (!isGolden) syncBreakfastCatalog(slug, paths);
  syncExplore(slug, paths);
  console.log(`  ✓ breakfast ${slug} ← ${donorSlug}`);
}

async function applyGoldenDonor(slug: string, donorSlug: string, stylePreset: "healthy_performance" | "breakfast_shift" = "healthy_performance"): Promise<void> {
  const buffer = readDonorBuffer(donorSlug);
  const paths = await writeEditorialImageVariants(slug, buffer, stylePreset, 2);
  syncExplore(slug, paths);
  console.log(`  ✓ golden/explore ${slug} ← ${donorSlug}`);
}

async function resizeVariant(
  buffer: Buffer,
  width: number,
  height: number,
  position: string,
): Promise<Buffer> {
  const sharp = await loadSharp();
  if (!sharp) return buffer;
  try {
    return await sharp(buffer)
      .resize(width, height, { fit: "cover", position })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  } catch {
    return buffer;
  }
}

async function writeHallExpansionVariants(slug: string, heroBuffer: Buffer): Promise<void> {
  const specs = getMobileCropRule("firehall_editorial_v1").variants;
  const mobileBuf = await resizeVariant(
    heroBuffer,
    specs.mobile.width,
    specs.mobile.height,
    specs.mobile.cropPosition,
  );
  const thumbBuf = await resizeVariant(
    heroBuffer,
    specs.thumb.width,
    specs.thumb.height,
    specs.thumb.cropPosition,
  );
  const railBuf = await resizeVariant(
    heroBuffer,
    specs.rail.width,
    specs.rail.height,
    specs.rail.cropPosition,
  );

  const targets = [
    path.join(PUBLIC, hallExpansionHeroPath(slug).replace(/^\//, "")),
    path.join(PUBLIC, hallExpansionThumbPath(slug).replace(/^\//, "")),
    path.join(PUBLIC, hallExpansionMobilePath(slug).replace(/^\//, "")),
    path.join(PUBLIC, hallExpansionRailPath(slug).replace(/^\//, "")),
  ];
  const buffers = [heroBuffer, thumbBuf, mobileBuf, railBuf];
  for (let i = 0; i < targets.length; i += 1) {
    fs.mkdirSync(path.dirname(targets[i]!), { recursive: true });
    fs.writeFileSync(targets[i]!, buffers[i]!);
  }
}

async function applyHallExpansionDonor(slug: string, donorSlug: string): Promise<void> {
  const buffer = readDonorBuffer(donorSlug);
  await writeHallExpansionVariants(slug, buffer);
  console.log(`  ✓ hall-expansion ${slug} ← ${donorSlug}`);
}

async function main(): Promise<void> {
  assertImageReuseAllowed("remediate:trust-p0");
  const only = parseOnly(process.argv);
  const skipBreakfast = process.argv.includes("--skip-breakfast");
  const skipExplore = process.argv.includes("--skip-explore");
  const skipCatalog = process.argv.includes("--skip-catalog");
  const skipHall = process.argv.includes("--skip-hall");

  await runDbMigrations();
  initCuratedRecipeStore();

  let ok = 0;
  let fail = 0;

  if (!skipBreakfast) {
    console.log("[remediate:trust-p0] breakfast donors…");
    for (const [slug, donorSlug] of Object.entries(BREAKFAST_IMAGE_DONOR_PLAN)) {
      if (only && !only.has(slug)) continue;
      if (slug === donorSlug) continue;
      try {
        await applyBreakfastDonor(slug, donorSlug);
        ok++;
      } catch (err) {
        fail++;
        console.warn(`  ✗ breakfast ${slug}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  if (!skipCatalog) {
    console.log("[remediate:trust-p0] catalog donors…");
    for (const [slug, override] of Object.entries(CATALOG_IMAGE_DONOR_OVERRIDES)) {
      if (only && !only.has(slug)) continue;
      try {
        const donorPath = resolveDonorHeroPath(override.donorSlug, override.donorCollection);
        const buffer = fs.readFileSync(path.join(PUBLIC, donorPath.replace(/^\//, "")));
        const preset = override.donorCollection === "breakfast" ? "breakfast_shift" : "healthy_performance";
        const paths = await writeEditorialImageVariants(slug, buffer, preset, 2);
        syncExplore(slug, paths);
        console.log(`  ✓ catalog ${slug} ← ${override.donorSlug}`);
        ok++;
      } catch (err) {
        fail++;
        console.warn(`  ✗ catalog ${slug}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  if (!skipExplore) {
    console.log("[remediate:trust-p0] explore trust donors…");
    for (const [slug, donorSlug] of Object.entries(TRUST_FIRST_EXPLORE_DONORS)) {
      if (only && !only.has(slug)) continue;
      if (slug === donorSlug) continue;
      try {
        await applyGoldenDonor(slug, donorSlug);
        ok++;
      } catch (err) {
        fail++;
        console.warn(`  ✗ explore ${slug}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  if (!skipHall) {
    console.log("[remediate:trust-p0] hall-expansion donors…");
    const hallIndex = JSON.parse(
      fs.readFileSync(path.join(PUBLIC, "catalog/hall-expansion/index.json"), "utf8"),
    ) as { recipes: Array<{ slug: string }> };
    const hallSlugs = new Set(hallIndex.recipes.map((r) => r.slug));

    for (const [slug, donorSlug] of Object.entries(HALL_EXPANSION_IMAGE_DONOR_OVERRIDES)) {
      if (!hallSlugs.has(slug)) continue;
      if (only && !only.has(slug)) continue;
      if (slug === donorSlug) continue;
      try {
        await applyHallExpansionDonor(slug, donorSlug);
        ok++;
      } catch (err) {
        fail++;
        console.warn(`  ✗ hall-expansion ${slug}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  await flushSqliteToDisk();
  console.log(`[remediate:trust-p0] done ok=${ok} fail=${fail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
