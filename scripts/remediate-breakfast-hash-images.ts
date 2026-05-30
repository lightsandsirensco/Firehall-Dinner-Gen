#!/usr/bin/env tsx
/**
 * Assign hash heroes from accurate breakfast donors (superseded by npm run remediate:trust-p0).
 *
 *   npm run remediate:breakfast-hash-images -- --donor-only
 */
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore, getCuratedRecipeBySlug } from "../server/curated-recipe-store.js";
import { runDbMigrations } from "../server/db/migrate.js";
import { flushSqliteToDisk } from "../server/sqlite.js";
import { writeBreakfastCatalogImageVariants, writeEditorialImageVariants } from "../server/imagery/variants.js";
import { attachEditorialImagesToSlug } from "../server/imagery/update-recipe-images.js";
import { createEmptyEditorialImageMetadata } from "../shared/editorial-image-metadata.js";
import { readBreakfastRecipePageFromDisk, writeBreakfastRecipePage, writeBreakfastCatalogIndex } from "../server/breakfast-catalog/page-store.js";
import { readBreakfastCatalogIndexFromDisk } from "../server/breakfast-catalog/catalog.js";
import { GOLDEN_100_BREAKFAST_SLUGS } from "../shared/breakfast-catalog/image-donor-plan.js";

const PUBLIC = path.join(process.cwd(), "client/public");

/** Target slug → accurate breakfast hash donor (duplicates OK). */
const HASH_UNIQUE_DONORS: Record<string, string> = {
  "bbq-breakfast-hash": "bacon-egg-hash-skillet",
  "bacon-egg-hash-skillet": "bacon-egg-hash-skillet",
  "steakhouse-hash-skillet": "bacon-egg-hash-skillet",
  "sheet-pan-breakfast-hash": "chorizo-breakfast-hash",
  "bacon-egg-hash": "bacon-egg-hash-skillet",
};

function readBuffer(donorSlug: string): Buffer {
  for (const rel of [
    `/images/breakfast/${donorSlug}.jpg`,
    `/images/golden-100/${donorSlug}.jpg`,
  ]) {
    const abs = path.join(PUBLIC, rel.replace(/^\//, ""));
    if (fs.existsSync(abs)) return fs.readFileSync(abs);
  }
  throw new Error(`missing donor ${donorSlug}`);
}

async function syncCatalog(slug: string, paths: { hero: string; thumb: string }): Promise<void> {
  const page = readBreakfastRecipePageFromDisk(slug);
  if (!page) return;
  page.heroImage = paths.hero;
  page.thumbImage = paths.thumb;
  page.updatedAt = new Date().toISOString();
  writeBreakfastRecipePage(page);
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

async function syncExplore(slug: string, paths: { hero: string; thumb: string; mobile: string; rail: string }): Promise<void> {
  initCuratedRecipeStore();
  const recipe = getCuratedRecipeBySlug(slug);
  if (!recipe) return;
  const meta = createEmptyEditorialImageMetadata(slug, "breakfast_shift", slug, 4);
  meta.heroImage = paths.hero;
  meta.thumbnailImage = paths.thumb;
  meta.mobileHeroImage = paths.mobile;
  meta.railPreviewImage = paths.rail;
  meta.imageApproved = true;
  attachEditorialImagesToSlug({ slug, metadata: meta, markApproved: true, forceApprove: true });
}

async function main(): Promise<void> {
  await runDbMigrations();
  initCuratedRecipeStore();

  for (const [slug, donor] of Object.entries(HASH_UNIQUE_DONORS)) {
    const buffer = readBuffer(donor);
    const isGolden = GOLDEN_100_BREAKFAST_SLUGS.has(slug);
    const paths = isGolden
      ? await (async () => {
          const v = await writeEditorialImageVariants(slug, buffer, "breakfast_shift", 4);
          return { hero: v.hero, thumb: v.thumb, mobile: v.mobile, rail: v.rail };
        })()
      : await writeBreakfastCatalogImageVariants(slug, buffer, 4);

    if (!isGolden) await syncCatalog(slug, paths);
    await syncExplore(slug, paths);
    console.log(`  ✓ ${slug} ← ${donor}`);
  }

  await flushSqliteToDisk();
  console.log("[remediate:breakfast-hash-images] done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
