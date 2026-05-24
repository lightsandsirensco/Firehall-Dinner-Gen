#!/usr/bin/env tsx
import "dotenv/config";
import { initCuratedRecipeStore, getCuratedStoreStats, listCuratedRecipeSummaries } from "../server/curated-recipe-store.js";
import { initRecipeCatalog, listCatalogCandidates } from "../server/recipe-catalog.js";
import { initIngestionStore, getIngestionSummary, getLatestIngestionRun, listStagingForReview } from "../server/ingestion/ingestion-store.js";
import { buildExploreEditorialFeed } from "../server/explore-editorial.js";

async function main() {
  await initCuratedRecipeStore();
  await initRecipeCatalog();
  try {
    await initIngestionStore();
  } catch {
    /* optional */
  }

  const curated = getCuratedStoreStats();
  const catalog = listCatalogCandidates(500);
  const published = listCuratedRecipeSummaries({ status: "published", limit: 500 });

  const sourceKind: Record<string, number> = {};
  const heroHosts: Record<string, number> = {};
  for (const r of published) {
    sourceKind[r.sourceName] = (sourceKind[r.sourceName] || 0) + 1;
    const host = r.heroImage.includes("spoonacular") ? "spoonacular" : "other";
    heroHosts[host] = (heroHosts[host] || 0) + 1;
  }

  let ingestion = null;
  let staging = 0;
  try {
    ingestion = { summary: getIngestionSummary(), lastRun: getLatestIngestionRun() };
    staging = listStagingForReview("validated", 100).length;
  } catch {
    /* */
  }

  const feed = await buildExploreEditorialFeed({});

  console.log("\n=== EXPLORE AUDIT ===\n");
  console.log("curated_recipes:", curated);
  console.log("recipe_catalog rows:", catalog.length);
  console.log("hero image hosts:", heroHosts);
  console.log("source_name counts:", sourceKind);
  console.log("ingestion:", ingestion);
  console.log("staging validated:", staging);
  console.log("\nfeed meta:", feed.meta);
  console.log("\nsections:");
  for (const s of feed.sections) {
    const src = feed.meta.sectionSources[s.id];
    console.log(`  ${s.id}: ${s.recipes.length} cards`, src || "");
    if (s.recipes[0]) {
      console.log(`    sample: id=${s.recipes[0].id} title="${s.recipes[0].title.slice(0, 50)}" image=${s.recipes[0].image.slice(0, 55)}…`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
