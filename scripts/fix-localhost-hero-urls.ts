#!/usr/bin/env tsx
/** Rewrite curated hero_image values from http://localhost:.../images/ → /images/ */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, flushSqliteToDisk } from "../server/sqlite.js";
import { normalizeOwnedMediaPath } from "../shared/food-imagery/paths.js";

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();
  const rows = db
    .prepare(
      `SELECT recipe_id, hero_image FROM curated_recipes
       WHERE hero_image LIKE 'http://localhost%/images/%'
          OR hero_image LIKE 'http://127.0.0.1%/images/%'`,
    )
    .all() as { recipe_id: string; hero_image: string }[];

  let n = 0;
  for (const row of rows) {
    const next = normalizeOwnedMediaPath(row.hero_image);
    if (next === row.hero_image) continue;
    db.prepare(`UPDATE curated_recipes SET hero_image = ? WHERE recipe_id = ?`).run(
      next,
      row.recipe_id,
    );
    db.prepare(
      `UPDATE curated_recipe_images SET url = ? WHERE recipe_id = ? AND role = 'hero'`,
    ).run(next, row.recipe_id);
    n++;
    console.log(`[fix] ${row.recipe_id} → ${next}`);
  }
  flushSqliteToDisk();
  console.log(`[fix] updated ${n} row(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
