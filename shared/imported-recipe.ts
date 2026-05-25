/**
 * Real imported recipe metadata — distinguishes sourced meals from invented fallbacks.
 */

import type { GenerateResponse } from "./schema.js";
import type { RecipeSourceAttribution, CatalogSourceKind } from "./canonical-recipe.js";

export const REAL_SOURCE_KINDS: CatalogSourceKind[] = ["publisher", "curated", "spoonacular"];

export interface ImportedRecipeMeta {
  imported: true;
  preserveSourceSteps: boolean;
  source: RecipeSourceAttribution;
}

export function isInventedMealSource(
  source?: RecipeSourceAttribution | null,
  recipe?: Pick<GenerateResponse, "_fallback" | "_imported">,
): boolean {
  if (recipe?._fallback) return true;
  if (!source) return !recipe?._imported;
  return source.kind === "template";
}

export function isRealSourcedMeal(
  source?: RecipeSourceAttribution | null,
  recipe?: Pick<GenerateResponse, "_imported" | "_fallback">,
): boolean {
  if (recipe?._fallback) return false;
  if (recipe?._imported) return true;
  if (!source) return false;
  return REAL_SOURCE_KINDS.includes(source.kind);
}

export function shouldPreserveSourceSteps(
  recipe: GenerateResponse,
  source?: RecipeSourceAttribution | null,
): boolean {
  if (recipe._preserve_source_steps === true) return true;
  if (recipe._fallback) return false;
  const kind = source?.kind;
  if (kind === "publisher" || kind === "curated") return true;
  if (kind === "spoonacular" && (recipe.steps?.length ?? 0) >= 3) return true;
  return false;
}

/** User-facing attribution line for recipe cards */
export function formatAdaptationLabel(source?: RecipeSourceAttribution | null): string | null {
  if (!source?.name?.trim()) return null;
  const name = source.name.trim();
  const kind = source.kind;

  if (kind === "publisher") {
    if (/pinterest/i.test(name) || /pinterest/i.test(source.url || "")) {
      return "Adapted from Pinterest";
    }
    return `Adapted from ${name}`;
  }
  if (kind === "curated") {
    return "Inspired by Firehall Favorite";
  }
  if (kind === "spoonacular") {
    if (name && name !== "Spoonacular") return `Adapted from ${name}`;
    return "Adapted from a verified recipe source";
  }
  return null;
}

export function attachImportedRecipeMeta(
  recipe: GenerateResponse,
  source: RecipeSourceAttribution,
  options: { preserveSteps?: boolean } = {},
): GenerateResponse {
  const preserve =
    options.preserveSteps ??
    (source.kind === "publisher" || source.kind === "curated");
  return {
    ...recipe,
    _imported: true,
    _preserve_source_steps: preserve,
    _recipe_source: source,
  };
}
