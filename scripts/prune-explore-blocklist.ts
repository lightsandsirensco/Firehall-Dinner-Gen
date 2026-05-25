#!/usr/bin/env tsx
/**
 * Archive off-brand Explore rows (e.g. Plantain Pizza) and stale taco-night slug.
 *
 *   npx tsx scripts/prune-explore-blocklist.ts
 */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb } from "../server/sqlite.js";
import { isExploreFeedBlocked } from "../shared/explore-feed-blocklist.js";

const STALE_SLUGS = ["taco-night", "plantain-pizza"];

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();

  const rows = db
    .prepare(
      `SELECT recipe_id, slug, title, status FROM curated_recipes WHERE status != 'archived'`,
    )
    .all() as { recipe_id: string; slug: string; title: string; status: string }[];

  let archived = 0;
  for (const row of rows) {
    const slug = row.slug?.toLowerCase() || "";
    const blocked =
      isExploreFeedBlocked(row.title) || STALE_SLUGS.includes(slug);
    if (!blocked) continue;

    db.prepare(
      `UPDATE curated_recipes SET status = 'archived', updated_at = datetime('now') WHERE recipe_id = ?`,
    ).run(row.recipe_id);
    console.log(`[prune] archived ${row.recipe_id} (${row.title})`);
    archived++;
  }

  console.log(`[prune] done — ${archived} recipe(s) archived`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
