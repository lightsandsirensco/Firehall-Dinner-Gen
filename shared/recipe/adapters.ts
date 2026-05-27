/**
 * Bridges between canonical FirehallRecipe and legacy GenerateResponse / ClientRecipeResponse.
 * Preserves app compatibility — no UI or route rewrites required.
 */

import type { ClientRecipeResponse, GenerateResponse, IngredientItem, RecipeStep } from "../schema.js";
import type { RecipeSourceAttribution } from "../canonical-recipe.js";
import { normalizeFirehallRecipeDraft } from "./normalization.js";
import { parseFirehallRecipe } from "./validators.js";
import type { FirehallRecipe, RecipeParseResult } from "./types.js";
import type { SOURCE_TYPES } from "./constants.js";

function mapSourceKind(kind?: string): (typeof SOURCE_TYPES)[number] {
  const k = (kind || "generated").toLowerCase();
  if (k === "spoonacular") return "spoonacular";
  if (k === "publisher") return "publisher";
  if (k === "curated" || k === "hall_classic") return "curated";
  if (k === "partner") return "partner";
  if (k === "manual") return "manual";
  if (k === "template") return "template";
  return "generated";
}

/** Legacy server generate payload → canonical document (normalize + validate). */
export function firehallRecipeFromGenerateResponse(
  recipe: GenerateResponse,
  options: {
    id?: string;
    slug?: string;
    crewSize?: number;
    heroImage?: string;
    signature?: string;
    sourceType?: FirehallRecipe["source"]["sourceType"];
  } = {},
): RecipeParseResult {
  const draft = normalizeFirehallRecipeDraft(
    {
      ...recipe,
      title: recipe.title,
      _signature: options.signature,
      media: {
        heroImage: options.heroImage,
        imageAlt: `${recipe.title} — Firehall Meals`,
      },
      source: {
        sourceType: options.sourceType || mapSourceKind(recipe._recipe_source?.kind || recipe._source),
        sourceName: recipe._recipe_source?.name,
        sourceUrl: recipe._recipe_source?.url,
        license: recipe._recipe_source?.license,
        externalId: recipe._catalog_id,
      },
    },
    {
      id: options.id,
      slug: options.slug,
      crewSize: options.crewSize,
      sourceType: options.sourceType,
    },
  );
  return parseFirehallRecipe(draft);
}

/** Client API shape → canonical document. */
export function firehallRecipeFromClientResponse(
  client: ClientRecipeResponse,
  options: { id?: string; crewSize?: number } = {},
): RecipeParseResult {
  const ingredients: IngredientItem[] = (client.ingredients || []).map((i) => ({
    item: i.name,
    amount: i.qty > 0 ? `${i.qty} ${i.unit}`.trim() : i.unit || "",
    notes: "",
  }));
  const steps: RecipeStep[] = (client.steps || []).map((s) => ({
    heading: s.title,
    body: s.instructions,
    estimated_time: s.minutes,
  }));

  const draft = normalizeFirehallRecipeDraft(
    {
      title: client.title,
      meal_style: client.meal_style || client.meal_format,
      chosen_protein: client.chosen_protein,
      why_it_fits_tonight: client.why_it_fits_tonight,
      cleanup_tip: client.cleanup_tip,
      pro_tips: client.pro_tips,
      ingredients,
      steps,
      timing: {
        prep_minutes: client.timing?.prep_min || 0,
        cook_minutes: client.timing?.cook_min || 0,
        total_minutes: client.timing?.total_min || 0,
      },
      macros_per_serving: client.macros_per_serving,
      tags: client.recipe_tags,
      template_id: client.template_id,
      _catalog_id: client._catalog_id,
      _recipe_source: client._recipe_source as RecipeSourceAttribution | undefined,
      media: {
        heroImage: client.hero_image,
        imageAlt: client.hero_image_alt,
      },
    },
    { id: options.id || client._id, crewSize: options.crewSize ?? client.servings },
  );
  return parseFirehallRecipe(draft);
}

