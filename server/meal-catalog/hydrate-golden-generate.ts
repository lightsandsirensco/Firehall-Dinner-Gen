/**
 * Hydrate approved catalog slugs (Golden 100 + Performance 50 + Hall Expansion + BBQ)
 * for /api/generate. Every collection that is `isApprovedCatalogSlug`-eligible and
 * shown as a normal dinner meal in Explore must be hydratable here — this is what
 * makes a recipe actually generator-eligible, not just present in some candidate list.
 */

import type { GenerateResponse } from "../../shared/schema.js";
import type { CuratedRecipe } from "../../shared/curated-recipe/types.js";
import type { PerformanceAdaptedRecipe } from "../../shared/performance-meals/types.js";
import type { ExpansionRecipeDef } from "../../shared/hall-expansion/types.js";
import type { BbqRecipe } from "../../shared/bbq-30/types.js";
import { getGoldenRecipeBySlug } from "../../shared/golden-100/manifest.js";
import { getPerformanceRecipeBySlug } from "../../shared/performance-meals/adapted/index.js";
import { getHallExpansionRecipeBySlug } from "../../shared/hall-expansion/adapted/index.js";
import { BBQ_CATALOG_RECIPES } from "../../shared/bbq-expansion/batch-25-bbq-recipes.js";
import { getCuratedPackageDef, buildCuratedClientRecipe } from "../../shared/curated-hall-packages.js";
import {
  getCatalogTitle,
  isApprovedCatalogSlug,
  isGolden100Slug,
  isPerformance50Slug,
  isHallExpansionSlug,
  isBbqCatalogSlug,
  resolveCatalogHeroPath,
} from "../../shared/hall-catalog/gate.js";
import { getCuratedRecipeBySlug } from "../curated-recipe-store.js";

function getBbqCatalogRecipeBySlug(slug: string): BbqRecipe | undefined {
  return BBQ_CATALOG_RECIPES.find((r) => r.manifest.slug === slug);
}

function clientRecipeToGenerate(
  client: ReturnType<typeof buildCuratedClientRecipe>,
  protein: string,
  title: string,
  why: string,
): GenerateResponse {
  return {
    template_id: 0,
    chosen_protein: protein,
    primary_protein_source: protein,
    title,
    meal_style: client.meal_format,
    why_it_fits_tonight: why,
    timing: {
      prep_minutes: client.timing.prep_min,
      cook_minutes: client.timing.cook_min,
      total_minutes: client.timing.total_min,
    },
    protein_safety: client.protein_safety.internal_temp_f
      ? [
          {
            protein: client.protein_safety.protein || protein,
            target_temp_f: client.protein_safety.internal_temp_f,
            target_temp_c: 0,
            rest_minutes: client.protein_safety.rest_min,
            probe_where: client.protein_safety.notes,
            notes: client.protein_safety.notes,
          },
        ]
      : [],
    ingredients: client.ingredients.map((ing) => ({
      item: ing.name,
      amount: `${ing.qty} ${ing.unit}`.trim(),
      notes: "",
    })),
    steps: client.steps.map((s) => ({
      heading: s.title,
      body: s.instructions,
    })),
    cleanup_tip: client.cleanup_tip,
    macros_per_serving: client.macros_per_serving,
    pro_tips: client.pro_tips,
    tags: client.recipe_tags,
    _imported: true,
    hall_curated: true,
  };
}

function fromCuratedRow(full: CuratedRecipe, title: string, why: string): GenerateResponse {
  const protein = full.protein || "chicken";
  return {
    template_id: 0,
    chosen_protein: protein,
    primary_protein_source: protein,
    title,
    meal_style: full.mealFormat,
    why_it_fits_tonight: why,
    timing: {
      prep_minutes: full.prepMinutes,
      cook_minutes: full.cookMinutes,
      total_minutes: full.totalMinutes,
    },
    protein_safety: [],
    ingredients: full.ingredients.map((ing) => ({
      item: ing.name,
      amount: ing.amount > 0 ? `${ing.amount} ${ing.unit}`.trim() : ing.originalText || ing.name,
      notes: "",
    })),
    steps: full.instructions.map((s) => ({
      heading: s.heading || `Step ${s.stepNumber}`,
      body: s.body,
    })),
    cleanup_tip: "Wipe down surfaces and load the dishwasher before the next call.",
    macros_per_serving: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    _imported: true,
    hall_curated: true,
  };
}

