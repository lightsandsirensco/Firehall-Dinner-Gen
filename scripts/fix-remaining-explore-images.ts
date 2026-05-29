#!/usr/bin/env tsx
/** Apply locked heroes to review-status Explore rows still missing imagery. */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";
import {
  EXPLORE_IMAGE_SLUG_OVERRIDES,
  EXPLORE_MEAL_FORMAT_FIXES,
  EXPLORE_PROTEIN_FIXES,
} from "../shared/curated-image-governance/explore-image-overrides.js";
import { goldenPageImageSet } from "../shared/golden-100/recipe-page-paths.js";
import {
  buildCuratedMealImageProfile,
  validateCuratedImageGovernance,
} from "../shared/curated-image-governance/index.js";
import {
  createEmptyEditorialImageMetadata,
} from "../shared/editorial-image-metadata.js";
import type { ImageStylePresetId } from "../shared/image-style-presets.js";

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();
  const rows = db
    .prepare(
      `SELECT recipe_id, slug, title, protein, cuisine, meal_format, status
       FROM curated_recipes
       WHERE status = 'review' AND (hero_image IS NULL OR hero_image = '' OR hero_image LIKE 'https%')`,
    )
    .all() as Array<{
    recipe_id: string;
    slug: string;
    title: string;
    protein: string;
    cuisine: string;
    meal_format: string;
    status: string;
  }>;

  let applied = 0;
  let republished = 0;
  for (const row of rows) {
    if (EXPLORE_PROTEIN_FIXES[row.slug]) {
      row.protein = EXPLORE_PROTEIN_FIXES[row.slug];
      db.prepare("UPDATE curated_recipes SET protein = ? WHERE recipe_id = ?").run(
        row.protein,
        row.recipe_id,
      );
    }
    if (EXPLORE_MEAL_FORMAT_FIXES[row.slug]) {
      row.meal_format = EXPLORE_MEAL_FORMAT_FIXES[row.slug];
      db.prepare("UPDATE curated_recipes SET meal_format = ? WHERE recipe_id = ?").run(
        row.meal_format,
        row.recipe_id,
      );
    }

    const imageSlug = EXPLORE_IMAGE_SLUG_OVERRIDES[row.slug] || row.slug;
    const paths = goldenPageImageSet(imageSlug);
    const profile = buildCuratedMealImageProfile({
      slug: row.slug,
      title: row.title,
      protein: row.protein,
      cuisine: row.cuisine,
      mealFormat: row.meal_format,
    });
    const check = validateCuratedImageGovernance({
      profile,
      heroImage: paths.heroImage,
      thumbImage: paths.thumbImage,
      mobileImage: paths.mobileImage,
      imageApproved: true,
      publishGate: false,
    });
    if (!check.pass) {
      console.log("skip", row.slug, check.mismatches.map((m) => m.code).join(","));
      continue;
    }
    const preset = "firehall_editorial_v1" as ImageStylePresetId;
    const base = createEmptyEditorialImageMetadata(imageSlug, preset, imageSlug, 1);
    const json = JSON.stringify({
      ...base,
      heroImage: paths.heroImage,
      thumbnailImage: paths.thumbImage,
      mobileHeroImage: paths.mobileImage,
      railPreviewImage: paths.railImage,
      imageApproved: true,
      imageVersion: 2,
      generatedAt: new Date().toISOString(),
    });
    db.prepare(
      `UPDATE curated_recipes
       SET hero_image = ?, editorial_image_json = ?, status = 'published', updated_at = datetime('now')
       WHERE recipe_id = ?`,
    ).run(paths.heroImage, json, row.recipe_id);
    console.log("fixed", row.slug, "→", imageSlug);
    applied++;
    republished++;
  }
  console.log({ applied, republished });
  flushSqliteToDisk();
  releaseSqliteTimersForTests();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