/** Canonical document → legacy GenerateResponse (for vote/cache/catalog write-through). */
export function firehallRecipeToGenerateResponse(recipe: FirehallRecipe): GenerateResponse {
  const ingredients: IngredientItem[] = recipe.ingredients.map((ing) => ({
    item: ing.name,
    amount: ing.originalText || [ing.quantity, ing.unit].filter(Boolean).join(" "),
    notes: ing.optional ? "optional" : "",
  }));

  const steps: RecipeStep[] = recipe.instructions.map((s) => ({
    heading: s.title,
    body: s.instruction,
    title: s.title,
    instruction: s.instruction,
    estimated_time: s.minutes,
    cooking_method: s.cookingMethod,
  }));

  const sourceKind = recipe.source.sourceType;
  const attribution: RecipeSourceAttribution | undefined = recipe.source.sourceName
    ? {
        kind:
          sourceKind === "spoonacular"
            ? "spoonacular"
            : sourceKind === "publisher"
              ? "publisher"
              : sourceKind === "curated" || sourceKind === "hall_classic"
                ? "curated"
                : "template",
        name: recipe.source.sourceName,
        url: recipe.source.sourceUrl || "",
        license: recipe.source.license || "internal",
      }
    : undefined;

  return {
    template_id: recipe.legacy?.templateId ?? 0,
    chosen_protein: recipe.classification.protein,
    primary_protein_source: recipe.classification.protein,
    title: recipe.identity.title,
    meal_style: recipe.classification.mealType,
    why_it_fits_tonight:
      recipe.legacy?.whyItFitsTonight || recipe.identity.shortDescription || "",
    timing: {
      prep_minutes: recipe.timing.prepMinutes,
      cook_minutes: recipe.timing.cookMinutes,
      total_minutes: recipe.timing.totalMinutes,
    },
    protein_safety: [],
    ingredients,
    steps,
    cleanup_tip: recipe.legacy?.cleanupTip || "",
    macros_per_serving: {
      calories: recipe.nutrition.caloriesEstimate ?? 0,
      protein_g: recipe.nutrition.proteinEstimate ?? 0,
      carbs_g: recipe.nutrition.carbEstimate ?? 0,
      fat_g: recipe.nutrition.fatEstimate ?? 0,
    },
    pro_tips: recipe.legacy?.proTips,
    tags: {
      cuisine: recipe.classification.cuisine,
      cooking_method: recipe.classification.equipment[0] || "stovetop",
      base_carb: "none",
      key_ingredients: recipe.classification.tags.slice(0, 8),
      high_protein: recipe.classification.tags.includes("high_protein"),
      high_fiber: recipe.classification.tags.includes("high_fiber"),
      quick_cleanup: recipe.classification.tags.includes("quick_cleanup"),
    },
    _catalog_id: recipe.legacy?.catalogId,
    _recipe_source: attribution,
    _imported: sourceKind !== "generated" && sourceKind !== "template",
  };
}

/** Canonical document → client card payload (subset; caller may merge meal_plate/hero status). */
export function firehallRecipeToClientSummary(
  recipe: FirehallRecipe,
  extras: Partial<ClientRecipeResponse> = {},
): Pick<
  ClientRecipeResponse,
  | "title"
  | "meal_format"
  | "servings"
  | "timing"
  | "chosen_protein"
  | "why_it_fits_tonight"
  | "hero_image"
  | "hero_image_alt"
> {
  return {
    title: recipe.identity.title,
    meal_format: recipe.classification.mealType,
    servings: recipe.servings.crewSizeMax,
    timing: {
      prep_min: recipe.timing.prepMinutes,
      cook_min: recipe.timing.cookMinutes,
      total_min: recipe.timing.totalMinutes,
    },
    chosen_protein: recipe.classification.protein,
    why_it_fits_tonight: recipe.identity.shortDescription || "",
    hero_image: recipe.media?.heroImage,
    hero_image_alt: recipe.media?.imageAlt,
    ...extras,
  };
}

/** Quick normalize + parse for pipelines that must not throw. */
export function tryParseLegacyGenerateResponse(
  recipe: GenerateResponse,
  crewSize?: number,
): FirehallRecipe | null {
  const result = firehallRecipeFromGenerateResponse(recipe, { crewSize });
  return result.ok ? result.data : null;
}
