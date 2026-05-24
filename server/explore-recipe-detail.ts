/**
 * Explore recipe detail — curated DB first, Spoonacular API fallback.
 */

import type { CuratedRecipe } from "../shared/curated-recipe/types.js";
import { isSyntheticExploreId } from "../shared/explore-curated-id.js";
import {
  getCuratedRecipeByExploreId,
  getCuratedRecipeById,
  getCuratedRecipeBySlug,
} from "./curated-recipe-store.js";
import { getRecipeById } from "./spoonacular.js";
import { log } from "./logger.js";
import { enhanceRecipeSteps, buildEnhanceContextFromTitle } from "./instruction-enhancer.js";
import type { RecipeStep } from "../shared/schema.js";

export interface ExploreDetailLookupHints {
  slug?: string;
  curatedRecipeId?: string;
}

function resolveCuratedForExplore(
  exploreId: number,
  hints: ExploreDetailLookupHints = {},
): CuratedRecipe | null {
  const tried: string[] = [];

  if (hints.curatedRecipeId?.trim()) {
    tried.push(`cid=${hints.curatedRecipeId}`);
    const byId = getCuratedRecipeById(hints.curatedRecipeId.trim());
    if (byId) return byId;
  }

  tried.push(`exploreId=${exploreId}`);
  const byExplore = getCuratedRecipeByExploreId(exploreId);
  if (byExplore) return byExplore;

  if (hints.slug?.trim()) {
    tried.push(`slug=${hints.slug}`);
    const bySlug = getCuratedRecipeBySlug(hints.slug.trim().toLowerCase());
    if (bySlug) return bySlug;
  }

  log(`[explore] curated lookup miss id=${exploreId} tried=[${tried.join(", ")}]`, "catalog");
  return null;
}

export interface ExploreRecipeDetailPayload {
  id: number;
  title: string;
  image: string;
  imageAlt: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
  cuisines: string[];
  diets: string[];
  dishTypes: string[];
  ingredients: { name: string; amount: number; unit: string; original: string }[];
  steps: { number: number; heading?: string; step: string }[];
  macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  _fromCurated?: boolean;
  _curatedRecipeId?: string;
  _publisherName?: string;
}

function rawStepsFromCurated(curated: CuratedRecipe): RecipeStep[] {
  const gr = curated.generateResponse;
  if (curated.instructions.length > 0) {
    return curated.instructions.map((s) => ({
      heading: s.heading || `Step ${s.stepNumber}`,
      body: s.body,
    }));
  }
  return (gr?.steps || []).map((s, i) => ({
    heading: s.heading || `Step ${i + 1}`,
    body: s.body || "",
  }));
}

function payloadStepsFromRecipeSteps(steps: RecipeStep[]): ExploreRecipeDetailPayload["steps"] {
  return steps.map((s, i) => ({
    number: i + 1,
    heading: s.heading,
    step: s.body,
  }));
}

async function detailFromCurated(
  curated: CuratedRecipe,
  spoonacularId: number,
): Promise<ExploreRecipeDetailPayload> {
  const gr = curated.generateResponse;
  const ingredientNames =
    curated.ingredients.length > 0
      ? curated.ingredients.map((i) => i.name)
      : (gr?.ingredients || []).map((i) => i.item || "");

  const ctx = buildEnhanceContextFromTitle(curated.title, {
    protein: curated.protein,
    totalMinutes: curated.totalMinutes,
    crewSize: curated.servingsBase,
    ingredients: ingredientNames,
    mealFormat: curated.mealFormat,
  });

  const enhanced = await enhanceRecipeSteps(rawStepsFromCurated(curated), ctx);
  const steps = payloadStepsFromRecipeSteps(enhanced);

  const ingredients =
    curated.ingredients.length > 0
      ? curated.ingredients.map((ing) => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          original: ing.originalText,
        }))
      : (gr?.ingredients || []).map((ing) => ({
          name: ing.item || "ingredient",
          amount: parseFloat(String(ing.amount).match(/[\d.]+/)?.[0] || "0") || 0,
          unit: "",
          original: [ing.amount, ing.item, ing.notes].filter(Boolean).join(" ").trim(),
        }));

  const macros = gr?.macros_per_serving;

  return {
    id: spoonacularId,
    title: curated.title,
    image: curated.heroImage,
    imageAlt: curated.title,
    readyInMinutes: curated.totalMinutes,
    servings: curated.servingsBase,
    sourceUrl: curated.source.url || "",
    summary: curated.summary || gr?.why_it_fits_tonight || "",
    cuisines: curated.cuisine ? [curated.cuisine] : [],
    diets: [],
    dishTypes: curated.tags || [],
    ingredients,
    steps,
    macros: {
      calories: Math.round(macros?.calories ?? 0),
      protein_g: Math.round(macros?.protein_g ?? 0),
      carbs_g: Math.round(macros?.carbs_g ?? 0),
      fat_g: Math.round(macros?.fat_g ?? 0),
    },
    _fromCurated: true,
    _curatedRecipeId: curated.recipeId,
    _publisherName: curated.source.name,
  };
}

