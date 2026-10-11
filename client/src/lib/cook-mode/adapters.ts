import type { GoldenRecipePage } from "@shared/golden-100/recipe-page-schema";
import type { ClientRecipeResponse } from "@shared/schema";
import type { MeasurementSystem } from "@shared/measurements";
import {
  formatClientIngredientQty,
  formatIngredientAmount,
  formatRecipeIngredientName,
  formatTemperaturesInText,
} from "@shared/measurements";
import type { ExploreRecipeDetail } from "@/lib/explore-api";
import { resolveEditorialFallbackHero } from "@shared/meal-hero-fallback";
import { buildHoldingPanelNotes } from "./holding-notes";
import type { CookModeRecipe } from "./types";

/** Generator / saved-meal results → cook mode (existing steps only). */
export function clientRecipeToCookMode(
  recipe: ClientRecipeResponse,
  measurementSystem: MeasurementSystem,
  crewSize: number,
): CookModeRecipe {
  const steps = (recipe.steps ?? []).map((s) => ({
    stepNumber: s.n,
    title: s.title?.trim() || `Step ${s.n}`,
    instruction: formatTemperaturesInText(s.instructions, measurementSystem),
    minutes: s.minutes || undefined,
    heatLevel: s.heat || undefined,
  }));

  const proTips = (recipe.pro_tips ?? []).map((t) =>
    formatTemperaturesInText(t, measurementSystem),
  );

  const imageUrl =
    recipe.hero_image && recipe.hero_image_status === "ready"
      ? recipe.hero_image
      : resolveEditorialFallbackHero(recipe.title, {
          mealFormat: recipe.meal_style,
          protein: recipe.chosen_protein,
        }) ?? undefined;

  return {
    title: recipe.title,
    crewSize,
    imageUrl,
    imageAlt: recipe.hero_image_alt || recipe.title,
    ingredients: (recipe.ingredients ?? []).map((ing) => ({
      name: formatRecipeIngredientName(ing.name),
      amount: formatClientIngredientQty(ing.qty, ing.unit, measurementSystem) || undefined,
      group: ing.category || undefined,
    })),
    steps,
    proTips,
    holdingGuidance: buildHoldingPanelNotes(steps, proTips),
  };
}

type ScaledCatalogIngredient = {
  name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
  group?: string;
};

export function goldenPageToCookMode(
  page: GoldenRecipePage,
  scaledIngredients: ScaledCatalogIngredient[],
  measurementSystem: MeasurementSystem,
  crewSize: number,
): CookModeRecipe {
  const steps = page.steps.map((s) => ({
    stepNumber: s.stepNumber,
    title: s.title,
    instruction: formatTemperaturesInText(s.instruction, measurementSystem),
    minutes: s.minutes,
    heatLevel: s.heatLevel || undefined,
  }));

  const proTips = page.proTips.map((t) => formatTemperaturesInText(t, measurementSystem));

  return {
    title: page.title,
    crewSize,
    imageUrl: page.heroImage || undefined,
    imageAlt: page.heroImageAlt || page.title,
    ingredients: scaledIngredients.map((ing) => ({
      name: formatRecipeIngredientName(ing.name),
      amount: formatIngredientAmount(ing.quantity, ing.unit, measurementSystem) || undefined,
      notes: ing.notes,
      group: ing.group,
    })),
    steps,
    proTips,
    holdingGuidance: buildHoldingPanelNotes(steps, proTips),
  };
}

type BreakfastPageLike = {
  title: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    instruction: string;
    minutes?: number;
    tempF?: number;
  }>;
  proTips?: string[];
  stationWorkflow?: string[];
};

export function breakfastPageToCookMode(
  page: BreakfastPageLike,
  scaledIngredients: ScaledCatalogIngredient[],
  measurementSystem: MeasurementSystem,
  crewSize: number,
): CookModeRecipe {
  const steps = page.steps.map((s) => ({
    stepNumber: s.stepNumber,
    title: s.title,
    instruction: formatTemperaturesInText(s.instruction, measurementSystem),
    minutes: s.minutes,
  }));

  const proTips = (page.proTips ?? []).map((t) => formatTemperaturesInText(t, measurementSystem));

  return {
    title: page.title,
    crewSize,
    ingredients: scaledIngredients.map((ing) => ({
      name: formatRecipeIngredientName(ing.name),
      amount: formatIngredientAmount(ing.quantity, ing.unit, measurementSystem) || undefined,
      notes: ing.notes,
      group: ing.group,
    })),
    steps,
    proTips,
    holdingGuidance: buildHoldingPanelNotes(steps, proTips, page.stationWorkflow ?? []),
  };
}

export function exploreDetailToCookMode(
  detail: ExploreRecipeDetail,
  measurementSystem: MeasurementSystem,
  crewSize: number,
): CookModeRecipe {
  const steps = detail.steps.map((s) => ({
    stepNumber: s.number,
    title: s.heading?.trim() || `Step ${s.number}`,
    instruction: formatTemperaturesInText(s.step, measurementSystem),
  }));

  const ingredients = detail.ingredients.map((ing) => ({
    name: formatRecipeIngredientName(ing.name),
    amount: `${ing.amount} ${ing.unit}`.trim() || undefined,
  }));

  const showImage = detail.image && (detail.imageryStatus ?? "approved") === "approved";

  return {
    title: detail.title,
    crewSize,
    imageUrl: showImage ? detail.image : undefined,
    imageAlt: detail.imageAlt || detail.title,
    ingredients,
    steps,
    holdingGuidance: buildHoldingPanelNotes(steps),
  };
}
