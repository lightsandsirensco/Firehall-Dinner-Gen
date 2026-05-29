/**
 * Upsert Performance Meals into curated_recipes for explore + generator.
 */

import { mealFormatToArchetype } from "../../shared/canonical-recipe.js";
import { curatedRecipeIdFromSlug } from "../../shared/curated-recipe/ids.js";
import type { CuratedRecipeInsert } from "../../shared/curated-recipe/types.js";
import type { IngestRecipeDraft } from "../../shared/ingestion/recipe-ingest-schema.js";
import { assignExploreCategories } from "../../shared/ingestion/categorize.js";
import { computeIngestQualityScores } from "../../shared/ingestion/scoring.js";
import { recipeFingerprint } from "../../shared/ingestion/dedupe.js";
import { PERFORMANCE_PAGE_CATEGORY, PERFORMANCE_SET_TAG, PERFORMANCE_SET_VERSION } from "../../shared/performance-meals/types.js";
import type { PerformanceAdaptedRecipe } from "../../shared/performance-meals/types.js";
import { performancePageImageSet } from "../../shared/performance-meals/recipe-page-paths.js";
import { getCuratedRecipeBySlug, upsertCuratedRecipe } from "../curated-recipe-store.js";
import { curatedInsertFromIngestDraft } from "../curated-recipe-bridge.js";
import { buildGenerateResponseFromDraft } from "../ingestion/build-generate-response.js";

function performanceTags(recipe: PerformanceAdaptedRecipe): string[] {
  const { manifest } = recipe;
  const tags = new Set<string>([
    PERFORMANCE_SET_TAG,
    `performance_v${PERFORMANCE_SET_VERSION}`,
    `master:${PERFORMANCE_PAGE_CATEGORY}`,
    "hall_meal",
    "high_protein",
  ]);
  if (manifest.explorePools.some((p) => p === "healthy" || p.includes("healthy"))) {
    tags.add("healthy_meal");
  }
  if (manifest.prepMinutes + manifest.cookMinutes <= 45) tags.add("quick_shift_meal");
  return [...tags];
}

function adaptedToIngestDraft(recipe: PerformanceAdaptedRecipe): IngestRecipeDraft {
  const { manifest } = recipe;
  const images = performancePageImageSet(manifest.slug);
  const n = recipe.nutrition;
  const totalMinutes = manifest.prepMinutes + manifest.cookMinutes;

  const draft: IngestRecipeDraft = {
    fingerprint: "",
    source: "manual",
    title: manifest.title,
    summary: manifest.hookLine || manifest.subtitle,
    heroImage: images.heroImage,
    imageAlt: manifest.title,
    ingredients: recipe.ingredients.map((ing) => ({
      name: ing.name,
      amount: parseFloat(String(ing.quantity ?? "1")) || 1,
      unit: ing.unit || "",
      original: [ing.quantity, ing.unit, ing.name].filter(Boolean).join(" ").trim(),
    })),
    steps: recipe.steps.map((s) => ({
      number: s.stepNumber,
      step: `${s.title}: ${s.instruction}`,
    })),
    cuisine: manifest.cuisine,
    protein: manifest.protein,
    mealFormat: manifest.mealFormat,
    mealArchetype: mealFormatToArchetype(manifest.mealFormat),
    prepMinutes: manifest.prepMinutes,
    totalMinutes,
    cleanupDifficulty: recipe.cleanupDifficulty === "heavy" ? 4 : recipe.cleanupDifficulty === "easy" ? 2 : 3,
    servingsBase: manifest.crewSizeDefault,
    exploreCategories: [
      ...manifest.explorePools.filter((p) => p !== "performance"),
      "high_protein",
      "healthy",
    ],
    tags: performanceTags(recipe),
    trendScore: 72,
    comfortScore: 55,
    healthyScore: 88,
    firehallSuitabilityScore: 80,
    appetiteScore: 70,
    qualityScore: 78,
    sourceName: "Firehall Meals",
    sourceUrl: "",
    license: "owned",
    curatedSlug: manifest.slug,
  };

  draft.exploreCategories = assignExploreCategories(draft);
  Object.assign(draft, computeIngestQualityScores(draft, draft.trendScore));
  draft.fingerprint = recipeFingerprint(draft);
  return draft;
}

function buildPerformanceCuratedInsert(recipe: PerformanceAdaptedRecipe): CuratedRecipeInsert {
  const draft = adaptedToIngestDraft(recipe);
  const { manifest } = recipe;
  const images = performancePageImageSet(manifest.slug);
  const insert = curatedInsertFromIngestDraft(draft);
  const generateResponse = buildGenerateResponseFromDraft(draft);

  generateResponse.title = manifest.title;
  generateResponse.why_it_fits_tonight = manifest.hookLine || manifest.subtitle;
  generateResponse._recipe_source = {
    kind: "curated",
    name: "Firehall Meals",
    url: "",
    license: "owned",
  };
  if (recipe.nutrition) {
    generateResponse.macros_per_serving = {
      calories: recipe.nutrition.calories,
      protein_g: recipe.nutrition.protein,
      carbs_g: recipe.nutrition.carbs,
      fat_g: recipe.nutrition.fats,
    };
  }

  return {
    ...insert,
    recipeId: curatedRecipeIdFromSlug(manifest.slug),
    slug: manifest.slug,
    status: "published",
    title: manifest.title,
    summary: manifest.hookLine || manifest.subtitle,
    heroImage: images.heroImage,
    images: [
      { role: "hero", url: images.heroImage, altText: manifest.title, position: 0 },
      { role: "thumb", url: images.thumbImage, altText: manifest.title, position: 1 },
    ],
    category: PERFORMANCE_PAGE_CATEGORY,
    featured: manifest.featured ?? false,
    categories: [
      ...new Set([
        ...manifest.explorePools.filter((p) => p !== "performance"),
        "high_protein",
        "healthy",
      ]),
    ],
    tags: performanceTags(recipe),
    scores: {
      comfort: 55,
      healthy: 88,
      firehallSuitability: 80,
      quality: 78,
      appetite: 70,
      trend: 72,
    },
    generateResponse,
    source: {
      kind: "manual",
      name: "Firehall Meals",
      url: "",
      license: "owned",
      externalId: `performance:${manifest.slug}`,
    },
  };
}

export async function upsertPerformanceMeal(
  recipe: PerformanceAdaptedRecipe,
  options: { dryRun?: boolean; skipIfPublished?: boolean } = {},
): Promise<{ ok: boolean; reason?: string; recipeId?: string }> {
  const slug = recipe.manifest.slug;
  if (options.skipIfPublished) {
    const existing = getCuratedRecipeBySlug(slug);
    if (existing?.tags?.includes(PERFORMANCE_SET_TAG)) {
      return { ok: true, reason: "already_performance", recipeId: existing.recipeId };
    }
  }

  const insert = buildPerformanceCuratedInsert(recipe);
  if (options.dryRun) {
    return { ok: true, reason: "dry_run", recipeId: insert.recipeId };
  }

  upsertCuratedRecipe(insert);
  return { ok: true, recipeId: insert.recipeId };
}
