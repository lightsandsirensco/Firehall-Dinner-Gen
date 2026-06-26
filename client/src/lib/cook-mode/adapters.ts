import type { GoldenRecipePage } from "@shared/golden-100/recipe-page-schema";
import type { MeasurementSystem } from "@shared/measurements";
import {
  formatIngredientAmount,
  formatRecipeIngredientName,
  formatTemperaturesInText,
} from "@shared/measurements";
import type { ExploreRecipeDetail } from "@/lib/explore-api";
import { buildHoldingPanelNotes } from "./holding-notes";
import type { CookModeRecipe } from "./types";

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

  return {
    title: detail.title,
    crewSize,
    ingredients,
    steps,
    holdingGuidance: buildHoldingPanelNotes(steps),
  };
}
