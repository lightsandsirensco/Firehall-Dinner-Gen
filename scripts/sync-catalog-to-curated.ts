/**
 * One-time / maintenance: copy recipe_catalog → curated_recipes (normalized).
 *
 *   npx tsx scripts/sync-catalog-to-curated.ts
 */

import "dotenv/config";
import { initCuratedRecipeStore, upsertCuratedRecipe } from "../server/curated-recipe-store.js";
import { initRecipeCatalog, listCatalogCandidatesForExplore } from "../server/recipe-catalog.js";
import { curatedInsertFromCanonical } from "../server/curated-recipe-bridge.js";

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  await initRecipeCatalog();

  const batch = listCatalogCandidatesForExplore(500);
  let synced = 0;
  for (const c of batch) {
    try {
      const insert = curatedInsertFromCanonical(c);
      insert.status = "published";
      upsertCuratedRecipe(insert);
      synced++;
    } catch (e) {
      console.warn(`Skip ${c.catalogId}:`, (e as Error).message);
    }
  }
  console.log(`Synced ${synced}/${batch.length} catalog rows → curated_recipes`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
