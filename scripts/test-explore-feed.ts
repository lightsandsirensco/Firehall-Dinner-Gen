import "dotenv/config";
if (process.env.SPOONACULAR_INSECURE_TLS === "true") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { initRecipeCatalog, listCatalogCandidates } from "../server/recipe-catalog.js";
import { buildExploreEditorialFeed } from "../server/explore-editorial.js";
import { searchRecipes } from "../server/spoonacular.js";
import { EXPLORE_EDITORIAL_SECTIONS } from "../shared/explore-editorial.js";

async function main() {
  console.log("section defs:", EXPLORE_EDITORIAL_SECTIONS.length);
  console.log("SPOONACULAR_API_KEY:", process.env.SPOONACULAR_API_KEY ? "set" : "MISSING");

  try {
    const r = await searchRecipes("chicken dinner", { number: 3 });
    console.log("spoonacular sample:", r.results.length, r.results[0]?.title);
  } catch (e) {
    console.log("spoonacular error:", (e as Error).message);
  }

  await initCuratedRecipeStore();
  await initRecipeCatalog();
  const cat = listCatalogCandidates(5);
  console.log("catalog sample:", cat.length, cat[0]?.title, "spId", cat[0]?.spoonacularId);

  const feed = await buildExploreEditorialFeed({});
  const sections = feed.sections;
  console.log("meta:", feed.meta);
  console.log("feed sections:", sections.length);
  for (const s of sections) {
    console.log(`  ${s.id}: ${s.recipes.length} — ${s.title}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