function fromPerformanceAdapted(
  perf: PerformanceAdaptedRecipe,
  crewSize: number,
): GenerateResponse {
  const m = perf.manifest;
  const scale = crewSize / Math.max(m.crewSizeDefault, 4);
  const scaleQty = (qty: number) => (qty > 0 ? Math.round(qty * scale * 10) / 10 : qty);

  return {
    template_id: 0,
    chosen_protein: m.protein,
    primary_protein_source: m.protein,
    title: m.title,
    meal_style: m.mealFormat,
    why_it_fits_tonight: m.hookLine,
    timing: {
      prep_minutes: m.prepMinutes,
      cook_minutes: m.cookMinutes,
      total_minutes: m.prepMinutes + m.cookMinutes,
    },
    protein_safety: [],
    ingredients: perf.ingredients.map((ing) => ({
      item: ing.name,
      amount: ing.quantity ? `${scaleQty(Number(ing.quantity))} ${ing.unit || ""}`.trim() : ing.name,
      notes: ing.notes || "",
    })),
    steps: perf.steps.map((s) => ({
      heading: s.title,
      body: s.instruction,
    })),
    cleanup_tip: "Wipe down surfaces and load the dishwasher before the next call.",
    macros_per_serving: {
      calories: perf.nutrition.calories,
      protein_g: perf.nutrition.protein,
      carbs_g: perf.nutrition.carbs,
      fat_g: perf.nutrition.fats,
    },
    pro_tips: perf.proTips,
    _imported: true,
    hall_curated: true,
  };
}

function hydrateGoldenSlug(
  slug: string,
  crewSize: number,
): { recipe: GenerateResponse; protein: string; title: string; catalogId: string } | null {
  const def = getGoldenRecipeBySlug(slug);
  if (!def) return null;

  const full = getCuratedRecipeBySlug(slug);
  const title = def.title;
  const why = def.hookLine;

  if (full?.generateResponse?.title?.trim()) {
    return {
      recipe: full.generateResponse,
      protein: full.protein || full.generateResponse.chosen_protein || def.protein,
      title: full.title || title,
      catalogId: full.recipeId,
    };
  }

  const classicSlug = def.classicSlug || slug;
  const pkg = getCuratedPackageDef(classicSlug);
  if (pkg) {
    const client = buildCuratedClientRecipe(pkg, crewSize);
    return {
      recipe: clientRecipeToGenerate(client, def.protein, title, why),
      protein: def.protein,
      title,
      catalogId: full?.recipeId || slug,
    };
  }

  if (full && (full.ingredients.length > 0 || full.instructions.length > 0)) {
    return {
      recipe: fromCuratedRow(full, title, why),
      protein: full.protein || def.protein,
      title: full.title || title,
      catalogId: full.recipeId,
    };
  }

  return {
    recipe: {
      template_id: 0,
      chosen_protein: def.protein,
      primary_protein_source: def.protein,
      title,
      meal_style: def.mealFormat,
      why_it_fits_tonight: why,
      timing: { prep_minutes: 15, cook_minutes: 30, total_minutes: 45 },
      protein_safety: [],
      ingredients: [],
      steps: [
        {
          heading: "Cook",
          body: "Open the Firehall Meals catalog page for full ingredients and steps.",
        },
      ],
      cleanup_tip: "Wipe down surfaces and load the dishwasher before the next call.",
      macros_per_serving: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      _imported: true,
      hall_curated: true,
    },
    protein: def.protein,
    title,
    catalogId: full?.recipeId || slug,
  };
}

/** Scale ingredient quantities from a def's authored crew default to the requested crew size. */
function scaledGoldenIngredients(
  ingredients: { name: string; quantity?: string; unit?: string; notes?: string }[],
  crewSizeDefault: number,
  crewSize: number,
) {
  const scale = crewSize / Math.max(crewSizeDefault, 4);
  return ingredients.map((ing) => {
    const qtyNum = ing.quantity ? Number(ing.quantity) : NaN;
    const amount =
      Number.isFinite(qtyNum) && qtyNum > 0
        ? `${Math.round(qtyNum * scale * 10) / 10} ${ing.unit || ""}`.trim()
        : `${ing.quantity ?? ""} ${ing.unit || ""}`.trim() || ing.name;
    return { item: ing.name, amount, notes: ing.notes || "" };
  });
}

function hydrateHallExpansionSlug(
  slug: string,
  crewSize: number,
): { recipe: GenerateResponse; protein: string; title: string; catalogId: string } | null {
  const def = getHallExpansionRecipeBySlug(slug);
  if (!def) return null;

  const full = getCuratedRecipeBySlug(slug);
  const title = def.title;

  if (full?.generateResponse?.title?.trim()) {
    return {
      recipe: full.generateResponse,
      protein: full.protein || full.generateResponse.chosen_protein || def.protein,
      title: full.title || title,
      catalogId: full.recipeId,
    };
  }
  if (full && (full.ingredients.length > 0 || full.instructions.length > 0)) {
    return {
      recipe: fromCuratedRow(full, title, def.hookLine),
      protein: full.protein || def.protein,
      title: full.title || title,
      catalogId: full.recipeId,
    };
  }

  return {
    recipe: expansionOrBbqToGenerate(def, crewSize),
    protein: def.protein,
    title,
    catalogId: full?.recipeId || slug,
  };
}

