#!/usr/bin/env tsx
/**
 * Backfill curated_recipes metadata columns from existing recipe rows.
 *
 *   npx tsx scripts/migrate-curated-metadata.ts
 *   npx tsx scripts/migrate-curated-metadata.ts --dry-run
 */

import "dotenv/config";
import {
  getCuratedRecipeById,
  initCuratedRecipeStore,
  upsertCuratedRecipe,
} from "../server/curated-recipe-store.js";
import { getSharedLocalDb, flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { parseMetadataFromRow } from "../server/curated-recipe-metadata.js";

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();

  const rows = db
    .prepare(`SELECT recipe_id FROM curated_recipes WHERE status != 'archived'`)
    .all() as { recipe_id: string }[];

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const recipeId = String(row.recipe_id);
    const full = getCuratedRecipeById(recipeId);
    if (!full) {
      skipped++;
      continue;
    }

    if (full.metadata && parseMetadataFromRow({ metadata_json: JSON.stringify(full.metadata) })) {
      // already has metadata on read model — still re-upsert to sync denormalized cols if missing
    }

    if (dryRun) {
      updated++;
      continue;
    }

    upsertCuratedRecipe({
      recipeId: full.recipeId,
      slug: full.slug,
      status: full.status,
      title: full.title,
      summary: full.summary,
      heroImage: full.heroImage,
      images: full.images,
      ingredients: full.ingredients,
      instructions: full.instructions,
      prepMinutes: full.prepMinutes,
      cookMinutes: full.cookMinutes,
      totalMinutes: full.totalMinutes,
      servingsBase: full.servingsBase,
      cleanupDifficulty: full.cleanupDifficulty,
      protein: full.protein,
      cuisine: full.cuisine,
      category: full.category,
      mealFormat: full.mealFormat,
      mealArchetype: full.mealArchetype,
      scores: full.scores,
      source: full.source,
      tags: full.tags,
      categories: full.categories,
      featured: full.featured,
      generateResponse: full.generateResponse,
      metadata: full.metadata,
    });
    updated++;
  }

  flushSqliteToDisk();
  releaseSqliteTimersForTests();

  console.log(
    `[metadata-migrate] recipes=${rows.length} updated=${updated} skipped=${skipped} dryRun=${dryRun}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
