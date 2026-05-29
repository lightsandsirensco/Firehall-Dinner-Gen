/**
 * Local recipe picks for generate pipeline — Golden 100 + Performance 50 catalogs.
 */

import type { GenerateRequest, GenerateResponse } from "@shared/schema";
import type { RecipeSourceAttribution } from "../../shared/canonical-recipe.js";
import { GOLDEN_SET_TAG } from "../../shared/golden-100/types.js";
import { GOLDEN_100_RECIPES } from "../../shared/golden-100/manifest.js";
import { PERFORMANCE_SET_TAG } from "../../shared/performance-meals/types.js";
import { PERFORMANCE_ADAPTED_RECIPES } from "../../shared/performance-meals/adapted/index.js";
import {
  catalogCollectionScoreBoost,
  isApprovedCatalogSlug,
  isGolden100Slug,
  isPerformance50Slug,
  resolveCatalogCollection,
  resolveCatalogRankBias,
  type CatalogCollectionId,
} from "../../shared/hall-catalog/gate.js";
import { hydrateCatalogGenerateResponse } from "../meal-catalog/hydrate-golden-generate.js";
import { applyCrewPortionFloors, hallProTips } from "../firehall-voice.js";
import {
  getCuratedRecipeBySlug,
  listCuratedRecipeSummaries,
  listCuratedSummariesByTag,
} from "../curated-recipe-store.js";
import { proteinMatchesFilter } from "../spoonacular-converter.js";
import { computeSignature } from "../validateRecipe.js";
import { log } from "../logger.js";
import { isExcludedFromDinnerFeeds } from "../../shared/fuel-catalog/isolation.js";
import { isBreakfastMeal } from "../../shared/hall-catalog/isolation.js";
import {
  recentSlugPenalty,
  weightedPickIndex,
} from "../../shared/meal-rotation/weighted-pick.js";
import {
  buildFirehallPoolStages,
  loadFirehallCategoryPool,
  logFirehallPoolAttempt,
  type FirehallCategorySummaryRow,
} from "./firehall-category-pools.js";
import type { FirehallCategoryId } from "../../shared/firehall-categories.js";

const TIME_MAX_MINUTES: Record<string, number> = {
  "15-25": 25,
  "20-30": 30,
  "25-40": 40,
  "30-45": 45,
  "45-60": 60,
  "60-90": 90,
};

export interface LocalRecipePick {
  recipe: GenerateResponse;
  protein: string;
  originalTitle: string;
  catalogId: string;
  recipeSource?: RecipeSourceAttribution;
  slug: string;
}

function signatureBlocked(
  sig: string,
  recentSignatures?: string[],
  currentRecipeSignature?: string,
): boolean {
  if (currentRecipeSignature && sig === currentRecipeSignature) return true;
  if (recentSignatures?.includes(sig)) return true;
  return false;
}

function scoreCuratedRow(
  row: { protein: string; totalMinutes: number; scores: { quality: number }; sourceKind: string },
  request: GenerateRequest,
): number {
  let score = row.scores.quality || 0;
  const selected = request.protein || "any";
  if (proteinMatchesFilter(row.protein, selected)) score += 40;
  const maxMin = TIME_MAX_MINUTES[request.time_available];
  if (maxMin && row.totalMinutes > 0 && row.totalMinutes <= maxMin + 10) score += 15;
  if (row.sourceKind === "publisher") score += 18;
  else if (row.sourceKind === "hall_classic") score += 12;
  return score;
}

