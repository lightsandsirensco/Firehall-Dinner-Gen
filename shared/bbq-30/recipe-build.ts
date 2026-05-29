/**
 * Helpers to assemble BBQ30 recipes with consistent structure.
 */

import type {
  GoldenRecipePageIngredient,
  GoldenRecipePageStep,
} from "../golden-100/recipe-page-schema.js";
import type { BbqManifestEntry, BbqRecipe } from "./types.js";

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
  difficulty?: BbqManifestEntry["difficulty"];
}): BbqManifestEntry {
  return {
    slug: input.slug,
    title: input.title,
    subtitle: input.subtitle,
    protein: input.protein,
    cuisine: input.cuisine,
    mealFormat: input.mealFormat,
    explorePools: input.pools ?? ["bbq", "trending"],
    hookLine: input.hook,
    prepMinutes: input.prep,
    cookMinutes: input.cook,
    difficulty: input.difficulty ?? "medium",
    crewSizeDefault: 10,
    featured: true,
  };
}

export function bbqRecipe(input: Omit<BbqRecipe, "ingredients" | "steps" | "searchTerms"> & {
  ingredients: IngLine[];
  stepLines: StepLine[];
  searchTerms?: string[];
}): BbqRecipe {
  const baseTerms = [
    input.manifest.title.toLowerCase(),
    input.manifest.slug.replace(/-/g, " "),
    input.manifest.protein,
    input.manifest.cuisine,
    input.manifest.mealFormat.replace(/_/g, " "),
    "bbq",
    "firehall",
  ];
  return {
    ...input,
    ingredients: ing(input.ingredients),
    steps: steps(input.stepLines),
    searchTerms: [...new Set([...baseTerms, ...(input.searchTerms ?? [])])].slice(0, 20),
  };
}

