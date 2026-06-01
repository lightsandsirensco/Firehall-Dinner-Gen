/**
 * Explore recipe detail — Golden 100 catalog only (no Spoonacular fallback).
 */

import type { CuratedRecipe } from "../shared/curated-recipe/types.js";
import { isSyntheticExploreId } from "../shared/explore-curated-id.js";
import { isApprovedCatalogSlug } from "../shared/hall-catalog/gate.js";
import {
  getCuratedRecipeByExploreId,
  getCuratedRecipeById,
  getCuratedRecipeBySlug,
} from "./curated-recipe-store.js";
import { log } from "./logger.js";
import { enhanceRecipeSteps, buildEnhanceContextFromTitle } from "./instruction-enhancer.js";
import { preserveSourceStepsLight } from "./meal-instructions.js";
import { isRealSourcedMeal } from "../shared/imported-recipe.js";
import { isShallowInstructionSet } from "../shared/instruction-enhancement.js";
import type { RecipeStep } from "../shared/schema.js";
import {
  buildExploreDetailFromHallPackage,
  resolveHallPackageSlug,
} from "./hall-package-explore-detail.js";
import type {
  ExploreDetailLookupHints,
  ExploreRecipeDetailPayload,
} from "./explore-detail-types.js";
import { isFirehallOwnedHeroUrl, normalizeOwnedMediaPath } from "../shared/food-imagery/paths.js";
import { applyImageryGovernanceToCard } from "../shared/explore-imagery-status.js";
import { resolveFoodImageryHero } from "./food-imagery/hero-resolver.js";

export type { ExploreDetailLookupHints, ExploreRecipeDetailPayload } from "./explore-detail-types.js";

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
  const imageApproved = curated.editorialImage?.imageApproved;
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

  const rawSteps = rawStepsFromCurated(curated);
  const src = curated.source;
  const catalogKind =
    src.kind === "publisher"
      ? "publisher"
      : src.kind === "spoonacular"
        ? "spoonacular"
        : "curated";
  const usePreserved =
    isRealSourcedMeal(
      {
        kind: catalogKind,
        name: src.name,
        url: src.url,
        license: src.license,
      },
      curated.generateResponse,
    ) && rawSteps.length >= 3;

  const finalSteps = usePreserved
    ? preserveSourceStepsLight(rawSteps)
    : await enhanceRecipeSteps(rawSteps, ctx);
  const steps = payloadStepsFromRecipeSteps(finalSteps);

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

  const hero = await resolveFoodImageryHero(curated.slug, curated.heroImage, {
    title: curated.title,
    protein: curated.protein,
    cuisine: curated.cuisine,
    mealFormat: curated.mealFormat,
  });
  const hasApprovedHero = Boolean(
    hero.url &&
      (hero.source === "generated" || hero.source === "pinned") &&
      isFirehallOwnedHeroUrl(hero.url) &&
      imageApproved !== false,
  );
  const heroUrl =
    hasApprovedHero && hero.url ? normalizeOwnedMediaPath(hero.url) : curated.heroImage;

  const baseCard = applyImageryGovernanceToCard(
    {
      id: spoonacularId,
      title: curated.title,
      image: heroUrl,
      imageAlt: curated.title,
      readyInMinutes: curated.totalMinutes,
      servings: curated.servingsBase,
      summary: curated.summary || gr?.why_it_fits_tonight || "",
      sourceUrl: curated.source.url || "",
      cuisines: curated.cuisine ? [curated.cuisine] : [],
      diets: [],
      _curatedSlug: curated.slug,
      fromCuratedDb: true,
      curatedRecipeId: curated.recipeId,
    },
    {
      status: curated.status,
      imageApproved,
      hasApprovedHero,
      slug: curated.slug,
    },
  );

  return {
    id: spoonacularId,
    title: curated.title,
    image: baseCard.image,
    imageAlt: curated.title,
    imageryStatus: baseCard.imageryStatus,
    heldImageryLabel: baseCard.heldImageryLabel,
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
    _catalogSlug: isApprovedCatalogSlug(curated.slug) ? curated.slug : undefined,
  };
}

export async function fetchExploreRecipeDetailPayload(
  exploreId: number,
  includeNutrition: boolean,
  hints: ExploreDetailLookupHints = {},
): Promise<ExploreRecipeDetailPayload> {
  const hallSlug = resolveHallPackageSlug(exploreId, hints);
  if (hallSlug) {
    const hallDetail = buildExploreDetailFromHallPackage(hallSlug, exploreId);
    if (hallDetail) {
      log(`[explore] detail hall package slug=${hallSlug} id=${exploreId}`, "catalog");
      return hallDetail;
    }
  }

  const curated = resolveCuratedForExplore(exploreId, hints);
  if (curated) {
    if (!isApprovedCatalogSlug(curated.slug)) {
      log(`[explore] detail blocked non-catalog slug=${curated.slug} id=${exploreId}`, "catalog");
      throw new Error("This recipe is not in the Firehall Meals catalog.");
    }
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

  log(`[explore] detail blocked spoonacular fallback id=${exploreId}`, "catalog");
  throw new Error("This recipe is not available in the Firehall Meals catalog.");
}