function hydratePick(
  slug: string,
  request: GenerateRequest,
  _recipeSource?: RecipeSourceAttribution,
): LocalRecipePick | null {
  if (!isApprovedCatalogSlug(slug)) {
    log(`[generate:local] reject non-catalog slug=${slug}`, "generate");
    return null;
  }

  const full = getCuratedRecipeBySlug(slug);
  const wantsBreakfast = request.meal_format === "breakfast";
  if (!wantsBreakfast && full && isBreakfastMeal(full)) return null;

  const hydrated = hydrateCatalogGenerateResponse(slug, request.crew_size);
  if (!hydrated) {
    log(`[generate:local] reject unhydrated catalog slug=${slug}`, "generate");
    return null;
  }

  const protein = hydrated.protein || defProtein(full, hydrated.recipe);
  const scaled: GenerateResponse = {
    ...hydrated.recipe,
    title: hydrated.title,
    chosen_protein: protein,
    ingredients: applyCrewPortionFloors(hydrated.recipe.ingredients || [], request.crew_size),
    pro_tips:
      hydrated.recipe.pro_tips?.length
        ? hydrated.recipe.pro_tips
        : hallProTips(request.crew_size, full?.servingsBase || 4),
    _recipe_source: (hydrated.recipe._recipe_source ?? full?.source) as RecipeSourceAttribution,
    hall_curated: true,
  };

  return {
    recipe: scaled,
    protein,
    originalTitle: hydrated.title,
    catalogId: hydrated.catalogId,
    recipeSource: (full?.source ?? hydrated.recipe._recipe_source) as RecipeSourceAttribution,
    slug,
  };
}

function defProtein(full: ReturnType<typeof getCuratedRecipeBySlug>, gr: GenerateResponse): string {
  return full?.protein || gr.chosen_protein || "chicken";
}

function pickFromSummaries(
  summaries: Array<{
    slug: string;
    protein: string;
    totalMinutes: number;
    scores: { quality: number };
    sourceKind: string;
    catalogBoost?: number;
  }>,
  request: GenerateRequest,
  options: {
    recentSignatures?: string[];
    recentSlugs?: string[];
    currentRecipeSignature?: string;
    varietySeed: string;
    excludeSlugs?: Set<string>;
    /** Allow score 0 when pool is very small (category-filtered picks). */
    minScore?: number;
  },
): LocalRecipePick | null {
  const selectedProtein = request.protein || "any";
  const strictProtein = selectedProtein !== "any";
  const ranked = summaries
    .filter((r) => !isExcludedFromDinnerFeeds(r))
    .filter((r) => !options.excludeSlugs?.has(r.slug))
    // If the user explicitly picked a protein, don't serve mismatched curated meals.
    .filter((r) => !strictProtein || proteinMatchesFilter(r.protein, selectedProtein))
    .filter((r) => !request.vegetarian_swap_needed || r.protein === "vegetarian")
    .map((row) => {
      let score = scoreCuratedRow(row, request);
      score -= recentSlugPenalty(row.slug, options.recentSlugs);
      if (typeof row.catalogBoost === "number") score += row.catalogBoost;
      return { row, score };
    })
    .filter((x) => x.score >= (options.minScore ?? 1))
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;

  const band = ranked.slice(0, 16);
  const weights = band.map((x) => Math.max(1, x.score));
  const startIdx = weightedPickIndex(weights, options.varietySeed);

  // Try to hydrate + pass variety constraints across the band.
  // Some curated rows may not have a generateResponse yet — skip those gracefully.
  const ordered = [...band.slice(startIdx), ...band.slice(0, startIdx)];
  for (const candidate of ordered) {
    const pick = hydratePick(candidate.row.slug, request);
    if (!pick) continue;
    const sig = computeSignature(pick.recipe);
    if (signatureBlocked(sig, options.recentSignatures, options.currentRecipeSignature)) continue;
    return pick;
  }

  // As a last resort, return any hydrated pick (even if it repeats) to avoid a blank state.
  for (const candidate of ordered) {
    const pick = hydratePick(candidate.row.slug, request);
    if (pick) return pick;
  }

  return null;
}

function pickForFirehallCategory(
  request: GenerateRequest,
  categoryId: FirehallCategoryId,
  options: {
    recentSignatures?: string[];
    recentSlugs?: string[];
    currentRecipeSignature?: string;
    varietySeed: string;
  },
): LocalRecipePick | null {
  const stages = buildFirehallPoolStages(categoryId);

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]!;
    const snapshot = loadFirehallCategoryPool(stage.categoryIds, {
      requireHero: stage.requireHero,
    });
    snapshot.stage = stage.stage;

    const pool: FirehallCategorySummaryRow[] = snapshot.rows;
    const pick = pickFromSummaries(pool, request, {
      ...options,
      varietySeed: `${options.varietySeed}:fh:${stage.stage}:${i}`,
      minScore: stage.minScore,
    });

    logFirehallPoolAttempt(request, snapshot, Boolean(pick));
    if (pick) {
      log(
        `[generate:local] firehall(${categoryId}/${stage.stage}) hit slug=${pick.slug} title="${pick.originalTitle.slice(0, 48)}"`,
        "generate",
      );
      return pick;
    }
  }

  log(
    `[generate:local] firehall(${categoryId}) exhausted all stages — no pick`,
    "generate",
  );
  return null;
}

