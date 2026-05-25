#!/usr/bin/env tsx
/**
 * Batch-generate Firehall food imagery for hall classics and/or curated recipes.
 *
 *   npx tsx scripts/generate-food-imagery.ts
 *   npx tsx scripts/generate-food-imagery.ts smash-burgers steak-tacos
 *   npx tsx scripts/generate-food-imagery.ts --all-classics --sync
 *   npx tsx scripts/generate-food-imagery.ts --spoonacular-only
 *   npx tsx scripts/generate-food-imagery.ts --all-pizza --sync
 */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { runDbMigrations } from "../server/db/migrate.js";
import { CLASSIC_HALL_MEALS } from "../shared/classic-hall-meals.js";
import { PIZZA_CONCEPT_REGISTRY } from "../shared/pizza-concepts.js";
import { buildPizzaImageryContext } from "../shared/food-imagery/pizza-prompt-builder.js";
import { getCuratedPackageDef } from "../shared/curated-hall-packages.js";
import { generateFoodImageryForRecipe } from "../server/food-imagery/pipeline.js";
import type { FoodImageryContext } from "../shared/food-imagery/types.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { flushSqliteToDisk, getSharedLocalDb } from "../server/sqlite.js";

function buildContextsFromCuratedSpoonacular(limit = 40): FoodImageryContext[] {
  const db = getSharedLocalDb();
  const rows = db
    .prepare(
      `SELECT slug, title, summary, cuisine, meal_format, protein, hero_image
       FROM curated_recipes
       WHERE status = 'published' AND hero_image LIKE '%spoonacular.com%'
       ORDER BY slug
       LIMIT ?`,
    )
    .all(limit) as {
    slug: string;
    title: string;
    summary: string | null;
    cuisine: string | null;
    meal_format: string | null;
    protein: string | null;
    hero_image: string;
  }[];

  return rows.map((row) => ({
    recipeKey: row.slug,
    title: row.title,
    displayTitle: row.title,
    summary: row.summary ?? undefined,
    cuisine: row.cuisine ?? "American",
    mealFormat: row.meal_format ?? "plated_main",
    protein: row.protein ?? "mixed",
    heroImage: row.hero_image,
    sourceKind: "curated" as const,
  }));
}

function buildContextFromClassic(slug: string): FoodImageryContext | null {
  const meta = CLASSIC_HALL_MEALS.find((m) => m.slug === slug);
  const pkg = getCuratedPackageDef(slug);
  if (!meta) return null;
  return {
    recipeKey: slug,
    title: meta.title,
    displayTitle: meta.displayTitle,
    summary: meta.description,
    cuisine: meta.cuisine,
    mealFormat: meta.mealFormat,
    protein: meta.protein,
    ingredients: pkg?.ingredients?.map((i) => ({ name: i.name })),
    tags: meta.tags,
    pinnedHeroPath: meta.heroImagePath,
    sourceKind: "hall_classic",
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const allClassics = args.includes("--all-classics");
  const allPizza = args.includes("--all-pizza");
  const spoonacularOnly = args.includes("--spoonacular-only");
  const curatedSpoonacular = args.includes("--curated-spoonacular");
  const curatedLimit = parseInt(
    args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "40",
    10,
  );
  const force = args.includes("--force");
  const sync = args.includes("--sync") || !args.includes("--queue");
  const slugs = args.filter((a) => !a.startsWith("--"));

  await runDbMigrations();
  await initCuratedRecipeStore();

  const cfg = getFoodImageryConfig();
  if (!cfg.enabled) {
    console.error("[generate-food-imagery] Disabled — set OPENAI_API_KEY and FOOD_IMAGERY_ENABLED");
    process.exit(1);
  }

  let targets: FoodImageryContext[] = [];

  if (curatedSpoonacular) {
    targets = buildContextsFromCuratedSpoonacular(curatedLimit);
  } else if (allPizza) {
    for (const concept of PIZZA_CONCEPT_REGISTRY.filter((c) => c.featured)) {
      targets.push(buildPizzaImageryContext(concept));
    }
  } else if (allClassics || slugs.length === 0) {
    for (const meal of CLASSIC_HALL_MEALS) {
      const ctx = buildContextFromClassic(meal.slug);
      if (ctx) targets.push(ctx);
    }
  } else {
    for (const slug of slugs) {
      const ctx = buildContextFromClassic(slug);
      if (ctx) targets.push(ctx);
      else console.warn(`[generate-food-imagery] unknown slug: ${slug}`);
    }
  }

  if (spoonacularOnly) {
    targets = targets.filter((t) => !t.pinnedHeroPath?.trim());
  }

  console.log(`[generate-food-imagery] ${targets.length} target(s) sync=${sync}`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const ctx of targets) {
    const result = sync
      ? await generateFoodImageryForRecipe(ctx, {
          force,
          recipeId: `spoonacular:${CLASSIC_HALL_MEALS.find((m) => m.slug === ctx.recipeKey)?.spoonacularRecipeId}`,
        })
      : await (await import("../server/food-imagery/pipeline.js")).ensureFoodImageryQueued(ctx, {
          force,
        });

    if (result.skipped) {
      skip++;
      console.log(`  skip ${ctx.recipeKey} — ${result.reason}`);
    } else if (result.ok) {
      ok++;
      console.log(`  ok ${ctx.recipeKey} → ${result.publicPath || result.jobId || "queued"}`);
    } else {
      fail++;
      console.log(`  fail ${ctx.recipeKey} — ${result.reason}`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  flushSqliteToDisk();
  console.log(`[generate-food-imagery] done ok=${ok} skip=${skip} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
