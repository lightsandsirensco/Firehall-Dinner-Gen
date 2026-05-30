#!/usr/bin/env tsx
/**
 * Fix Explore curated rows whose hero_image paths are missing on disk.
 * Copies slug-locked variants from governance-approved donor slugs.
 *
 *   npm run remediate:explore-missing-images
 *   npm run remediate:explore-missing-images -- --dry-run
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { loadMergedHallCatalogIndex } from "../server/meal-catalog/load-index.js";
import {
  buildCuratedMealImageProfile,
  validateCuratedImageGovernance,
} from "../shared/curated-image-governance/index.js";
import {
  EXPLORE_IMAGE_SLUG_OVERRIDES,
  EXPLORE_PROTEIN_FIXES,
  EXPLORE_MEAL_FORMAT_FIXES,
} from "../shared/curated-image-governance/explore-image-overrides.js";
import { goldenPageImageSet } from "../shared/golden-100/recipe-page-paths.js";
import { writeEditorialImageVariants } from "../server/imagery/variants.js";
import {
  createEmptyEditorialImageMetadata,
  parseEditorialImageMetadata,
} from "../shared/editorial-image-metadata.js";
import type { ImageStylePresetId } from "../shared/image-style-presets.js";
import { imageFileExists } from "../shared/explore-image-paths.js";
import { breakfastCatalogHeroPath } from "../shared/breakfast-catalog/slug-registry.js";
import { attachEditorialImagesToSlug } from "../server/imagery/update-recipe-images.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";

type Row = {
  recipe_id: string;
  slug: string;
  title: string;
  protein: string;
  cuisine: string;
  meal_format: string;
  hero_image: string;
  editorial_image_json: string | null;
  status: string;
};

const PUBLIC = path.join(process.cwd(), "client/public");
const REVIEW = path.join(process.cwd(), "review/explore-missing-images-remediation.json");

function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function readDonorBuffer(donorSlug: string): Buffer | null {
  for (const rel of [
    `/images/golden-100/${donorSlug}.jpg`,
    `/images/hall-expansion/${donorSlug}.jpg`,
    `/images/breakfast/${donorSlug}.jpg`,
  ]) {
    const abs = path.join(PUBLIC, rel.replace(/^\//, ""));
    if (fs.existsSync(abs)) return fs.readFileSync(abs);
  }
  return null;
}

function passes(row: Row, paths: ReturnType<typeof goldenPageImageSet>): boolean {
  const profile = buildCuratedMealImageProfile({
    slug: row.slug,
    title: row.title,
    protein: row.protein,
    cuisine: row.cuisine,
    mealFormat: row.meal_format,
  });
  return validateCuratedImageGovernance({
    profile,
    heroImage: paths.heroImage,
    thumbImage: paths.thumbImage,
    mobileImage: paths.mobileImage,
    imageApproved: true,
    publishGate: row.status === "published",
  }).pass;
}

function resolveDonor(row: Row, hallByTitle: Map<string, string[]>): string | null {
  if (EXPLORE_IMAGE_SLUG_OVERRIDES[row.slug]) {
    const donor = EXPLORE_IMAGE_SLUG_OVERRIDES[row.slug];
    const paths = goldenPageImageSet(donor);
    if (imageFileExists(paths.heroImage)) return donor;
  }

  const ownPaths = goldenPageImageSet(row.slug);
  if (imageFileExists(ownPaths.heroImage) && passes(row, ownPaths)) return row.slug;

  const titleMatches = hallByTitle.get(normalizeTitle(row.title)) || [];
  if (titleMatches.length === 1) {
    const donor = titleMatches[0]!;
    const paths = goldenPageImageSet(donor);
    if (imageFileExists(paths.heroImage) && passes(row, paths)) return donor;
  }

  const protein = row.protein.toLowerCase();
  const format = row.meal_format.toLowerCase();
  for (const candidate of GOLDEN_100_RECIPES) {
    const slug = candidate.classicSlug || candidate.slug;
    const paths = goldenPageImageSet(slug);
    if (!imageFileExists(paths.heroImage)) continue;
    if (candidate.protein !== protein && protein !== "any") continue;
    if (candidate.mealFormat !== format && format !== "plated_main") {
      /* allow loose format match for imports */
    }
    if (passes(row, paths)) return slug;
  }

  for (const candidate of GOLDEN_100_RECIPES) {
    const slug = candidate.classicSlug || candidate.slug;
    const paths = goldenPageImageSet(slug);
    if (!imageFileExists(paths.heroImage)) continue;
    if (passes(row, paths)) return slug;
  }

  return null;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();

  const hallIndex = loadMergedHallCatalogIndex();
  const hallByTitle = new Map<string, string[]>();
  for (const entry of hallIndex.recipes) {
    const key = normalizeTitle(entry.title);
    const list = hallByTitle.get(key) || [];
    list.push(entry.slug);
    hallByTitle.set(key, list);
  }

  const rows = db
    .prepare(
      `SELECT recipe_id, slug, title, protein, cuisine, meal_format, hero_image, editorial_image_json, status
       FROM curated_recipes
       WHERE status IN ('published', 'approved', 'review')`,
    )
    .all() as Row[];

  const results: Array<Record<string, unknown>> = [];
  let fixed = 0;
  let demoted = 0;
  let skipped = 0;

  for (const row of rows) {
    const protein = EXPLORE_PROTEIN_FIXES[row.slug] || row.protein;
    const mealFormat = EXPLORE_MEAL_FORMAT_FIXES[row.slug] || row.meal_format;
    const working = { ...row, protein, meal_format: mealFormat };

    const heroPath = (
      working.hero_image || goldenPageImageSet(working.slug).heroImage
    ).trim();
    const breakfastHero = breakfastCatalogHeroPath(working.slug);
    if (imageFileExists(breakfastHero) || imageFileExists(heroPath)) {
      skipped++;
      continue;
    }

    const donor = resolveDonor(working, hallByTitle);
    if (!donor) {
      if ((working.status === "published" || working.status === "approved") && !dryRun) {
        db.prepare(
          `UPDATE curated_recipes SET status = 'review', updated_at = datetime('now') WHERE recipe_id = ?`,
        ).run(working.recipe_id);
        demoted++;
      }
      results.push({ slug: working.slug, action: "demoted_or_skipped", status: working.status });
      continue;
    }

    const donorBuf = readDonorBuffer(donor);
    if (!donorBuf) {
      results.push({ slug: working.slug, action: "donor_missing", donor });
      continue;
    }

    if (!dryRun) {
      const paths = await writeEditorialImageVariants(working.slug, donorBuf, "firehall_editorial_v1", 2);
      const meta = createEmptyEditorialImageMetadata(working.slug, "firehall_editorial_v1" as ImageStylePresetId, donor, 2);
      meta.heroImage = paths.hero;
      meta.thumbnailImage = paths.thumb;
      meta.mobileHeroImage = paths.mobile;
      meta.railPreviewImage = paths.rail;
      meta.imageApproved = true;
      meta.generatedAt = new Date().toISOString();

      db.prepare(
        `UPDATE curated_recipes SET hero_image = ?, editorial_image_json = ?, protein = ?, meal_format = ?, updated_at = datetime('now') WHERE recipe_id = ?`,
      ).run(paths.hero, JSON.stringify(meta), protein, mealFormat, working.recipe_id);

      attachEditorialImagesToSlug({ slug: working.slug, metadata: meta, markApproved: true, forceApprove: true });
    }

    fixed++;
    results.push({ slug: working.slug, action: "fixed", donor, heroPath: goldenPageImageSet(working.slug).heroImage });
    console.log(`  ✓ ${working.slug} ← ${donor}`);
  }

  const report = { dryRun, fixed, demoted, skipped, total: rows.length, results };
  fs.mkdirSync(path.dirname(REVIEW), { recursive: true });
  fs.writeFileSync(REVIEW, JSON.stringify(report, null, 2));
  console.log(`[remediate:explore-missing-images] fixed=${fixed} demoted=${demoted} skipped=${skipped}`);
  console.log(`[remediate:explore-missing-images] wrote ${REVIEW}`);

  if (!dryRun) flushSqliteToDisk();
  releaseSqliteTimersForTests();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