export async function fetchExploreRecipeDetailPayload(
  exploreId: number,
  includeNutrition: boolean,
  hints: ExploreDetailLookupHints = {},
): Promise<ExploreRecipeDetailPayload> {
  const curated = resolveCuratedForExplore(exploreId, hints);
  if (curated) {
    log(
      `[explore] detail curated id=${exploreId} recipeId=${curated.recipeId} source=${curated.source.kind}/${curated.source.name} ings=${curated.ingredients.length} steps=${curated.instructions.length}`,
      "catalog",
    );
    return detailFromCurated(curated, exploreId);
  }

  if (isSyntheticExploreId(exploreId)) {
    throw new Error(
      "This curated recipe could not be loaded. Try another card or refresh Explore.",
    );
  }

  const detail = await getRecipeById(exploreId, includeNutrition);
  const nutrients = detail.nutrition?.nutrients || [];
  const findNutrient = (name: string) =>
    nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase())?.amount || 0;

  let steps = detail.analyzedInstructions?.[0]?.steps || [];
  if (steps.length === 0 && detail.instructions) {
    const plain = detail.instructions.replace(/<[^>]*>/g, "").trim();
    if (plain) {
      steps = plain
        .split(/\.\s+/)
        .filter(Boolean)
        .map((sentence, i) => ({ number: i + 1, step: sentence.trim() }));
    }
  }

  log(`[explore] detail spoonacular fallback id=${exploreId}`, "spoonacular");

  const ingredientNames = (detail.extendedIngredients || []).map((i) => i.name);
  const rawSteps: RecipeStep[] =
    steps.length > 0
      ? steps.map((s) => ({
          heading: `Step ${s.number}`,
          body: s.step,
        }))
      : [{ heading: "Cook", body: "Follow the recipe method, scaling for your crew size." }];

  const ctx = buildEnhanceContextFromTitle(detail.title, {
    totalMinutes: detail.readyInMinutes,
    crewSize: detail.servings,
    ingredients: ingredientNames,
  });
  const enhanced = await enhanceRecipeSteps(rawSteps, ctx);

  return {
    id: detail.id,
    title: detail.title,
    image: detail.image,
    imageAlt: detail.title,
    readyInMinutes: detail.readyInMinutes,
    servings: detail.servings,
    sourceUrl: detail.sourceUrl,
    summary: (detail.summary || "").replace(/<[^>]*>/g, ""),
    cuisines: detail.cuisines || [],
    diets: detail.diets || [],
    dishTypes: detail.dishTypes || [],
    ingredients: (detail.extendedIngredients || []).map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      original: ing.original || `${ing.amount} ${ing.unit} ${ing.name}`.trim(),
    })),
    steps: payloadStepsFromRecipeSteps(enhanced),
    macros: {
      calories: Math.round(findNutrient("Calories")),
      protein_g: Math.round(findNutrient("Protein")),
      carbs_g: Math.round(findNutrient("Carbohydrates")),
      fat_g: Math.round(findNutrient("Fat")),
    },
    _fromCurated: false,
  };
}