function hydrateBbqCatalogSlug(
  slug: string,
  crewSize: number,
): { recipe: GenerateResponse; protein: string; title: string; catalogId: string } | null {
  const def = getBbqCatalogRecipeBySlug(slug);
  if (!def) return null;

  const full = getCuratedRecipeBySlug(slug);
  const title = def.manifest.title;

  if (full?.generateResponse?.title?.trim()) {
    return {
      recipe: full.generateResponse,
      protein: full.protein || full.generateResponse.chosen_protein || def.manifest.protein,
      title: full.title || title,
      catalogId: full.recipeId,
    };
  }
  if (full && (full.ingredients.length > 0 || full.instructions.length > 0)) {
    return {
      recipe: fromCuratedRow(full, title, def.manifest.hookLine),
      protein: full.protein || def.manifest.protein,
      title: full.title || title,
      catalogId: full.recipeId,
    };
  }

  return {
    recipe: expansionOrBbqToGenerate(def, crewSize),
    protein: def.manifest.protein,
    title,
    catalogId: full?.recipeId || slug,
  };
}

/** Shared mapper — Hall Expansion and BBQ defs both use the GoldenRecipePage ingredient/step shape. */
function expansionOrBbqToGenerate(
  def: ExpansionRecipeDef | BbqRecipe,
  crewSize: number,
): GenerateResponse {
  const isExpansion = "slug" in def;
  const manifest = isExpansion ? def : def.manifest;
  const crewSizeDefault = isExpansion ? def.crewSizeDefault : def.manifest.crewSizeDefault;
  const protein = isExpansion ? def.protein : def.manifest.protein;
  const title = isExpansion ? def.title : def.manifest.title;
  const hook = isExpansion ? def.hookLine : def.manifest.hookLine;
  const mealFormat = isExpansion ? def.mealFormat : def.manifest.mealFormat;
  const prepMinutes = isExpansion ? def.prepMinutes : def.manifest.prepMinutes;
  const cookMinutes = isExpansion ? def.cookMinutes : def.manifest.cookMinutes;
  void manifest;

  return {
    template_id: 0,
    chosen_protein: protein,
    primary_protein_source: protein,
    title,
    meal_style: mealFormat,
    why_it_fits_tonight: hook,
    timing: {
      prep_minutes: prepMinutes,
      cook_minutes: cookMinutes,
      total_minutes: prepMinutes + cookMinutes,
    },
    protein_safety: [],
    ingredients: scaledGoldenIngredients(def.ingredients, crewSizeDefault, crewSize),
    steps: def.steps.map((s) => ({
      heading: s.title,
      body: s.instruction,
    })),
    cleanup_tip: "Wipe down surfaces and load the dishwasher before the next call.",
    macros_per_serving: isExpansion
      ? {
          calories: def.nutrition.calories,
          protein_g: def.nutrition.protein,
          carbs_g: def.nutrition.carbs,
          fat_g: def.nutrition.fats,
        }
      : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    pro_tips: def.proTips,
    _imported: true,
    hall_curated: true,
  };
}

function hydratePerformanceSlug(
  slug: string,
  crewSize: number,
): { recipe: GenerateResponse; protein: string; title: string; catalogId: string } | null {
  const perf = getPerformanceRecipeBySlug(slug);
  if (!perf) return null;

  const full = getCuratedRecipeBySlug(slug);
  const title = perf.manifest.title;
  const why = perf.manifest.hookLine;

  if (full?.generateResponse?.title?.trim()) {
    return {
      recipe: full.generateResponse,
      protein: full.protein || full.generateResponse.chosen_protein || perf.manifest.protein,
      title: full.title || title,
      catalogId: full.recipeId,
    };
  }

  if (full && (full.ingredients.length > 0 || full.instructions.length > 0)) {
    return {
      recipe: fromCuratedRow(full, title, why),
      protein: full.protein || perf.manifest.protein,
      title: full.title || title,
      catalogId: full.recipeId,
    };
  }

  return {
    recipe: fromPerformanceAdapted(perf, crewSize),
    protein: perf.manifest.protein,
    title,
    catalogId: full?.recipeId || slug,
  };
}

/** Resolve generate payload for an approved catalog slug. */
export function hydrateCatalogGenerateResponse(
  slug: string,
  crewSize: number,
): { recipe: GenerateResponse; protein: string; title: string; catalogId: string } | null {
  if (!isApprovedCatalogSlug(slug)) return null;
  if (isGolden100Slug(slug)) return hydrateGoldenSlug(slug, crewSize);
  if (isPerformance50Slug(slug)) return hydratePerformanceSlug(slug, crewSize);
  if (isHallExpansionSlug(slug)) return hydrateHallExpansionSlug(slug, crewSize);
  if (isBbqCatalogSlug(slug)) return hydrateBbqCatalogSlug(slug, crewSize);
  return null;
}

/** @deprecated Use hydrateCatalogGenerateResponse */
export function hydrateGoldenGenerateResponse(
  slug: string,
  crewSize: number,
): { recipe: GenerateResponse; protein: string; title: string; catalogId: string } | null {
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
