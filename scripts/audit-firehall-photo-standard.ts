#!/usr/bin/env tsx
/**
 * Global Firehall Kitchen Photo Standard — full catalog audit.
 *
 * Outputs:
 *   review/firehall-photo-standard-audit.json
 *   review/firehall-photo-standard-audit.md
 *   review/firehall-photo-replacement-queue.json
 *
 * Usage:
 *   npm run audit:firehall-photo-standard
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { goldenPageImageSet } from "../shared/golden-100/recipe-page-paths.js";
import { PERFORMANCE_ADAPTED_RECIPES } from "../shared/performance-meals/adapted/index.js";
import { performancePageImageSet } from "../shared/performance-meals/recipe-page-paths.js";
import { HALL_EXPANSION_ADAPTED_RECIPES } from "../shared/hall-expansion/adapted/index.js";
import { hallExpansionPageImageSet } from "../shared/hall-expansion/recipe-page-paths.js";
import { PIZZA_NIGHT_RECIPES } from "../shared/pizza-night/manifest.js";
import { pizzaNightPageImageSet } from "../shared/pizza-night/recipe-page-paths.js";
import { SMOOTHIE_CATALOG_ITEMS } from "../shared/fuel-catalog/smoothies/catalog-data.js";
import { PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES } from "../shared/performance-meals/image-donor-overrides.js";
import {
  auditFirehallPhotoStandardMetadata,
  FIREHALL_KITCHEN_PHOTO_STANDARD_VERSION,
  resolveFirehallPhotoCategory,
  type FirehallPhotoStandardIssue,
} from "../shared/food-imagery/firehall-kitchen-photo-standard.js";
import { resolveActiveImageDonorSlug } from "../shared/image-donor-resolver.js";
import { imageFileExists } from "../shared/explore-image-paths.js";

type CollectionId =
  | "golden_100"
  | "performance_meals"
  | "hall_expansion"
  | "breakfast"
  | "bbq"
  | "pizza_night"
  | "smoothies";

type ImageSet = {
  heroImage: string;
  thumbImage: string;
  mobileImage: string;
  railImage: string;
};

type AuditRow = {
  collection: CollectionId;
  slug: string;
  title: string;
  route: string;
  protein: string;
  mealFormat: string;
  category: string;
  photoCategory: string;
  heroImage: string;
  imageAlt?: string;
  onDisk: { hero: boolean; thumb: boolean; mobile: boolean; rail: boolean };
  donorOverride?: string;
  heroMd5?: string;
  duplicatePeers?: string[];
  issues: FirehallPhotoStandardIssue[];
  needsReplacement: boolean;
  pass: boolean;
};

const PUBLIC = path.join(process.cwd(), "client/public");
const JSON_PATH = path.join("review", "firehall-photo-standard-audit.json");
const MD_PATH = path.join("review", "firehall-photo-standard-audit.md");
const QUEUE_PATH = path.join("review", "firehall-photo-replacement-queue.json");

function md5Public(publicPath: string): string | null {
  const abs = path.join(PUBLIC, publicPath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return null;
  const stat = fs.statSync(abs);
  if (!stat.isFile()) return null;
  return crypto.createHash("md5").update(fs.readFileSync(abs)).digest("hex");
}

function readCatalogIndex(
  relPath: string,
): Array<{
  slug: string;
  title: string;
  protein?: string;
  mealFormat?: string;
  category?: string;
  heroImage?: string;
  thumbImage?: string;
}> {
  const file = path.join(PUBLIC, relPath);
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
    recipes: Array<Record<string, string>>;
  };
  return raw.recipes.map((r) => ({
    slug: r.slug,
    title: r.title,
    protein: r.protein,
    mealFormat: r.mealFormat,
    category: r.category,
    heroImage: r.heroImage,
    thumbImage: r.thumbImage,
  }));
}

function readPageAlt(slug: string, catalogDir: string): string | undefined {
  const pagePath = path.join(PUBLIC, "catalog", catalogDir, "pages", `${slug}.json`);
  if (!fs.existsSync(pagePath)) return undefined;
  try {
    const page = JSON.parse(fs.readFileSync(pagePath, "utf8")) as { imageAlt?: string };
    return page.imageAlt?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function breakfastImageSet(slug: string): ImageSet {
  return {
    heroImage: `/images/breakfast/${slug}.jpg`,
    thumbImage: `/images/thumbs/breakfast/${slug}.jpg`,
    mobileImage: `/images/mobile/breakfast/${slug}.jpg`,
    railImage: `/images/rails/breakfast/${slug}.jpg`,
  };
}

function bbqImageSet(slug: string): ImageSet {
  return {
    heroImage: `/images/smoker-catalog/${slug}.jpg`,
    thumbImage: `/images/thumbs/smoker-catalog/${slug}.jpg`,
    mobileImage: `/images/mobile/smoker-catalog/${slug}.jpg`,
    railImage: `/images/rails/smoker-catalog/${slug}.jpg`,
  };
}

function donorFor(
  collection: CollectionId,
  slug: string,
  heroImage: string,
  heroMd5?: string,
): string | undefined {
  if (collection === "performance_meals" && PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES[slug]) {
    return PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES[slug];
  }
  return resolveActiveImageDonorSlug(slug, heroImage, { heroMd5 }) ?? undefined;
}

function auditRecipe(input: {
  collection: CollectionId;
  slug: string;
  title: string;
  route: string;
  protein: string;
  mealFormat: string;
  category: string;
  images: ImageSet;
  imageAlt?: string;
}): AuditRow {
  const onDisk = {
    hero: imageFileExists(input.images.heroImage),
    thumb: imageFileExists(input.images.thumbImage),
    mobile: imageFileExists(input.images.mobileImage),
    rail: imageFileExists(input.images.railImage),
  };
  const heroMd5 = onDisk.hero ? md5Public(input.images.heroImage) ?? undefined : undefined;
  const donorOverride = donorFor(input.collection, input.slug, input.images.heroImage, heroMd5);
  const photoCategory = resolveFirehallPhotoCategory(
    input.category,
    input.mealFormat,
    input.title,
  );

  const issues = auditFirehallPhotoStandardMetadata({
    title: input.title,
    heroPath: input.images.heroImage,
    altText: input.imageAlt,
    category: input.category,
    mealFormat: input.mealFormat,
    donorOverride,
    heroMissing: !onDisk.hero,
  });

  const needsReplacement = issues.some((i) => i.code === "needs_regeneration");

  const critical = issues.some(
    (i) =>
      i.severity === "critical" &&
      i.code !== "missing_firehall_atmosphere_metadata",
  );

  return {
    collection: input.collection,
    slug: input.slug,
    title: input.title,
    route: input.route,
    protein: input.protein,
    mealFormat: input.mealFormat,
    category: input.category,
    photoCategory,
    heroImage: input.images.heroImage,
    imageAlt: input.imageAlt,
    onDisk,
    donorOverride,
    heroMd5: onDisk.hero ? md5Public(input.images.heroImage) ?? undefined : undefined,
    issues,
    needsReplacement,
    pass: !critical && onDisk.hero,
  };
}

function attachDuplicatePeers(rows: AuditRow[]): void {
  const byHash = new Map<string, AuditRow[]>();
  for (const row of rows) {
    if (!row.heroMd5) continue;
    const list = byHash.get(row.heroMd5) || [];
    list.push(row);
    byHash.set(row.heroMd5, list);
  }
  for (const row of rows) {
    if (!row.heroMd5) continue;
    const peers = (byHash.get(row.heroMd5) || []).filter((p) => p.slug !== row.slug);
    if (peers.length === 0) continue;
    row.duplicatePeers = peers.map((p) => `${p.collection}:${p.slug}`);
    row.donorOverride = donorFor(row.collection, row.slug, row.heroImage, row.heroMd5);
    row.issues = auditFirehallPhotoStandardMetadata({
      title: row.title,
      heroPath: row.heroImage,
      altText: row.imageAlt,
      category: row.category,
      mealFormat: row.mealFormat,
      donorOverride: row.donorOverride,
      duplicatePeers: row.duplicatePeers,
      heroMissing: !row.onDisk.hero,
    });
    row.needsReplacement = true;
    row.pass = false;
  }
}

function main(): void {
  const rows: AuditRow[] = [];

  for (const def of GOLDEN_100_RECIPES) {
    rows.push(
      auditRecipe({
        collection: "golden_100",
        slug: def.slug,
        title: def.title,
        route: `/recipes/${def.slug}`,
        protein: def.protein,
        mealFormat: def.mealFormat,
        category: def.masterCategoryId,
        images: goldenPageImageSet(def.slug),
        imageAlt: readPageAlt(def.slug, "golden-100"),
      }),
    );
  }

  for (const r of PERFORMANCE_ADAPTED_RECIPES) {
    rows.push(
      auditRecipe({
        collection: "performance_meals",
        slug: r.manifest.slug,
        title: r.manifest.title,
        route: `/recipes/${r.manifest.slug}`,
        protein: r.manifest.protein,
        mealFormat: r.manifest.mealFormat,
        category: "healthy_performance",
        images: performancePageImageSet(r.manifest.slug),
        imageAlt: readPageAlt(r.manifest.slug, "performance-meals"),
      }),
    );
  }

  for (const r of HALL_EXPANSION_ADAPTED_RECIPES) {
    rows.push(
      auditRecipe({
        collection: "hall_expansion",
        slug: r.slug,
        title: r.title,
        route: `/recipes/${r.slug}`,
        protein: r.protein,
        mealFormat: r.mealFormat,
        category: r.category || "hall_expansion",
        images: hallExpansionPageImageSet(r.slug),
        imageAlt: readPageAlt(r.slug, "hall-expansion"),
      }),
    );
  }

  for (const entry of readCatalogIndex("catalog/breakfast/index.json")) {
    rows.push(
      auditRecipe({
        collection: "breakfast",
        slug: entry.slug,
        title: entry.title,
        route: `/breakfast/${entry.slug}`,
        protein: entry.protein || "any",
        mealFormat: entry.mealFormat || "breakfast",
        category: "breakfast",
        images: breakfastImageSet(entry.slug),
        imageAlt: readPageAlt(entry.slug, "breakfast"),
      }),
    );
  }

  for (const entry of readCatalogIndex("catalog/bbq/index.json")) {
    rows.push(
      auditRecipe({
        collection: "bbq",
        slug: entry.slug,
        title: entry.title,
        route: `/bbq/${entry.slug}`,
        protein: entry.protein || "any",
        mealFormat: entry.mealFormat || "bbq",
        category: "bbq_grill_nights",
        images: bbqImageSet(entry.slug),
        imageAlt: readPageAlt(entry.slug, "bbq"),
      }),
    );
  }

  for (const def of PIZZA_NIGHT_RECIPES) {
    rows.push(
      auditRecipe({
        collection: "pizza_night",
        slug: def.slug,
        title: def.title,
        route: `/recipes/${def.slug}`,
        protein: def.protein,
        mealFormat: def.mealFormat,
        category: "pizza_night",
        images: pizzaNightPageImageSet(def.slug),
        imageAlt: readPageAlt(def.slug, "pizza-night"),
      }),
    );
  }

  for (const item of SMOOTHIE_CATALOG_ITEMS) {
    rows.push(
      auditRecipe({
        collection: "smoothies",
        slug: item.slug,
        title: item.title,
        route: `/recipes/${item.slug}`,
        protein: "vegetarian",
        mealFormat: "smoothie",
        category: "smoothies",
        images: {
          heroImage: `/images/smoothies/${item.slug}.webp`,
          thumbImage: `/images/thumbs/${item.slug}.jpg`,
          mobileImage: `/images/mobile/${item.slug}.jpg`,
          railImage: `/images/rails/${item.slug}.jpg`,
        },
        imageAlt: item.imageAlt,
      }),
    );
  }

  attachDuplicatePeers(rows);

  const replacementQueue = rows
    .filter((r) => r.needsReplacement)
    .map((r) => ({
      collection: r.collection,
      slug: r.slug,
      title: r.title,
      route: r.route,
      protein: r.protein,
      mealFormat: r.mealFormat,
      category: r.category,
      photoCategory: r.photoCategory,
      heroImage: r.heroImage,
      donorOverride: r.donorOverride,
      duplicatePeers: r.duplicatePeers,
      reasons: r.issues
        .filter((i) => i.code !== "missing_firehall_atmosphere_metadata")
        .map((i) => ({ code: i.code, severity: i.severity, message: i.message })),
      priority:
        r.issues.some((i) => i.severity === "critical") || r.duplicatePeers?.length
          ? "p0"
          : "p1",
    }));

  const failed = rows.filter((r) => !r.pass);
  const byCollection: Record<string, { total: number; failed: number; queued: number }> = {};

  for (const row of rows) {
    if (!byCollection[row.collection]) {
      byCollection[row.collection] = { total: 0, failed: 0, queued: 0 };
    }
    byCollection[row.collection].total += 1;
    if (!row.pass) byCollection[row.collection].failed += 1;
    if (row.needsReplacement) byCollection[row.collection].queued += 1;
  }

  const duplicateGroups = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.heroMd5 || !row.duplicatePeers?.length) continue;
    const slugs = duplicateGroups.get(row.heroMd5) || [];
    slugs.push(`${row.collection}:${row.slug}`);
    for (const peer of row.duplicatePeers) slugs.push(peer);
    duplicateGroups.set(row.heroMd5, [...new Set(slugs)]);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    standardVersion: FIREHALL_KITCHEN_PHOTO_STANDARD_VERSION,
    targets: {
      uniqueImagery: "100%",
      recipeAccuracy: "100%",
      firehallKitchenRealism: "100%",
      duplicatePhotos: "0%",
      stockPhotoFeel: "0%",
      firefighterMarketingImagery: "0%",
    },
    totals: {
      recipesAudited: rows.length,
      failed: failed.length,
      queuedForReplacement: replacementQueue.length,
      duplicateHeroGroups: duplicateGroups.size,
      donorOverrides: rows.filter((r) => r.donorOverride).length,
      byCollection,
    },
    duplicateHeroGroups: [...duplicateGroups.entries()].map(([hash, slugs]) => ({ hash, slugs })),
    replacementQueue,
    rows,
  };

  fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
  fs.writeFileSync(JSON_PATH, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    QUEUE_PATH,
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        standardVersion: FIREHALL_KITCHEN_PHOTO_STANDARD_VERSION,
        count: replacementQueue.length,
        queue: replacementQueue,
      },
      null,
      2,
    ),
  );

  const md: string[] = [
    "# Firehall Kitchen Photo Standard Audit",
    "",
    `Standard version: **${FIREHALL_KITCHEN_PHOTO_STANDARD_VERSION}**`,
    "",
    "## Targets",
    "",
    "- 100% unique imagery",
    "- 100% recipe accuracy",
    "- 100% firehall kitchen realism",
    "- 0% duplicate photos",
    "- 0% stock-photo feel",
    "- 0% firefighter marketing imagery",
    "",
    "## Summary",
    "",
    `- Recipes audited: **${rows.length}**`,
    `- Failed standard: **${failed.length}**`,
    `- Queued for replacement: **${replacementQueue.length}**`,
    `- Duplicate hero groups: **${duplicateGroups.size}**`,
    `- Donor overrides: **${report.totals.donorOverrides}**`,
    "",
    "## By collection",
    "",
    "| Collection | Total | Failed | Queued |",
    "|---|---:|---:|---:|",
  ];

  for (const [collection, stats] of Object.entries(byCollection).sort()) {
    md.push(`| ${collection} | ${stats.total} | ${stats.failed} | ${stats.queued} |`);
  }

  md.push("", "## Replacement queue (P0)", "");
  const p0 = replacementQueue.filter((r) => r.priority === "p0");
  if (p0.length === 0) {
    md.push("_No P0 replacements._");
  } else {
    for (const item of p0.slice(0, 60)) {
      md.push(`- **${item.title}** (\`${item.slug}\`) — ${item.collection}`);
      for (const reason of item.reasons.slice(0, 3)) {
        md.push(`  - \`${reason.code}\`: ${reason.message}`);
      }
    }
    if (p0.length > 60) md.push(`_…and ${p0.length - 60} more P0 items (see JSON)._`);
  }

  fs.writeFileSync(MD_PATH, md.join("\n"));

  console.log(`[audit:firehall-photo-standard] wrote ${JSON_PATH}`);
  console.log(`[audit:firehall-photo-standard] wrote ${QUEUE_PATH}`);
  console.log(`[audit:firehall-photo-standard] wrote ${MD_PATH}`);
  console.log(
    `[audit:firehall-photo-standard] audited=${rows.length} failed=${failed.length} queued=${replacementQueue.length} duplicates=${duplicateGroups.size}`,
  );
}

main();
