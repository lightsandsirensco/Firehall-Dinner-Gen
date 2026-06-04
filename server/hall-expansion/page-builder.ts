/**
 * Build Hall Expansion static pages from adapted recipe packs.
 */

import type { GoldenRecipePage } from "../../shared/golden-100/recipe-page-schema.js";
import { GOLDEN_RECIPE_PAGE_CONTENT_VERSION } from "../../shared/golden-100/recipe-page-schema.js";
import { PHASE5_REMOVED_SLUGS } from "../../shared/catalog-consolidation/phase5-redirects.js";
import { HALL_EXPANSION_ADAPTED_RECIPES } from "../../shared/hall-expansion/adapted/index.js";
import { hallExpansionPageImageSet } from "../../shared/hall-expansion/recipe-page-paths.js";
import {
  HALL_EXPANSION_PAGE_CATEGORY,
  HALL_EXPANSION_SET_TAG,
  type ExpansionRecipeDef,
} from "../../shared/hall-expansion/types.js";
import { CANONICAL_BASE_SERVINGS } from "../../shared/recipe/crew-scaling-config.js";
import { scaleGoldenIngredients } from "../../shared/golden-100/recipe-quality/crew-scale.js";

function buildSeoTitle(title: string): string {
  const t = `${title} | Firefighter Meal`;
  return t.length <= 80 ? t : `${title.slice(0, 58)}… | Firefighter Meal`;
}

function computeScores(recipe: ExpansionRecipeDef): {
  realismScore: number;
  firefighterScore: number;
  popularityWeight: number;
} {
  const realism =
    58 +
    Math.min(recipe.steps.length * 5, 28) +
    Math.min(recipe.ingredients.length * 2, 14);
  const firefighter = Math.min(100, 65 + recipe.stationWorkflow.length * 4 + recipe.proTips.length * 3);
  return {
    realismScore: Math.min(100, realism),
    firefighterScore: firefighter,
    popularityWeight: 7.8,
  };
}

export function buildHallExpansionRecipePage(
  recipe: ExpansionRecipeDef,
  crewSize = recipe.crewSizeDefault,
): GoldenRecipePage {
  const storedBase = crewSize;
  const ingredients =
    storedBase === CANONICAL_BASE_SERVINGS
      ? recipe.ingredients
      : scaleGoldenIngredients(recipe.ingredients, storedBase, CANONICAL_BASE_SERVINGS);
  const images = hallExpansionPageImageSet(recipe.slug);
  const scores = computeScores(recipe);
  const n = recipe.nutrition;
  const fiber = n.fiber ?? 0;

  const tags = [
    `protein:${recipe.protein}`,
    `format:${recipe.mealFormat}`,
    `category:${recipe.category}`,
    ...recipe.explorePools,
    HALL_EXPANSION_SET_TAG,
    "hall_meal",
    "firefighter_meal",
  ];

  const relatedSlugs = HALL_EXPANSION_ADAPTED_RECIPES.filter(
    (r) => r.slug !== recipe.slug && r.category === recipe.category,
  )
    .slice(0, 4)
    .map((r) => r.slug);

  return {
    slug: recipe.slug,
    title: recipe.title,
    displayTitle: recipe.title,
    seoTitle: buildSeoTitle(recipe.title),
    shortDescription: recipe.subtitle,
    subtitle: recipe.subtitle,
    category: HALL_EXPANSION_PAGE_CATEGORY,
    cuisine: recipe.cuisine,
    description: recipe.description,
    crewSize: CANONICAL_BASE_SERVINGS,
    baseServings: CANONICAL_BASE_SERVINGS,
    prepTime: recipe.prepMinutes,
    cookTime: recipe.cookMinutes,
    difficulty: recipe.difficulty,
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
    mealPrepNotes: recipe.mealPrepNotes.slice(0, 500),
    spiceLevel: recipe.spiceLevel,
    cleanupDifficulty: recipe.cleanupDifficulty,
    nutrition: {
      calories: n.calories,
      protein: n.protein,
      carbs: n.carbs,
      fats: n.fats,
      label: `~${n.calories} cal/serving · ${n.protein}g protein · ${fiber}g fiber (est.)`,
    },
    heroImage: images.heroImage,
    heroImageAlt: `${recipe.title} — crew-sized firehall meal`,
    mobileImage: images.mobileImage,
    thumbImage: images.thumbImage,
    railImage: images.railImage,
    realismScore: scores.realismScore,
    firefighterScore: scores.firefighterScore,
    popularityWeight: scores.popularityWeight,
    searchTerms: recipe.searchTerms ?? [recipe.title.toLowerCase(), recipe.category.replace(/_/g, " ")],
    relatedSlugs,
    generatedAt: new Date().toISOString(),
    contentVersion: GOLDEN_RECIPE_PAGE_CONTENT_VERSION,
    sourceUrl: recipe.sourceUrl ?? "",
  };
}

export function buildAllHallExpansionPages(): GoldenRecipePage[] {
  return HALL_EXPANSION_ADAPTED_RECIPES.filter((r) => !PHASE5_REMOVED_SLUGS.has(r.slug)).map((r) =>
    buildHallExpansionRecipePage(r),
  );
}
