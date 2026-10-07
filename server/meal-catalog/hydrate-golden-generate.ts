/**
 * Hydrate approved catalog slugs (Golden 100 + Performance 50 + Hall Expansion + BBQ)
 * for /api/generate. Every collection that is `isApprovedCatalogSlug`-eligible and
 * shown as a normal dinner meal in Explore must be hydratable here — this is what
 * makes a recipe actually generator-eligible, not just present in some candidate list.
 *
 * Content always comes from the canonical catalog page for the slug (the same record the
 * recipe detail page and Explore read). DB `curated_recipes` rows and legacy classic
 * packages are NOT content sources here — they drifted from the published pages.
 */

import type { GenerateResponse, RecipeTags } from "../../shared/schema.js";
import { getGoldenRecipeBySlug } from "../../shared/golden-100/manifest.js";
import { getPerformanceRecipeBySlug } from "../../shared/performance-meals/adapted/index.js";
import { getHallExpansionRecipeBySlug } from "../../shared/hall-expansion/adapted/index.js";
import { BBQ_CATALOG_RECIPES } from "../../shared/bbq-expansion/batch-25-bbq-recipes.js";
import { scaleGoldenIngredients } from "../../shared/golden-100/recipe-quality/crew-scale.js";
import { getRecipeBaseServings } from "../../shared/recipe/crew-scaling-config.js";
import {
  getCatalogTitle,
  isApprovedCatalogSlug,
  isBreakfastCatalogSlug,
  normalizeCatalogSlug,
  resolveCatalogHeroPath,
} from "../../shared/hall-catalog/gate.js";
import { getCuratedRecipeBySlug } from "../curated-recipe-store.js";
import { canonicalTonightProtein, loadCanonicalCatalogPage, type CanonicalCatalogPage } from "./canonical-page.js";

export interface CatalogGenerateHydration {
  recipe: GenerateResponse;
  /** Generator protein filter family (falls back to the manifest value when no single family applies). */
  protein: string;
  /** Customer-facing protein label — identical to Explore's. */
  proteinLabel: string;
  title: string;
  catalogId: string;
}

interface ManifestMeta {
  protein: string;
  mealFormat: string;
}

function manifestMeta(slug: string): ManifestMeta | null {
  const golden = getGoldenRecipeBySlug(slug);
  if (golden) return { protein: golden.protein, mealFormat: golden.mealFormat };
  const perf = getPerformanceRecipeBySlug(slug);
  if (perf) return { protein: perf.manifest.protein, mealFormat: perf.manifest.mealFormat };
  const expansion = getHallExpansionRecipeBySlug(slug);
  if (expansion) return { protein: expansion.protein, mealFormat: expansion.mealFormat };
  const bbq = BBQ_CATALOG_RECIPES.find((r) => r.manifest.slug === slug);
  if (bbq) return { protein: bbq.manifest.protein, mealFormat: bbq.manifest.mealFormat };
  return null;
}

function pageTags(page: CanonicalCatalogPage): RecipeTags {
  return {
    cuisine: page.cuisine,
    cooking_method: "",
    base_carb: "",
    key_ingredients: page.ingredients.slice(0, 5).map((i) => i.name),
    high_protein: Boolean(page.nutrition?.filterFlags?.highProtein),
    high_fiber: false,
    quick_cleanup: page.cleanupDifficulty === "easy",
  };
}

/** Build the generate payload for one slug straight from its canonical page record. */
export function generateResponseFromCanonicalPage(
  page: CanonicalCatalogPage,
  meta: ManifestMeta,
  crewSize: number,
): { recipe: GenerateResponse; protein: string; proteinLabel: string } {
  const { label, family } = canonicalTonightProtein(meta.protein, page.slug);
  const protein = family ?? meta.protein;
  const scaled = scaleGoldenIngredients(page.ingredients, getRecipeBaseServings(page), crewSize);
  const prep = page.prepTime ?? 0;

  return {
    protein,
    proteinLabel: label,
    recipe: {
      template_id: 0,
      chosen_protein: protein,
      primary_protein_source: protein,
      title: page.title,
      meal_style: meta.mealFormat,
      why_it_fits_tonight: page.shortDescription || page.subtitle,
      timing: { prep_minutes: prep, cook_minutes: page.cookTime, total_minutes: prep + page.cookTime },
      protein_safety: [],
      ingredients: scaled.map((ing) => ({
        item: ing.name,
        amount: `${ing.quantity ?? ""} ${ing.unit ?? ""}`.trim(),
        notes: ing.notes ?? "",
      })),
      steps: page.steps.map((s) => ({
        heading: s.title,
        body: s.instruction,
        estimated_time: s.minutes,
        cooking_method: s.heatLevel || undefined,
      })),
      cleanup_tip: "Wipe down surfaces and load the dishwasher before the next call.",
      macros_per_serving: {
        calories: page.calories,
        protein_g: page.protein,
        carbs_g: page.carbs,
        fat_g: page.fats,
      },
      pro_tips: page.proTips,
      tags: pageTags(page),
      _imported: true,
      _preserve_source_steps: true,
      hall_curated: true,
    },
  };
}

/** Customer-facing protein label for a catalog slug — identical to Explore's. */
export function catalogProteinLabel(slug: string): string | null {
  const normalized = normalizeCatalogSlug(slug);
  const meta = manifestMeta(normalized);
  return meta ? canonicalTonightProtein(meta.protein, normalized).label : null;
}

/**
 * Coarse "same kind of meal" key (protein family + meal format), e.g. `chicken|sheet pan`.
 * Used to avoid serving two near-identical meals back to back.
 */
export function catalogSimilarityKey(slug: string): string | null {
  const normalized = normalizeCatalogSlug(slug);
  const meta = manifestMeta(normalized);
  if (!meta) return null;
  const { family } = canonicalTonightProtein(meta.protein, normalized);
  const format = (meta.mealFormat || "").trim().toLowerCase();
  return `${family ?? meta.protein.toLowerCase()}|${format}`;
}

/** Resolve generate payload for an approved catalog slug. */
export function hydrateCatalogGenerateResponse(
  slug: string,
  crewSize: number,
): CatalogGenerateHydration | null {
  const normalized = normalizeCatalogSlug(slug);
  if (!isApprovedCatalogSlug(normalized) || isBreakfastCatalogSlug(normalized)) return null;
  const meta = manifestMeta(normalized);
  const page = loadCanonicalCatalogPage(normalized);
  if (!meta || !page || page.ingredients.length === 0 || page.steps.length === 0) return null;

  const built = generateResponseFromCanonicalPage(page, meta, crewSize);
  return {
    ...built,
    title: page.title,
    catalogId: getCuratedRecipeBySlug(normalized)?.recipeId || normalized,
  };
}

/** @deprecated Use hydrateCatalogGenerateResponse */
export function hydrateGoldenGenerateResponse(
  slug: string,
  crewSize: number,
): CatalogGenerateHydration | null {
  return hydrateCatalogGenerateResponse(slug, crewSize);
}

export function catalogHeroForSlug(slug: string): string {
  return resolveCatalogHeroPath(slug);
}

/** @deprecated Use catalogHeroForSlug */
export function goldenCatalogHeroForSlug(slug: string): string {
  return catalogHeroForSlug(slug);
}

export function lockCatalogTitle(slug: string, title?: string | null): string {
  return getCatalogTitle(slug) || title || "";
}
