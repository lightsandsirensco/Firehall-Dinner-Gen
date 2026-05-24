#!/usr/bin/env tsx
/**
 * Backfill archetype_family / variation on published curated recipes.
 */

import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb } from "../server/sqlite.js";
import {
  inferHallArchetypeFamily,
  pickArchetypeVariation,
} from "../shared/meal-archetype-system.js";

async function main() {
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();
  const rows = db
    .prepare(
      `SELECT recipe_id, title, summary, protein FROM curated_recipes WHERE status = 'published'`,
    )
    .all() as { recipe_id: string; title: string; summary: string | null; protein: string }[];

  let updated = 0;
  for (const row of rows) {
    const family = inferHallArchetypeFamily({
      title: row.title,
      summary: row.summary,
      protein: row.protein,
    });
    const variation = pickArchetypeVariation(family, row.title);
    db.prepare(
      `UPDATE curated_recipes SET archetype_family = ?, archetype_variation = ?, updated_at = datetime('now')
       WHERE recipe_id = ?`,
    ).run(family, variation, row.recipe_id);
    updated++;
  }

  console.log(`[backfill] Updated ${updated} published recipes with archetype families`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
