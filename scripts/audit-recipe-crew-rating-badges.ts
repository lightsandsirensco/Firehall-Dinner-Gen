#!/usr/bin/env tsx
/**
 * Badge distribution report — ensures badges stay rare (<20% target).
 */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { initRecipeCrewRatingsStore, getRecipeCrewRatingAnalytics } from "../server/recipe-crew-ratings/store.js";
import { buildApprovedCatalog } from "../server/approved-catalog.js";

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  await initRecipeCrewRatingsStore();

  const catalog = buildApprovedCatalog();
  const analytics = getRecipeCrewRatingAnalytics(
    catalog.recipes.map((r) => ({ slug: r.slug, category: r.category })),
  );

  const catalogSize = catalog.recipes.length;
  const badgeRatePct = Math.round(analytics.badgeRate * 1000) / 10;

  console.log("=== Recipe Crew Rating Badge Distribution ===\n");
  console.log(`Catalog recipes: ${catalogSize}`);
  console.log(`Rated recipes: ${analytics.totalRatedRecipes}`);
  console.log(`Total votes: ${analytics.totalVotes}`);
  console.log(`Recipes with any badge: ${Math.round(analytics.badgeRate * analytics.totalRatedRecipes)} (${badgeRatePct}%)`);
  console.log("\nBadge counts:");
  for (const [badge, count] of Object.entries(analytics.badgeDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${badge}: ${count}`);
  }

  if (analytics.totalRatedRecipes > 20 && badgeRatePct > 20) {
    console.error("\nWARN: Badge rate exceeds 20% target");
    process.exit(1);
  }

  console.log("\nBadge distribution OK.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
