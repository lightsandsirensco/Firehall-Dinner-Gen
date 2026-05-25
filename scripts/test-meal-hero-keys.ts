#!/usr/bin/env tsx
/**
 * Verify meal hero key alignment + optional sync generate for hall classics.
 *   npx tsx scripts/test-meal-hero-keys.ts
 *   npx tsx scripts/test-meal-hero-keys.ts --generate smash-burgers steak-tacos chicken-parm
 */
import "dotenv/config";
import { runDbMigrations } from "../server/db/migrate.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { foodImageryContextFromGenerateResponse } from "../server/food-imagery/context-builders.js";
import { mealImageryKeyFromId } from "../server/food-imagery/context-builders.js";
import { resolveMealHeroImage } from "../server/food-imagery/meal-integration.js";
import { generateFoodImageryForRecipe } from "../server/food-imagery/pipeline.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { publicImageFileExists } from "../server/food-imagery/storage-paths.js";
import { CLASSIC_HALL_MEALS } from "../shared/classic-hall-meals.js";
import { getCuratedPackageDef } from "../shared/curated-hall-packages.js";
import { flushSqliteToDisk } from "../server/sqlite.js";

const generateSlugs = process.argv.slice(2).filter((a) => !a.startsWith("--"));

async function main(): Promise<void> {
  const cfg = getFoodImageryConfig();
  console.log("[test] imagery enabled:", cfg.enabled, "storage:", cfg.storageDir);

  const recipeId = "test-uuid-hero-001";
  const signature = "sig-test-burger-abc";
  const ctx = foodImageryContextFromGenerateResponse(
    {
      title: "Double Smash Burgers with Caramelized Onions",
      chosen_protein: "beef",
      meal_style: "burger",
      ingredients: [{ item: "ground beef" }],
    } as import("../shared/schema.js").GenerateResponse,
    recipeId,
    signature,
  );
  console.log("[test] recipeKey:", ctx.recipeKey, "expected:", mealImageryKeyFromId(recipeId));
  if (ctx.recipeKey !== mealImageryKeyFromId(recipeId)) {
    throw new Error("recipeKey mismatch — poll will never find assets");
  }

  await runDbMigrations();
  await initCuratedRecipeStore();

  if (generateSlugs.length > 0 && cfg.enabled) {
    for (const slug of generateSlugs) {
      const meta = CLASSIC_HALL_MEALS.find((m) => m.slug === slug);
      const pkg = getCuratedPackageDef(slug);
      if (!meta || !pkg) {
        console.warn("[test] skip unknown", slug);
        continue;
      }
      const id = `test-${slug}`;
      const gctx = foodImageryContextFromGenerateResponse(
        {
          title: meta.title,
          chosen_protein: meta.protein,
          meal_style: meta.mealFormat,
          ingredients: pkg.ingredients.map((i) => ({ item: i.name })),
        } as import("../shared/schema.js").GenerateResponse,
        id,
        `sig-${slug}`,
      );
      const result = await generateFoodImageryForRecipe(gctx, { force: true, mealId: id });
      console.log("[test] generate", slug, result);
      if (result.publicPath) {
        console.log("[test] file exists:", publicImageFileExists(result.publicPath));
      }
    }
    flushSqliteToDisk();
  }

  const resolved = await resolveMealHeroImage(signature, recipeId, "Double Smash Burgers");
  console.log("[test] resolve:", resolved);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
