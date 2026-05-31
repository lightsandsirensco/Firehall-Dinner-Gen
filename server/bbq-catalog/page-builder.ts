/**
 * Build Golden-format static pages from BBQ catalog recipes.
 */

import {
  GOLDEN_RECIPE_PAGE_CONTENT_VERSION,
  goldenRecipePageSchema,
  type GoldenCatalogIndexEntry,
  type GoldenRecipePage,
} from "../../shared/golden-100/recipe-page-schema.js";
import type { BbqRecipe } from "../../shared/bbq-30/types.js";
import { BBQ_30_PAGE_CATEGORY } from "../../shared/bbq-30/types.js";
import { bbqCatalogHeroPath, bbqCatalogThumbPath } from "../../shared/bbq-catalog/slug-registry.js";
import { calculateNutritionFromIngredients } from "../../shared/nutrition/calculate.js";

function capStepMinutes(minutes: number | undefined): number | undefined {
  if (minutes == null || minutes <= 0) return undefined;
  return Math.min(480, minutes);
}

function inferHeatFromStep(step: BbqRecipe["steps"][number]): GoldenRecipePage["steps"][number]["heatLevel"] {
  const blob = `${step.title} ${step.instruction} ${step.heatLevel ?? ""}`.toLowerCase();
  if (/\b450|high heat|ripping hot|sear\b/.test(blob)) return "high";
  if (/\b275|250|low and slow|smoke steady\b/.test(blob)) return "low";
  if (/\bmedium-high\b/.test(blob)) return "medium-high";
  if (/\bmedium-low\b/.test(blob)) return "medium-low";
  if (/\bmedium\b/.test(blob)) return "medium";
  return step.heatLevel as GoldenRecipePage["steps"][number]["heatLevel"] ?? "";
}

export function buildBbqCatalogRecipePage(
  recipe: BbqRecipe,
  allSlugs: string[],
): GoldenRecipePage {
  const slug = recipe.manifest.slug;
  const hero = bbqCatalogHeroPath(slug);
  const thumb = bbqCatalogThumbPath(slug);
  const mobile = `/images/mobile/smoker-catalog/${slug}.jpg`;
  const rail = `/images/rails/smoker-catalog/${slug}.jpg`;
  const crewSize = recipe.manifest.crewSizeDefault;
  const cookTime = recipe.manifest.cookMinutes;
  const prepTime = recipe.manifest.prepMinutes;

  const nutrition = calculateNutritionFromIngredients(recipe.ingredients, {
    servings: crewSize,
    mealType: "dinner",
    mealPrepFriendly: true,
  });

  const relatedSlugs = (
    recipe.relatedSlugs?.filter((s) => s !== slug && allSlugs.includes(s)).slice(0, 6) ??
    allSlugs.filter((s) => s !== slug).slice(0, 4)
  );

  const page: GoldenRecipePage = {
    slug,
    title: recipe.manifest.title,
    displayTitle: recipe.manifest.title.slice(0, 72),
    seoTitle: `${recipe.manifest.title} | Firehall BBQ`,
    shortDescription: recipe.manifest.hookLine,
    subtitle: recipe.manifest.subtitle,
    category: BBQ_30_PAGE_CATEGORY,
    cuisine: recipe.manifest.cuisine.toLowerCase(),
    description: recipe.description,
    crewSize,
    baseServings: crewSize,
    cookTime,
    prepTime,
    difficulty: recipe.manifest.difficulty,
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fats: nutrition.fat,
    tags: [
      `protein:${recipe.manifest.protein}`,
      `format:${recipe.manifest.mealFormat}`,
      `category:${BBQ_30_PAGE_CATEGORY}`,
      "bbq",
      "smoker",
      "grill",
      "firehall_bbq_25",
      ...recipe.manifest.explorePools,
    ],
    equipment: recipe.equipment,
    ingredients: recipe.ingredients,
    steps: recipe.steps.map((s) => ({
      stepNumber: s.stepNumber,
      title: s.title,
      instruction: s.instruction,
      minutes: capStepMinutes(s.minutes),
      heatLevel: inferHeatFromStep(s),
    })),
    proTips: recipe.proTips,
    tonightSpread: recipe.tonightSpread,
    leftovers: recipe.leftovers,
    whyCrewsLikeIt: recipe.whyCrewsLikeIt,
    mealPrepNotes: recipe.stationTimingNotes,
    substitutions: recipe.substitutions,
    spiceLevel: recipe.spiceLevel,
    cleanupDifficulty: recipe.cleanupDifficulty,
    nutrition: {
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fats: nutrition.fat,
      label: "per serving (hall portion)",
      source: "estimated",
    },
    heroImage: hero,
    heroImageAlt: `${recipe.manifest.title} — crew-sized BBQ spread with visible smoke and bark`,
    mobileImage: mobile,
    thumbImage: thumb,
    railImage: rail,
    realismScore: 88,
    firefighterScore: 90,
    popularityWeight: 7.5,
    searchTerms: recipe.searchTerms,
    relatedSlugs,
    sourceName: "Firehall Meals BBQ Collection",
    generatedAt: new Date().toISOString(),
    contentVersion: GOLDEN_RECIPE_PAGE_CONTENT_VERSION,
  };

  return goldenRecipePageSchema.parse(page);
}

export function bbqRecipeToIndexEntry(page: GoldenRecipePage, def: BbqRecipe): GoldenCatalogIndexEntry {
  return {
    slug: page.slug,
    title: page.title,
    subtitle: page.subtitle,
    category: page.category,
    cuisine: page.cuisine,
    protein: def.manifest.protein,
    mealFormat: def.manifest.mealFormat,
    cookTime: page.cookTime,
    difficulty: page.difficulty,
    heroImage: page.heroImage,
    thumbImage: page.thumbImage,
    tags: page.tags,
    firefighterScore: page.firefighterScore,
    popularityWeight: page.popularityWeight,
    searchTerms: page.searchTerms,
  };
}
