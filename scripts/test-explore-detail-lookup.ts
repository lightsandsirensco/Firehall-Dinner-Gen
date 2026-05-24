#!/usr/bin/env tsx
import "dotenv/config";
import { initCuratedRecipeStore, listCuratedRecipeSummaries } from "../server/curated-recipe-store.js";
import { exploreIdFromRecipeId } from "../shared/explore-curated-id.js";
import { fetchExploreRecipeDetailPayload } from "../server/explore-recipe-detail.js";

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const rows = listCuratedRecipeSummaries({ status: "published", limit: 8, orderBy: "recent" });
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    const cardId =
      r.spoonacularId && r.spoonacularId > 0 ? r.spoonacularId : exploreIdFromRecipeId(r.recipeId);
    try {
      const p = await fetchExploreRecipeDetailPayload(cardId, false, {
        slug: r.slug,
        curatedRecipeId: r.recipeId,
      });
      ok++;
      console.log(`✓ ${cardId} ${r.title.slice(0, 45)} curated=${p._fromCurated}`);
    } catch (e) {
      fail++;
      console.log(`✗ ${cardId} ${r.title.slice(0, 45)} — ${(e as Error).message}`);
    }
  }
  console.log("\nDONE", { ok, fail });
  process.exit(fail > 0 ? 1 : 0);
}

main();
