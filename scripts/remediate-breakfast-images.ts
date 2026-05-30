#!/usr/bin/env tsx
/**
 * Remediate breakfast catalog + Golden 100 breakfast images (hero, thumb, mobile, rail, Explore).
 *
 *   npm run remediate:breakfast-images -- --all
 *   npm run remediate:breakfast-images -- --only=bbq-breakfast-hash
 *   npm run remediate:breakfast-images -- --donor-only
 */
import { loadProjectEnv } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { initCuratedRecipeStore, getCuratedRecipeBySlug } from "../server/curated-recipe-store.js";
import { runDbMigrations } from "../server/db/migrate.js";
import { flushSqliteToDisk } from "../server/sqlite.js";
import { writeBreakfastCatalogImageVariants, writeEditorialImageVariants } from "../server/imagery/variants.js";
import { attachEditorialImagesToSlug } from "../server/imagery/update-recipe-images.js";
import { createEmptyEditorialImageMetadata } from "../shared/editorial-image-metadata.js";
import { breakfastCatalogHeroPath } from "../shared/breakfast-catalog/slug-registry.js";
import {
  BREAKFAST_IMAGE_DONOR_PLAN,
  GOLDEN_100_BREAKFAST_SLUGS,
} from "../shared/breakfast-catalog/image-donor-plan.js";
import { getBreakfastCatalogTitle } from "../shared/breakfast-catalog/slug-registry.js";
import { readBreakfastRecipePageFromDisk, writeBreakfastRecipePage, writeBreakfastCatalogIndex } from "../server/breakfast-catalog/page-store.js";
import { readBreakfastCatalogIndexFromDisk } from "../server/breakfast-catalog/catalog.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";

const PUBLIC = path.join(process.cwd(), "client/public");

type RemediationResult = {
  slug: string;
  title: string;
  donorSlug: string;
  collection: "breakfast_catalog" | "golden_100";
  oldHeroMd5: string;
  newHeroMd5: string;
  paths: { hero: string; thumb: string; mobile: string; rail: string };
  exploreSynced: boolean;
  catalogPageUpdated: boolean;
};

function parseOnly(argv: string[]): Set<string> | null {
  const arg = argv.find((a) => a.startsWith("--only="));
  if (!arg) return null;
  return new Set(arg.replace("--only=", "").split(",").map((s) => s.trim()).filter(Boolean));
}

function md5File(publicPath: string): string {
  const abs = path.join(PUBLIC, publicPath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return "missing";
  return crypto.createHash("md5").update(fs.readFileSync(abs)).digest("hex");
}

function readDonorHeroBuffer(donorSlug: string): Buffer {
  const candidates = [
    path.join(PUBLIC, "images/breakfast", `${donorSlug}.jpg`),
    path.join(PUBLIC, "images/golden-100", `${donorSlug}.jpg`),
  ];
  for (const abs of candidates) {
    if (fs.existsSync(abs)) return fs.readFileSync(abs);
  }
  throw new Error(`Donor hero missing: ${donorSlug}`);
}

function resolveTitle(slug: string): string {
  return (
    getBreakfastCatalogTitle(slug) ||
    GOLDEN_100_RECIPES.find((r) => (r.classicSlug || r.slug) === slug)?.title ||
    slug
  );
}

function syncCatalogJson(slug: string, paths: RemediationResult["paths"]): boolean {
  const page = readBreakfastRecipePageFromDisk(slug);
  if (!page) return false;
  page.heroImage = paths.hero;
  page.thumbImage = paths.thumb;
  page.updatedAt = new Date().toISOString();
  writeBreakfastRecipePage(page);
  return true;
}

function syncCatalogIndex(slug: string, paths: RemediationResult["paths"]): void {
  const index = readBreakfastCatalogIndexFromDisk();
  if (!index) return;
  for (const entry of index.recipes) {
    if (entry.slug !== slug) continue;
    entry.heroImage = paths.hero;
    entry.thumbImage = paths.thumb;
  }
  writeBreakfastCatalogIndex(index);
}

function syncExploreRow(slug: string, paths: RemediationResult["paths"]): boolean {
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

async function remediateSlug(slug: string, donorSlug: string): Promise<RemediationResult> {
  const isGolden = GOLDEN_100_BREAKFAST_SLUGS.has(slug);
  const oldHeroPath = isGolden ? `/images/golden-100/${slug}.jpg` : breakfastCatalogHeroPath(slug);
  const oldHeroMd5 = md5File(oldHeroPath);
  const heroBuffer = readDonorHeroBuffer(donorSlug);

  const paths = isGolden
    ? await (async () => {
        const v = await writeEditorialImageVariants(slug, heroBuffer, "breakfast_shift", 2);
        return { hero: v.hero, thumb: v.thumb, mobile: v.mobile, rail: v.rail };
      })()
    : await writeBreakfastCatalogImageVariants(slug, heroBuffer, 2);

  const newHeroMd5 = md5File(paths.hero);
  const catalogPageUpdated = isGolden ? false : syncCatalogJson(slug, paths);
  if (!isGolden) syncCatalogIndex(slug, paths);
  const exploreSynced = syncExploreRow(slug, paths);

  console.log(`  ✓ ${slug} ← ${donorSlug}${isGolden ? " (golden_100)" : ""}`);

  return {
    slug,
    title: resolveTitle(slug),
    donorSlug,
    collection: isGolden ? "golden_100" : "breakfast_catalog",
    oldHeroMd5,
    newHeroMd5,
    paths,
    exploreSynced,
    catalogPageUpdated,
  };
}

async function main(): Promise<void> {
  const only = parseOnly(process.argv);
  const useAll = process.argv.includes("--all") || !process.argv.some((a) => a.startsWith("--only="));

  await runDbMigrations();
  initCuratedRecipeStore();

  const entries = Object.entries(BREAKFAST_IMAGE_DONOR_PLAN).filter(
    ([slug]) => !only || only.has(slug),
  );

  if (entries.length === 0) {
    console.error("[remediate:breakfast-images] no matching slugs");
    process.exit(1);
  }

  if (!useAll && only) {
    /* --only= without --all still runs matched slugs */
  }

  console.log(`[remediate:breakfast-images] fixing ${entries.length} recipe(s)…`);
  const results: RemediationResult[] = [];
  for (const [slug, donorSlug] of entries) {
    if (slug === donorSlug) continue;
    try {
      results.push(await remediateSlug(slug, donorSlug));
    } catch (err) {
      console.warn(`  ✗ ${slug}:`, err instanceof Error ? err.message : err);
    }
  }

  await flushSqliteToDisk();
  console.log(`[remediate:breakfast-images] done ok=${results.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
