#!/usr/bin/env tsx
/**
 * Seed curated_recipes for Explore (100+ meals via Spoonacular).
 *
 *   npx tsx scripts/seed-curated-explore.ts
 *   npx tsx scripts/seed-curated-explore.ts --per-pool 10
 */

import "dotenv/config";
import { applyDevInsecureTlsIfAllowed } from "./dev-tls.js";

applyDevInsecureTlsIfAllowed();
import { initCuratedRecipeStore, upsertCuratedRecipe, getCuratedStoreStats } from "../server/curated-recipe-store.js";
import { searchRecipes } from "../server/spoonacular.js";
import { buildCuratedInsertFromSpoonacular } from "../server/ingestion/spoonacular-to-curated.js";
import { upsertCatalogFromV2 } from "../server/recipe-catalog.js";
import { initRecipeCatalog } from "../server/recipe-catalog.js";
import { buildCanonicalFromV2 } from "../server/recipe-catalog.js";
import type { GenerateRequest } from "../shared/schema.js";
import { CLASSIC_HALL_MEALS } from "../shared/classic-hall-meals.js";
import { curatedRecipeIdFromSpoonacular } from "../shared/curated-recipe/ids.js";
import { inferActualProtein } from "../server/spoonacular-converter.js";
import { getRecipeById } from "../server/spoonacular.js";
import { convertSpoonacularToGenerateResponse } from "../server/spoonacular-converter.js";

const POOL_SEEDS: { pool: string; queries: string[] }[] = [
  { pool: "trending", queries: ["popular dinner recipe", "viral dinner ideas", "easy crowd dinner"] },
  { pool: "bbq", queries: ["bbq chicken dinner", "grilled ribs", "pulled pork dinner", "smoked brisket"] },
  { pool: "comfort", queries: ["mac and cheese dinner", "meatloaf dinner", "chicken pot pie", "beef chili"] },
  { pool: "quick", queries: ["30 minute dinner", "quick chicken dinner", "easy pasta dinner"] },
  { pool: "hearty", queries: ["beef chili", "chicken noodle soup dinner", "potato soup hearty"] },
  { pool: "healthy", queries: ["healthy chicken dinner", "grilled salmon dinner", "lean turkey dinner"] },
  { pool: "chicken", queries: ["chicken dinner", "crispy chicken dinner", "baked chicken thighs"] },
  { pool: "beef", queries: ["beef dinner", "steak dinner", "ground beef dinner"] },
  { pool: "pasta", queries: ["pasta dinner", "spaghetti dinner", "baked ziti"] },
  { pool: "handheld", queries: ["burger dinner", "tacos dinner", "sandwich dinner"] },
  { pool: "breakfast", queries: ["breakfast for dinner", "pancakes bacon dinner"] },
  { pool: "slow", queries: ["slow cooker dinner", "crockpot pot roast", "slow cooker pulled pork"] },
  { pool: "one_pot", queries: ["one pot dinner", "sheet pan dinner", "skillet dinner"] },
  { pool: "bowl", queries: ["rice bowl dinner", "burrito bowl dinner"] },
];

async function seedClassicHallMeals(): Promise<number> {
  let n = 0;
  const req: GenerateRequest = {
    crew_size: 8,
    busy_level: "average",
    time_available: "30-45",
    appliances: ["stove", "oven"],
    protein: "any",
    healthiness_preference: "balanced",
    allergens_to_avoid: [],
    cuisine_style: "any",
    meal_format: "random",
    prefer_different_style: false,
  };

  for (const meal of CLASSIC_HALL_MEALS) {
    try {
      const detail = await getRecipeById(meal.spoonacularRecipeId, false);
      const ingredientNames = (detail.extendedIngredients || []).map(
        (i) => i.name || i.original || "",
      );
      const protein = inferActualProtein(detail.title, ingredientNames) || meal.protein;
      const gr = convertSpoonacularToGenerateResponse(detail, { ...req, protein: protein as GenerateRequest["protein"] }, protein);
      const insert = await buildCuratedInsertFromSpoonacular({
        spoonacularId: meal.spoonacularRecipeId,
        searchTitle: meal.title,
        image: detail.image,
        sourceUrl: detail.sourceUrl,
        trendScore: 85,
        extraCategories: ["crew_favorite", "trending", meal.mealFormat.replace(/_/g, " ")],
      });
      if (!insert) continue;
      insert.slug = meal.slug;
      insert.recipeId = curatedRecipeIdFromSpoonacular(meal.spoonacularRecipeId);
      insert.status = "published";
      insert.categories = [...new Set([...(insert.categories || []), "crew_favorite", "trending"])];
      upsertCuratedRecipe(insert);
      await upsertCatalogFromV2({
        request: req,
        recipe: gr,
        spoonacularId: meal.spoonacularRecipeId,
        originalTitle: meal.title,
        chosenProtein: protein,
        sourceUrl: detail.sourceUrl || "",
        image: detail.image,
        cuisines: detail.cuisines,
        readyInMinutes: detail.readyInMinutes,
        servings: detail.servings,
      });
      n++;
      console.log(`[seed] classic ${meal.slug}`);
      await delay(300);
    } catch (e) {
      console.warn(`[seed] classic skip ${meal.slug}:`, (e as Error).message);
    }
  }
  return n;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const perPool = parseInt(process.argv.find((a) => a.startsWith("--per-pool="))?.split("=")[1] || "10", 10);

  if (!process.env.SPOONACULAR_API_KEY) {
    console.error("[seed] SPOONACULAR_API_KEY required");
    process.exit(1);
  }

  await initCuratedRecipeStore();
  await initRecipeCatalog();

  console.log("[seed] Seeding hall classics…");
  const classics = await seedClassicHallMeals();
  console.log(`[seed] Classics: ${classics}`);

  const seenSpoonacular = new Set<number>();
  let total = 0;
  let failed = 0;

  for (const { pool, queries } of POOL_SEEDS) {
    let poolCount = 0;
    for (const query of queries) {
      if (poolCount >= perPool) break;
      try {
        const result = await searchRecipes(query, { number: 6, sort: "popularity" });
        for (const hit of result.results) {
          if (poolCount >= perPool) break;
          if (!hit.id || seenSpoonacular.has(hit.id)) continue;
          if (!hit.image?.includes("spoonacular.com")) continue;

          const insert = await buildCuratedInsertFromSpoonacular({
            spoonacularId: hit.id,
            searchTitle: hit.title,
            image: hit.image,
            sourceUrl: hit.sourceUrl,
            trendScore: 60 + poolCount,
            extraCategories: [pool],
          });

          if (!insert) {
            failed++;
            continue;
          }

          seenSpoonacular.add(hit.id);
          upsertCuratedRecipe(insert);
          poolCount++;
          total++;
          console.log(`[seed] ${pool} +1 "${insert.title.slice(0, 45)}" id=${hit.id} q=${scores(insert)}`);
          await delay(350);
        }
      } catch (e) {
        console.warn(`[seed] pool ${pool} query "${query}" failed:`, (e as Error).message);
      }
    }
    console.log(`[seed] Pool "${pool}": ${poolCount} recipes`);
  }

  const stats = getCuratedStoreStats();
  console.log("\n[seed] DONE");
  console.log(`  Total new: ${total}`);
  console.log(`  Failed/skipped: ${failed}`);
  console.log(`  Curated DB:`, stats);
}

function scores(insert: { scores: { quality: number } }): number {
  return insert.scores.quality;
}

main().catch((e) => {
  console.error("[seed] FATAL:", e);
  process.exit(1);
});