/** Layer A — published editorial curated (publisher / hall classics, not Golden 100). */
export function pickEditorialCuratedForGenerate(
  request: GenerateRequest,
  options: {
    recentSignatures?: string[];
    recentSlugs?: string[];
    currentRecipeSignature?: string;
    varietySeed: string;
  },
): LocalRecipePick | null {
  const goldenSlugs = new Set(
    listCuratedSummariesByTag(GOLDEN_SET_TAG, 120).map((r) => r.slug),
  );

  const rows = listCuratedRecipeSummaries({
    status: "published",
    minQuality: 40,
    limit: 80,
    orderBy: "publisherFirst",
  }).filter((r) => !goldenSlugs.has(r.slug) && r.heroImage?.trim());

  const pick = pickFromSummaries(rows, request, {
    ...options,
    excludeSlugs: goldenSlugs,
  });

  if (pick) {
    log(
      `[generate:local] editorial hit slug=${pick.slug} title="${pick.originalTitle.slice(0, 48)}"`,
      "generate",
    );
  }
  return pick;
}

/** Hall catalog pick — Golden 100 + Performance 50 with request-aware ranking. */
export function pickGolden100ForGenerate(
  request: GenerateRequest,
  options: {
    recentSignatures?: string[];
    recentSlugs?: string[];
    currentRecipeSignature?: string;
    varietySeed: string;
  },
): LocalRecipePick | null {
  if (request.firehall_category) {
    const categoryPick = pickForFirehallCategory(request, request.firehall_category, options);
    if (categoryPick) return categoryPick;
  }

  const rankBias = resolveCatalogRankBias(request);

  const goldenTagged = listCuratedSummariesByTag(GOLDEN_SET_TAG, 120)
    .filter((r) => r.heroImage?.trim())
    .filter((r) => isGolden100Slug(r.slug));

  const performanceTagged = listCuratedSummariesByTag(PERFORMANCE_SET_TAG, 80)
    .filter((r) => r.heroImage?.trim())
    .filter((r) => isPerformance50Slug(r.slug));

  const goldenFallback = GOLDEN_100_RECIPES.map((r) => ({
    slug: r.slug,
    protein: r.protein,
    quality: 80,
    sourceKind: r.classicSlug ? "hall_classic" : "golden_100",
  }));

  const performanceFallback = PERFORMANCE_ADAPTED_RECIPES.map((r) => ({
    slug: r.manifest.slug,
    protein: r.manifest.protein,
    quality: 82,
    sourceKind: "performance_meals_50",
  }));

  const goldenRows = goldenTagged.length > 0 ? goldenTagged : goldenFallback;
  const performanceRows = performanceTagged.length > 0 ? performanceTagged : performanceFallback;

  const toSummary = (
    r: { slug: string; protein: string; quality?: number; sourceKind: string },
    collection: CatalogCollectionId,
  ) => ({
    slug: r.slug,
    protein: r.protein,
    totalMinutes: 0,
    scores: { quality: r.quality ?? 80 },
    sourceKind: r.sourceKind,
    catalogBoost: catalogCollectionScoreBoost(collection, rankBias),
  });

  const combined = [
    ...goldenRows.map((r) => toSummary(r, "golden_100")),
    ...performanceRows.map((r) => toSummary(r, "performance_50")),
  ];

  if (combined.length === 0) return null;

  const pick = pickFromSummaries(combined, request, options);
  if (pick) {
    const collection = resolveCatalogCollection(pick.slug) || "golden_100";
    log(
      `[generate:local] hall_catalog(${collection}) hit slug=${pick.slug} title="${pick.originalTitle.slice(0, 48)}" bias=${rankBias}`,
      "generate",
    );
  }
  return pick;
}
