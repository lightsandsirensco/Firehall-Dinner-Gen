#!/usr/bin/env tsx
/**
 * Upsert hall classics into curated_recipes with package steps + pinned heroes (no Spoonacular API).
 *
 *   npx tsx scripts/sync-hall-classics-curated.ts
 *   npx tsx scripts/sync-hall-classics-curated.ts smash-burgers steak-tacos
 */
import "dotenv/config";
import { initCuratedRecipeStore, upsertCuratedRecipe, getCuratedRecipeBySlug } from "../server/curated-recipe-store.js";
import { curatedInsertFromIngestDraft } from "../server/curated-recipe-bridge.js";
import { CLASSIC_HALL_MEALS, resolveClassicHeroImage } from "../shared/classic-hall-meals.js";
import { getCuratedPackageDef } from "../shared/curated-hall-packages.js";
import { assignExploreCategories } from "../shared/ingestion/categorize.js";
import { recipeFingerprint } from "../shared/ingestion/dedupe.js";
import { computeIngestQualityScores } from "../shared/ingestion/scoring.js";
import type { IngestRecipeDraft } from "../shared/ingestion/recipe-ingest-schema.js";
import { mealFormatToArchetype } from "../shared/canonical-recipe.js";
import { flushSqliteToDisk } from "../server/sqlite.js";

/** Site-root path so Explore/cards work on any host (not localhost-absolute). */
function ownedHeroPath(meal: (typeof CLASSIC_HALL_MEALS)[number]): string {
  const path = resolveClassicHeroImage(meal);
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      return new URL(path).pathname;
    } catch {
      return path;
    }
  }
  return path.startsWith("/") ? path : `/${path}`;
}

async function main(): Promise<void> {
  const filter = process.argv.slice(2).map((s) => s.toLowerCase());
  await initCuratedRecipeStore();

  let n = 0;
  for (const meal of CLASSIC_HALL_MEALS) {
    if (filter.length > 0 && !filter.includes(meal.slug)) continue;
    const pkg = getCuratedPackageDef(meal.slug);
    if (!pkg) {
      console.warn(`[sync] skip — no package for ${meal.slug}`);
      continue;
    }

    const mealFormat = meal.generatorFilters.meal_format || pkg.mealFormat;
    const heroPath = ownedHeroPath(meal);
    if (!heroPath.startsWith("/images/")) {
      console.warn(`[sync] skip ${meal.slug} — no owned hero (got ${heroPath.slice(0, 40)}…)`);
      continue;
    }

    const draft: IngestRecipeDraft = {
      fingerprint: "",
      source: "hall_classic",
      title: meal.title,
      summary: meal.exploreSummary ?? meal.description,
      heroImage: heroPath,
      imageAlt: meal.imageAlt,
      ingredients: pkg.ingredients.map((ing) => ({
        name: ing.name,
        amount: ing.qty,
        unit: ing.unit,
        original: [ing.qty, ing.unit, ing.name].filter(Boolean).join(" ").trim(),
        category: ing.category,
      })),
      steps: pkg.steps.map((s, i) => ({
        number: i + 1,
        step: `${s.title}: ${s.instructions}`,
      })),
      cuisine: meal.cuisine,
      protein: meal.protein.toLowerCase(),
      mealFormat,
      mealArchetype: mealFormatToArchetype(mealFormat),
      prepMinutes: pkg.prepMin,
      totalMinutes: meal.exploreReadyMinutes ?? pkg.prepMin + pkg.cookMin,
      cleanupDifficulty: 3,
      servingsBase: meal.exploreServings ?? 8,
      exploreCategories: [],
      tags: [...meal.tags, "crew_favorite", "trending"],
      trendScore: 92,
      comfortScore: 0,
      healthyScore: 0,
      firehallSuitabilityScore: 0,
      appetiteScore: 0,
      qualityScore: 0,
      sourceName: "Firehall Classics",
      sourceUrl: meal.externalUrl || "",
      license: "owned",
      spoonacularId: meal.spoonacularRecipeId,
      curatedSlug: meal.slug,
    };

    draft.exploreCategories = assignExploreCategories(draft);
    Object.assign(draft, computeIngestQualityScores(draft, draft.trendScore));
    draft.fingerprint = recipeFingerprint(draft);

    const insert = curatedInsertFromIngestDraft(draft);
    insert.status = "published";
    insert.slug = meal.slug;
    const existingBySlug = getCuratedRecipeBySlug(meal.slug);
    if (existingBySlug) {
      insert.recipeId = existingBySlug.recipeId;
    }
    insert.categories = [...new Set([...(insert.categories || []), "crew_favorite", "trending"])];
    upsertCuratedRecipe(insert);
    console.log(`[sync] ${meal.slug} → ${insert.recipeId}`);
    n++;
  }

  flushSqliteToDisk();
  console.log(`[sync] done — ${n} hall classic(s) upserted (persisted to data/cache.db)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
