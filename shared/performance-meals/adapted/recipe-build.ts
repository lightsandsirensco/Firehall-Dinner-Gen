/**
 * Helpers to assemble adapted performance recipes with consistent structure.
 */

import type {
  GoldenRecipePageIngredient,
  GoldenRecipePageStep,
} from "../../golden-100/recipe-page-schema.js";
import type {
  PerformanceAdaptedRecipe,
  PerformanceManifestEntry,
  PerformanceNutritionEstimate,
} from "../types.js";

export type IngLine = {
  name: string;
  quantity: number;
  unit: string;
  group?: string;
  notes?: string;
};

export type StepLine = {
  title: string;
  instruction: string;
  minutes?: number;
  heatLevel?: GoldenRecipePageStep["heatLevel"];
};

export function ing(lines: IngLine[]): GoldenRecipePageIngredient[] {
  return lines.map((l) => ({
    name: l.name,
    quantity: String(l.quantity),
    unit: l.unit,
    group: l.group,
    notes: l.notes,
  }));
}

export function steps(lines: StepLine[]): GoldenRecipePageStep[] {
  return lines.map((l, i) => ({
    stepNumber: i + 1,
    title: l.title,
    instruction: l.instruction,
    minutes: l.minutes,
    heatLevel: l.heatLevel ?? "",
  }));
}

export function perfRecipe(input: {
  manifest: PerformanceManifestEntry;
  description: string;
  whyCrewsLikeIt: string;
  mealPrepNotes: string;
  stationWorkflow: string[];
  ingredients: IngLine[];
  stepLines: StepLine[];
  nutrition: PerformanceNutritionEstimate;
  proTips: string[];
  tonightSpread: string[];
  leftovers: string[];
  substitutions?: string[];
  equipment: string[];
  spiceLevel?: PerformanceAdaptedRecipe["spiceLevel"];
  cleanupDifficulty?: PerformanceAdaptedRecipe["cleanupDifficulty"];
  searchTerms?: string[];
}): PerformanceAdaptedRecipe {
  const baseTerms = [
    input.manifest.title.toLowerCase(),
    input.manifest.slug.replace(/-/g, " "),
    input.manifest.protein,
    input.manifest.cuisine,
    input.manifest.mealFormat.replace(/_/g, " "),
    "performance meal",
    "firefighter healthy",
  ];
  return {
    manifest: input.manifest,
    description: input.description,
    whyCrewsLikeIt: input.whyCrewsLikeIt,
    mealPrepNotes: input.mealPrepNotes,
    stationWorkflow: input.stationWorkflow,
    ingredients: ing(input.ingredients),
    steps: steps(input.stepLines),
    nutrition: input.nutrition,
    proTips: input.proTips,
    tonightSpread: input.tonightSpread,
    leftovers: input.leftovers,
    substitutions: input.substitutions,
    equipment: input.equipment,
    spiceLevel: input.spiceLevel,
    cleanupDifficulty: input.cleanupDifficulty,
    searchTerms: [...new Set([...baseTerms, ...(input.searchTerms ?? [])])].slice(0, 20),
  };
}

export function manifestEntry(input: {
  slug: string;
  title: string;
  subtitle: string;
  protein: string;
  cuisine: string;
  mealFormat: string;
  pools?: string[];
  hook: string;
  prep: number;
  cook: number;
  difficulty?: PerformanceManifestEntry["difficulty"];
  sourceId: string;
}): PerformanceManifestEntry {
  return {
    slug: input.slug,
    title: input.title,
    subtitle: input.subtitle,
    protein: input.protein,
    cuisine: input.cuisine,
    mealFormat: input.mealFormat,
    explorePools: input.pools ?? ["healthy", "performance"],
    hookLine: input.hook,
    prepMinutes: input.prep,
    cookMinutes: input.cook,
    difficulty: input.difficulty ?? "medium",
    crewSizeDefault: 8,
    sourceId: input.sourceId,
    featured: true,
  };
}
