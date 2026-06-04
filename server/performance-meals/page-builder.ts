/**
 * Build Performance Meals pages from adapted recipe packs (no Spoonacular).
 */

import type { GoldenRecipePage } from "../../shared/golden-100/recipe-page-schema.js";
import { GOLDEN_RECIPE_PAGE_CONTENT_VERSION } from "../../shared/golden-100/recipe-page-schema.js";
import { buildFirehallHeroImageAlt } from "../../shared/curated-image-governance/firehall-hero-alt.js";
import { PHASE5_REMOVED_SLUGS } from "../../shared/catalog-consolidation/phase5-redirects.js";
import { PERFORMANCE_ADAPTED_RECIPES } from "../../shared/performance-meals/adapted/index.js";
import { performancePageImageSet } from "../../shared/performance-meals/recipe-page-paths.js";
import { PERFORMANCE_PAGE_CATEGORY, PERFORMANCE_SET_TAG } from "../../shared/performance-meals/types.js";
import type { PerformanceAdaptedRecipe } from "../../shared/performance-meals/types.js";
import { CANONICAL_BASE_SERVINGS } from "../../shared/recipe/crew-scaling-config.js";
import { scaleGoldenIngredients } from "../../shared/golden-100/recipe-quality/crew-scale.js";

function buildSeoTitle(title: string): string {
  const t = `${title} | Firefighter Meal`;
  return t.length <= 80 ? t : `${title.slice(0, 58)}… | Firefighter Meal`;
}

function buildDescription(recipe: PerformanceAdaptedRecipe): string {
  return recipe.description;
}

function computeScores(recipe: PerformanceAdaptedRecipe): {
  realismScore: number;
  firefighterScore: number;
  popularityWeight: number;
} {
  const steps = recipe.steps;
  const ings = recipe.ingredients;
  let realism = 55 + Math.min(steps.length * 6, 30) + Math.min(ings.length * 2, 15);
  if (steps.every((s) => s.instruction.length >= 55)) realism += 8;
  const firefighter = Math.min(
    100,
    62 + recipe.stationWorkflow.length * 4 + recipe.proTips.length * 3,
  );
  return {
    realismScore: Math.min(100, realism),
    firefighterScore: firefighter,
    popularityWeight: 7.5,
  };
}

export function buildPerformanceRecipePage(
  recipe: PerformanceAdaptedRecipe,
  crewSize = recipe.manifest.crewSizeDefault,
): GoldenRecipePage {
  const { manifest } = recipe;
  const storedBase = crewSize;
  const ingredients =
    storedBase === CANONICAL_BASE_SERVINGS
      ? recipe.ingredients
      : scaleGoldenIngredients(recipe.ingredients, storedBase, CANONICAL_BASE_SERVINGS);
  const images = performancePageImageSet(manifest.slug);
  const scores = computeScores(recipe);
  const n = recipe.nutrition;
  const fiber = n.fiber ?? 0;

  const tags = [
    `protein:${manifest.protein}`,
    `format:${manifest.mealFormat}`,
    `category:${PERFORMANCE_PAGE_CATEGORY}`,
    ...manifest.explorePools.filter((p) => p !== "performance"),
    PERFORMANCE_SET_TAG,
    "hall_meal",
    "high_protein",
    "healthy",
  ];

  const relatedSlugs = PERFORMANCE_ADAPTED_RECIPES.filter(
    (r) =>
      r.manifest.slug !== manifest.slug &&
      (r.manifest.mealFormat === manifest.mealFormat ||
        r.manifest.protein === manifest.protein),
  )
    .slice(0, 6)
    .map((r) => r.manifest.slug);

  return {
    slug: manifest.slug,
    title: manifest.title,
    displayTitle: manifest.title,
    seoTitle: buildSeoTitle(manifest.title),
    shortDescription: manifest.subtitle,
    subtitle: manifest.subtitle,
    category: PERFORMANCE_PAGE_CATEGORY,
    cuisine: manifest.cuisine,
    description: buildDescription(recipe),
    crewSize: CANONICAL_BASE_SERVINGS,
    baseServings: CANONICAL_BASE_SERVINGS,
    prepTime: manifest.prepMinutes,
    cookTime: manifest.cookMinutes,
    difficulty: manifest.difficulty,
    calories: n.calories,
    protein: n.protein,
    carbs: n.carbs,
    fats: n.fats,
    tags,
    equipment: recipe.equipment,
    ingredients,
    steps: recipe.steps,
    proTips: recipe.proTips.slice(0, 8),
    tonightSpread: recipe.tonightSpread,
    leftovers: recipe.leftovers,
    whyCrewsLikeIt: recipe.whyCrewsLikeIt,
    mealPrepNotes: [recipe.mealPrepNotes, ...recipe.stationWorkflow.map((w, i) => `Station: ${w}`)].join(
      " ",
    ),
    substitutions: recipe.substitutions,
    spiceLevel: recipe.spiceLevel,
    cleanupDifficulty: recipe.cleanupDifficulty,
    nutrition: {
      calories: n.calories,
      protein: n.protein,
      carbs: n.carbs,
      fats: n.fats,
      label: n.label ?? `~${n.calories} cal/serving · ${n.protein}g protein · ${fiber}g fiber (est.)`,
    },
    heroImage: images.heroImage,
    heroImageAlt: buildFirehallHeroImageAlt(manifest.title, recipe.tonightSpread),
    mobileImage: images.mobileImage,
    thumbImage: images.thumbImage,
    railImage: images.railImage,
    realismScore: scores.realismScore,
    firefighterScore: scores.firefighterScore,
    popularityWeight: scores.popularityWeight,
    searchTerms: recipe.searchTerms,
    relatedSlugs,
    generatedAt: new Date().toISOString(),
    contentVersion: GOLDEN_RECIPE_PAGE_CONTENT_VERSION,
  };
}

export function buildAllPerformancePages(): GoldenRecipePage[] {
  return PERFORMANCE_ADAPTED_RECIPES.filter((r) => !PHASE5_REMOVED_SLUGS.has(r.manifest.slug)).map((r) =>
    buildPerformanceRecipePage(r),
  );
}
