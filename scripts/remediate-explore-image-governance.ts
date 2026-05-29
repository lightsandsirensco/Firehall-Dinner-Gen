#!/usr/bin/env tsx
/**
 * Remediate Explore curated image governance — trust-first, no fuzzy keyword assignment.
 *
 *   npx tsx scripts/remediate-explore-image-governance.ts --dry-run
 *   npx tsx scripts/remediate-explore-image-governance.ts
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
  EXPLORE_SLUG_RENAMES,
} from "../shared/curated-image-governance/explore-image-overrides.js";
import { goldenPageImageSet } from "../shared/golden-100/recipe-page-paths.js";
import {
  createEmptyEditorialImageMetadata,
  parseEditorialImageMetadata,
} from "../shared/editorial-image-metadata.js";
import type { ImageStylePresetId } from "../shared/image-style-presets.js";

type RecipeRow = {
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

function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function buildEditorialJson(imageSlug: string, paths: ReturnType<typeof goldenPageImageSet>): string {
  const preset = "firehall_editorial_v1" as ImageStylePresetId;
  const base = createEmptyEditorialImageMetadata(imageSlug, preset, imageSlug, 1);
  return JSON.stringify({
    ...base,
    heroImage: paths.heroImage,
    thumbnailImage: paths.thumbImage,
    mobileHeroImage: paths.mobileImage,
    railPreviewImage: paths.railImage,
    imageApproved: true,
    imageVersion: (base.imageVersion || 1) + 1,
    generatedAt: new Date().toISOString(),
  });
}

function passesGovernance(row: RecipeRow, paths: ReturnType<typeof goldenPageImageSet>): boolean {
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

function resolveImageSlug(
  row: RecipeRow,
  hallByTitle: Map<string, string[]>,
): { imageSlug: string; reason: string } | null {
  if (EXPLORE_IMAGE_SLUG_OVERRIDES[row.slug]) {
    return { imageSlug: EXPLORE_IMAGE_SLUG_OVERRIDES[row.slug], reason: "manual_override" };
  }

  const own = goldenPageImageSet(row.slug);
  if (passesGovernance(row, own)) {
    return { imageSlug: row.slug, reason: "own_slug_locked" };
  }

  const titleKey = normalizeTitle(row.title);
  const hallMatches = hallByTitle.get(titleKey) || [];
  if (hallMatches.length === 1) {
    return { imageSlug: hallMatches[0], reason: "hall_title_exact" };
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
    .all() as RecipeRow[];

  const beforeFail = rows.filter((row) => {
    const editorial = parseEditorialImageMetadata(row.editorial_image_json);
    const profile = buildCuratedMealImageProfile({
      slug: row.slug,
      title: row.title,
      protein: row.protein,
      cuisine: row.cuisine,
      mealFormat: row.meal_format,
    });
    return !validateCuratedImageGovernance({
      profile,
      heroImage: row.hero_image,
      thumbImage: editorial?.thumbnailImage || "",
      mobileImage: editorial?.mobileHeroImage || "",
      imageApproved: editorial?.imageApproved ?? false,
      publishGate: row.status === "published",
    }).pass;
  }).length;

  const stats = {
    proteinFixed: 0,
    slugRenamed: 0,
    lockedApplied: 0,
    demoted: 0,
    skippedOk: 0,
  };
  const fixed: string[] = [];
  const demoted: string[] = [];

  for (const row of rows) {
    let working = { ...row };

    if (EXPLORE_PROTEIN_FIXES[working.slug]) {
      working.protein = EXPLORE_PROTEIN_FIXES[working.slug];
      if (!dryRun) {
        db.prepare("UPDATE curated_recipes SET protein = ? WHERE recipe_id = ?").run(
          working.protein,
          working.recipe_id,
        );
      }
      stats.proteinFixed++;
    }

    const rename = EXPLORE_SLUG_RENAMES[working.slug];
    if (rename) {
      const clash = db.prepare("SELECT 1 FROM curated_recipes WHERE slug = ?").get(rename);
      if (!clash) {
        if (!dryRun) {
          db.prepare("UPDATE curated_recipes SET slug = ? WHERE recipe_id = ?").run(rename, working.recipe_id);
        }
        working.slug = rename;
        stats.slugRenamed++;
      }
    }

    const editorial = parseEditorialImageMetadata(working.editorial_image_json);
    const profile = buildCuratedMealImageProfile({
      slug: working.slug,
      title: working.title,
      protein: working.protein,
      cuisine: working.cuisine,
      mealFormat: working.meal_format,
    });
    const current = validateCuratedImageGovernance({
      profile,
      heroImage: working.hero_image,
      thumbImage: editorial?.thumbnailImage || "",
      mobileImage: editorial?.mobileHeroImage || "",
      imageApproved: editorial?.imageApproved ?? false,
      publishGate: working.status === "published",
    });

    if (current.pass) {
      stats.skippedOk++;
      continue;
    }

    const resolved = resolveImageSlug(working, hallByTitle);
    if (resolved) {
      const paths = goldenPageImageSet(resolved.imageSlug);
      if (passesGovernance(working, paths)) {
        const json = buildEditorialJson(resolved.imageSlug, paths);
        if (!dryRun) {
          db.prepare(
            `UPDATE curated_recipes
             SET hero_image = ?, editorial_image_json = ?, updated_at = datetime('now')
             WHERE recipe_id = ?`,
          ).run(paths.heroImage, json, working.recipe_id);
        }
        fixed.push(`${working.slug} → ${resolved.imageSlug} (${resolved.reason})`);
        stats.lockedApplied++;
        continue;
      }
    }

    const isExternal = /^https?:\/\//i.test(working.hero_image);
    const hasCritical = current.mismatches.some(
      (m) =>
        m.severity === "critical" &&
        ["external_image_forbidden", "path_title_conflict", "format_mismatch", "protein_mismatch"].includes(
          m.code,
        ),
    );

    if ((isExternal || hasCritical) && (working.status === "published" || working.status === "approved")) {
      if (!dryRun) {
        db.prepare(
          `UPDATE curated_recipes
           SET status = 'review', hero_image = '', editorial_image_json = NULL, updated_at = datetime('now')
           WHERE recipe_id = ?`,
        ).run(working.recipe_id);
      }
      demoted.push(working.slug);
      stats.demoted++;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        beforeFail,
        stats,
        fixedSample: fixed.slice(0, 40),
        demotedSample: demoted.slice(0, 40),
        demotedTotal: demoted.length,
      },
      null,
      2,
    ),
  );

  if (!dryRun) flushSqliteToDisk();
  releaseSqliteTimersForTests();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
