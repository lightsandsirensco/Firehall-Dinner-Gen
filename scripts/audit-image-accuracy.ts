#!/usr/bin/env tsx
/**
 * Full catalog image accuracy audit — all recipe collections.
 *
 * Outputs:
 *   review/image-accuracy-audit.json
 *   review/image-accuracy-audit.md
 *
 * Usage:
 *   npm run audit:image-accuracy
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { loadMergedHallCatalogIndex } from "../server/meal-catalog/load-index.js";
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
import { resolveActiveImageDonorSlug } from "../shared/image-donor-resolver.js";
import { RED_LEAD_PDF_ASSETS } from "../shared/seo/firefighter-red-lead-sauce-data.js";
import { FIREFIGHTER_RED_LEAD_RECIPE_PATH } from "../shared/seo/firefighter-red-lead-recipe-data.js";
import {
  buildCuratedMealImageProfile,
  validateCuratedImageGovernance,
} from "../shared/curated-image-governance/index.js";
import {
  auditCategoryMealFormat,
  auditFoodRealismHeuristics,
  auditTitlePathKeywords,
  type ImageAccuracyIssue,
} from "../shared/curated-image-governance/image-accuracy-rules.js";
import { validateRedLeadImageRef } from "../shared/curated-image-governance/red-lead-rules.js";
import { imageFileExists } from "../shared/explore-image-paths.js";

type CollectionId =
  | "golden_100"
  | "performance_meals"
  | "hall_expansion"
  | "breakfast"
  | "pizza_night"
  | "smoothies"
  | "explore_curated";

type ImageSet = {
  heroImage: string;
  thumbImage: string;
  mobileImage: string;
  railImage: string;
};

type AuditRow = {
  collection: CollectionId | "red_lead";
  slug: string;
  title: string;
  route: string;
  protein: string;
  mealFormat: string;
  category: string;
  heroImage: string;
  thumbImage: string;
  mobileImage: string;
  onDisk: { hero: boolean; thumb: boolean; mobile: boolean; rail: boolean };
  donorOverride?: string;
  heroMd5?: string;
  duplicatePeers?: string[];
  governancePass: boolean;
  accuracyIssues: ImageAccuracyIssue[];
  pass: boolean;
};

const PUBLIC = path.join(process.cwd(), "client/public");
const JSON_PATH = path.join("review", "image-accuracy-audit.json");
const MD_PATH = path.join("review", "image-accuracy-audit.md");

function md5Public(publicPath: string): string | null {
  const abs = path.join(PUBLIC, publicPath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return null;
  const stat = fs.statSync(abs);
  if (!stat.isFile()) return null;
  return crypto.createHash("md5").update(fs.readFileSync(abs)).digest("hex");
}

function readBreakfastIndex(): Array<{
  slug: string;
  title: string;
  protein?: string;
  mealFormat?: string;
  heroImage?: string;
  thumbImage?: string;
}> {
  const file = path.join(PUBLIC, "catalog/breakfast/index.json");
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
    recipes: Array<Record<string, string>>;
  };
  return raw.recipes.map((r) => ({
    slug: r.slug,
    title: r.title,
    protein: r.protein,
    mealFormat: r.mealFormat,
    heroImage: r.heroImage,
    thumbImage: r.thumbImage,
  }));
}

function breakfastImageSet(slug: string): ImageSet {
  return {
    heroImage: `/images/breakfast/${slug}.jpg`,
    thumbImage: `/images/thumbs/breakfast/${slug}.jpg`,
    mobileImage: `/images/mobile/breakfast/${slug}.jpg`,
    railImage: `/images/rails/breakfast/${slug}.jpg`,
  };
}

function donorFor(collection: CollectionId, slug: string, heroImage: string, heroMd5?: string): string | undefined {
  if (collection === "performance_meals" && PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES[slug]) {
    return PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES[slug];
  }
  return resolveActiveImageDonorSlug(slug, heroImage, { heroMd5 }) ?? undefined;
}

function auditRecipe(input: {
  collection: CollectionId | "red_lead";
  slug: string;
  title: string;
  route: string;
  protein: string;
  mealFormat: string;
  category: string;
  images: ImageSet;
}): AuditRow {
  const onDisk = {
    hero: imageFileExists(input.images.heroImage),
    thumb: imageFileExists(input.images.thumbImage),
    mobile: imageFileExists(input.images.mobileImage),
    rail: imageFileExists(input.images.railImage),
  };
  const heroMd5Early = onDisk.hero ? md5Public(input.images.heroImage) ?? undefined : undefined;
  const donorOverride =
    input.collection !== "red_lead"
      ? donorFor(input.collection as CollectionId, input.slug, input.images.heroImage, heroMd5Early)
      : undefined;

  const profile = buildCuratedMealImageProfile({
    slug: input.slug,
    title: input.title,
    protein: input.protein,
    cuisine: input.category,
    mealFormat: input.mealFormat,
  });

  const governance = validateCuratedImageGovernance({
    profile,
    heroImage: input.images.heroImage,
    thumbImage: input.images.thumbImage,
    mobileImage: input.images.mobileImage,
    imageApproved: true,
    publishGate: true,
  });

  const accuracyIssues: ImageAccuracyIssue[] = [
    ...auditTitlePathKeywords(input.title, input.images.heroImage),
    ...auditFoodRealismHeuristics(input.title, input.images.heroImage, "", input.mealFormat),
    ...auditCategoryMealFormat(input.title, input.mealFormat, input.category, input.images.heroImage),
  ];

  if (!onDisk.hero) {
    accuracyIssues.push({
      code: "missing_image_file",
      severity: "critical",
      message: "hero image file missing on disk",
      confidence: 95,
    });
  }

  if (donorOverride) {
    accuracyIssues.push({
      code: "donor_override_active",
      severity: "info",
      message: `hero copied from donor slug "${donorOverride}" — verify visual match`,
      confidence: 40,
    });
  }

  const critical =
    accuracyIssues.some((i) => i.severity === "critical") ||
    (!governance.pass && input.collection !== "red_lead") ||
    governance.mismatches.some((m) => m.severity === "critical" && input.collection !== "red_lead");

  return {
    collection: input.collection,
    slug: input.slug,
    title: input.title,
    route: input.route,
    protein: input.protein,
    mealFormat: input.mealFormat,
    category: input.category,
    heroImage: input.images.heroImage,
    thumbImage: input.images.thumbImage,
    mobileImage: input.images.mobileImage,
    onDisk,
    donorOverride,
    heroMd5: onDisk.hero ? md5Public(input.images.heroImage) ?? undefined : undefined,
    governancePass: governance.pass,
    accuracyIssues,
    pass: !critical,
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
    if (peers.length > 0) {
      row.duplicatePeers = peers.map((p) => `${p.collection}:${p.slug}`);
      row.accuracyIssues.push({
        code: "duplicate_hero_hash",
        severity: "critical",
        message: `hero MD5 shared with ${peers.map((p) => p.slug).join(", ")}`,
        confidence: 92,
      });
      row.pass = false;
    }
  }
}

async function auditExploreCurated(): Promise<AuditRow[]> {
  const db = await getSharedLocalDb();
  if (!db || typeof db.prepare !== "function") return [];

  let rawRows: Record<string, unknown>[] = [];
  try {
    rawRows = db
      .prepare(
        `SELECT slug, title, protein, cuisine, meal_format, hero_image, editorial_image_json, status
         FROM curated_recipes
         WHERE status IN ('published', 'approved', 'review')`,
      )
      .all() as Record<string, unknown>[];
  } catch {
    return [];
  }

  return rawRows.map((row) => {
    const slug = String(row.slug || "");
    const title = String(row.title || "");
    const hero = String(row.hero_image || "").trim();
    return auditRecipe({
      collection: "explore_curated",
      slug,
      title,
      route: `/recipes/${slug}`,
      protein: String(row.protein || "any"),
      mealFormat: String(row.meal_format || "plated_main"),
      category: String(row.cuisine || "other"),
      images: {
        heroImage: hero,
        thumbImage: "",
        mobileImage: "",
        railImage: "",
      },
    });
  });
}

function auditRedLead(): { pass: boolean; issues: string[]; row: AuditRow } {
  const hero = RED_LEAD_PDF_ASSETS.heroImage;
  const redLeadRule = validateRedLeadImageRef("Firefighter Red Lead Recipe", hero);
  const issues: string[] = [];
  if (!redLeadRule.ok && redLeadRule.forbidden) issues.push(redLeadRule.forbidden);
  if (!redLeadRule.ok && redLeadRule.missingRequired) issues.push(redLeadRule.missingRequired);
  if (!imageFileExists(hero)) issues.push(`missing hero file: ${hero}`);
  if (!imageFileExists(RED_LEAD_PDF_ASSETS.pdfPath)) issues.push(`missing PDF: ${RED_LEAD_PDF_ASSETS.pdfPath}`);

  const row = auditRecipe({
    collection: "red_lead",
    slug: "firefighter-red-lead-recipe",
    title: "Firefighter Red Lead Recipe",
    route: FIREFIGHTER_RED_LEAD_RECIPE_PATH,
    protein: "vegetarian",
    mealFormat: "skillet",
    category: "breakfast",
    images: {
      heroImage: hero,
      thumbImage: `/images/thumbs/breakfast/firefighter-red-lead-recipe.jpg`,
      mobileImage: `/images/mobile/breakfast/firefighter-red-lead-recipe.jpg`,
      railImage: `/images/rails/breakfast/firefighter-red-lead-recipe.jpg`,
    },
  });
  row.pass = issues.length === 0 && row.accuracyIssues.every((i) => i.severity !== "critical");

  return { pass: row.pass && issues.length === 0, issues, row };
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  const rows: AuditRow[] = [];

  for (const def of GOLDEN_100_RECIPES) {
    const images = goldenPageImageSet(def.slug);
    rows.push(
      auditRecipe({
        collection: "golden_100",
        slug: def.slug,
        title: def.title,
        route: `/recipes/${def.slug}`,
        protein: def.protein,
        mealFormat: def.mealFormat,
        category: def.masterCategoryId,
        images,
      }),
    );
  }

  for (const r of PERFORMANCE_ADAPTED_RECIPES) {
    const images = performancePageImageSet(r.manifest.slug);
    rows.push(
      auditRecipe({
        collection: "performance_meals",
        slug: r.manifest.slug,
        title: r.manifest.title,
        route: `/recipes/${r.manifest.slug}`,
        protein: r.manifest.protein,
        mealFormat: r.manifest.mealFormat,
        category: "healthy_performance",
        images,
      }),
    );
  }

  for (const r of HALL_EXPANSION_ADAPTED_RECIPES) {
    const images = hallExpansionPageImageSet(r.slug);
    rows.push(
      auditRecipe({
        collection: "hall_expansion",
        slug: r.slug,
        title: r.title,
        route: `/recipes/${r.slug}`,
        protein: r.protein,
        mealFormat: r.mealFormat,
        category: r.category || "hall_expansion",
        images,
      }),
    );
  }

  for (const entry of readBreakfastIndex()) {
    const images = breakfastImageSet(entry.slug);
    rows.push(
      auditRecipe({
        collection: "breakfast",
        slug: entry.slug,
        title: entry.title,
        route: `/breakfast/${entry.slug}`,
        protein: entry.protein || "any",
        mealFormat: entry.mealFormat || "breakfast",
        category: "breakfast",
        images,
      }),
    );
  }

  for (const def of PIZZA_NIGHT_RECIPES) {
    const images = pizzaNightPageImageSet(def.slug);
    rows.push(
      auditRecipe({
        collection: "pizza_night",
        slug: def.slug,
        title: def.title,
        route: `/recipes/${def.slug}`,
        protein: def.protein,
        mealFormat: def.mealFormat,
        category: "pizza_night",
        images,
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
      }),
    );
  }

  rows.push(...(await auditExploreCurated()));
  attachDuplicatePeers(rows);

  const redLead = auditRedLead();
  rows.push(redLead.row);

  const failed = rows.filter((r) => !r.pass);
  const byCollection: Record<string, number> = {};
  for (const row of rows) {
    byCollection[row.collection] = (byCollection[row.collection] || 0) + 1;
  }

  const duplicateGroups = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.heroMd5 || !row.duplicatePeers?.length) continue;
    const key = row.heroMd5;
    const slugs = duplicateGroups.get(key) || [];
    slugs.push(`${row.collection}:${row.slug}`);
    for (const peer of row.duplicatePeers) slugs.push(peer);
    duplicateGroups.set(key, [...new Set(slugs)]);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      recipesAudited: rows.length,
      failed: failed.length,
      byCollection,
      duplicateHeroGroups: duplicateGroups.size,
      donorOverrides: rows.filter((r) => r.donorOverride).length,
    },
    redLead: { pass: redLead.pass, issues: redLead.issues },
    duplicateHeroGroups: [...duplicateGroups.entries()].map(([hash, slugs]) => ({ hash, slugs })),
    failedRecipes: failed.map((r) => ({
      collection: r.collection,
      slug: r.slug,
      title: r.title,
      heroImage: r.heroImage,
      issues: r.accuracyIssues,
      governancePass: r.governancePass,
    })),
    rows,
  };

  fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
  fs.writeFileSync(JSON_PATH, JSON.stringify(report, null, 2));

  const md: string[] = [
    "# Image Accuracy Audit",
    "",
    `- Recipes audited: **${rows.length}**`,
    `- Failed: **${failed.length}**`,
    `- Duplicate hero groups: **${duplicateGroups.size}**`,
    `- Donor overrides active: **${report.totals.donorOverrides}**`,
    `- Red Lead: **${redLead.pass ? "PASS" : "FAIL"}**`,
    "",
    "## Failed recipes",
    "",
  ];

  if (failed.length === 0) {
    md.push("_No failures._");
  } else {
    for (const row of failed.slice(0, 80)) {
      md.push(`### ${row.title} (\`${row.slug}\`) — ${row.collection}`);
      md.push(`- Hero: \`${row.heroImage}\``);
      for (const issue of row.accuracyIssues) {
        md.push(`- **${issue.severity}** \`${issue.code}\`: ${issue.message}`);
      }
      md.push("");
    }
    if (failed.length > 80) md.push(`_…and ${failed.length - 80} more (see JSON)._`);
  }

  fs.writeFileSync(MD_PATH, md.join("\n"));
  console.log(`[audit:image-accuracy] wrote ${JSON_PATH}`);
  console.log(`[audit:image-accuracy] wrote ${MD_PATH}`);
  console.log(
    `[audit:image-accuracy] audited=${rows.length} failed=${failed.length} duplicates=${duplicateGroups.size}`,
  );

  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
