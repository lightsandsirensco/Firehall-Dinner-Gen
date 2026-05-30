/**
 * Upsert Hall Expansion recipes into curated_recipes (same pipeline as Performance Meals).
 */

import { mealFormatToArchetype } from "../../shared/canonical-recipe.js";
import { curatedRecipeIdFromSlug } from "../../shared/curated-recipe/ids.js";
import type { CuratedRecipeInsert } from "../../shared/curated-recipe/types.js";
import type { IngestRecipeDraft } from "../../shared/ingestion/recipe-ingest-schema.js";
import { assignExploreCategories } from "../../shared/ingestion/categorize.js";
import { computeIngestQualityScores } from "../../shared/ingestion/scoring.js";
import { recipeFingerprint } from "../../shared/ingestion/dedupe.js";
import {
  HALL_EXPANSION_PAGE_CATEGORY,
  HALL_EXPANSION_SET_TAG,
  type ExpansionRecipeDef,
} from "../../shared/hall-expansion/types.js";
import { hallExpansionPageImageSet } from "../../shared/hall-expansion/recipe-page-paths.js";
import { getCuratedRecipeBySlug, upsertCuratedRecipe } from "../curated-recipe-store.js";
import { curatedInsertFromIngestDraft } from "../curated-recipe-bridge.js";
import { buildGenerateResponseFromDraft } from "../ingestion/build-generate-response.js";

function categoryExplorePools(category: ExpansionRecipeDef["category"]): string[] {
  if (category === "smoker_recipes") {
    return ["bbq_grill_nights", "bbq_smoker", "smoker_recipes", "bbq"];
  }
  if (category === "game_day_recipes") {
    return ["game_day_watch_party", "game_day", "comfort_food"];
  }
  return ["big_crew_feeders", "feed_a_crowd", "crew_feeders", "bar_line"];
}

function expansionTags(recipe: ExpansionRecipeDef): string[] {
  const tags = new Set<string>([
    HALL_EXPANSION_SET_TAG,
    `master:${HALL_EXPANSION_PAGE_CATEGORY}`,
    `category:${recipe.category}`,
    "hall_meal",
    "firefighter_meal",
  ]);
  if (recipe.prepMinutes + recipe.cookMinutes <= 45) tags.add("quick_shift_meal");
  if (recipe.category === "game_day_recipes") tags.add("game_day");
  if (recipe.category === "smoker_recipes") tags.add("bbq_smoker");
  return [...tags];
}

function adaptedToIngestDraft(recipe: ExpansionRecipeDef): IngestRecipeDraft {
  const images = hallExpansionPageImageSet(recipe.slug);
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  const draft: IngestRecipeDraft = {
    fingerprint: "",
    source: "manual",
    title: recipe.title,
    summary: recipe.hookLine || recipe.subtitle,
    heroImage: images.heroImage,
    imageAlt: recipe.title,
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
    cuisine: recipe.cuisine,
    protein: recipe.protein,
    mealFormat: recipe.mealFormat,
    mealArchetype: mealFormatToArchetype(recipe.mealFormat),
    prepMinutes: recipe.prepMinutes,
    totalMinutes,
    cleanupDifficulty:
      recipe.cleanupDifficulty === "heavy" ? 4 : recipe.cleanupDifficulty === "easy" ? 2 : 3,
    servingsBase: recipe.crewSizeDefault,
    exploreCategories: [
      ...new Set([...recipe.explorePools, ...categoryExplorePools(recipe.category)]),
    ],
    tags: expansionTags(recipe),
    trendScore: 70,
    comfortScore: recipe.category === "game_day_recipes" ? 75 : 60,
    healthyScore: 55,
    firehallSuitabilityScore: 82,
    appetiteScore: 72,
    qualityScore: 80,
    sourceName: "Firehall Meals",
    sourceUrl: "",
    license: "owned",
    curatedSlug: recipe.slug,
  };

  draft.exploreCategories = assignExploreCategories(draft);
  Object.assign(draft, computeIngestQualityScores(draft, draft.trendScore));
  draft.fingerprint = recipeFingerprint(draft);
  return draft;
}

function buildExpansionCuratedInsert(recipe: ExpansionRecipeDef): CuratedRecipeInsert {
  const draft = adaptedToIngestDraft(recipe);
  const images = hallExpansionPageImageSet(recipe.slug);
  const insert = curatedInsertFromIngestDraft(draft);
  const generateResponse = buildGenerateResponseFromDraft(draft);

  generateResponse.title = recipe.title;
  generateResponse.why_it_fits_tonight = recipe.hookLine || recipe.subtitle;
  generateResponse._recipe_source = {
    kind: "curated",
    name: "Firehall Meals",
    url: "",
    license: "owned",
  };
  generateResponse.macros_per_serving = {
    calories: recipe.nutrition.calories,
    protein_g: recipe.nutrition.protein,
    carbs_g: recipe.nutrition.carbs,
    fat_g: recipe.nutrition.fats,
  };

  return {
    ...insert,
    recipeId: curatedRecipeIdFromSlug(recipe.slug),
    slug: recipe.slug,
    status: "published",
    title: recipe.title,
    summary: recipe.hookLine || recipe.subtitle,
    heroImage: images.heroImage,
    images: [
      { role: "hero", url: images.heroImage, altText: recipe.title, position: 0 },
      { role: "thumb", url: images.thumbImage, altText: recipe.title, position: 1 },
    ],
    category: recipe.category,
    featured: false,
    categories: [
      ...new Set([...recipe.explorePools, ...categoryExplorePools(recipe.category)]),
    ],
    tags: expansionTags(recipe),
    scores: {
      comfort: recipe.category === "game_day_recipes" ? 75 : 60,
      healthy: 55,
      firehallSuitability: 82,
      quality: 80,
      appetite: 72,
      trend: 70,
    },
    generateResponse,
    source: {
      kind: "manual",
      name: "Firehall Meals",
      url: "",
      license: "owned",
      externalId: `hall_expansion:${recipe.slug}`,
    },
  };
}

export async function upsertHallExpansionRecipe(
  recipe: ExpansionRecipeDef,
  options: { dryRun?: boolean; skipIfPublished?: boolean } = {},
): Promise<{ ok: boolean; reason?: string; recipeId?: string }> {
  const slug = recipe.slug;
  if (options.skipIfPublished) {
    const existing = getCuratedRecipeBySlug(slug);
    if (existing?.tags?.includes(HALL_EXPANSION_SET_TAG)) {
      return { ok: true, reason: "already_expansion", recipeId: existing.recipeId };
    }
  }

  const insert = buildExpansionCuratedInsert(recipe);
  if (options.dryRun) {
    return { ok: true, reason: "dry_run", recipeId: insert.recipeId };
  }

  upsertCuratedRecipe(insert);
  return { ok: true, recipeId: insert.recipeId };
}
