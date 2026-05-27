/**
 * Layer D — deterministic emergency meals (never hard-fail generate).
 */

import type { GenerateRequest, GenerateResponse, TemplateRow } from "@shared/schema";
import {
  pickEmergencyFallbackSeed,
  type EmergencyMealSeed,
} from "../../shared/emergency-fallback-pools.js";
import { buildFallbackRecipe } from "../fallback-recipe.js";
import { buildSafeFallbackRecipe } from "../ai.js";
import { pickStructure, STRUCTURE_DISPLAY, type StructureType } from "../structure-variety.js";
import { TEMPLATE_FALLBACK_ATTRIBUTION } from "../recipe-fallback-policy.js";
import type { RecipeSourceAttribution } from "../../shared/canonical-recipe.js";
import { log } from "../logger.js";

const STUB_TEMPLATE: TemplateRow = {
  template_id: "0",
  template_name: "Emergency",
  style: "",
  base_idea_description: "",
  appliances_needed: "",
  time_range_minutes: "",
  busy_level_fit: "",
  healthiness_level: "",
  proteins_allowed: "",
  allergens_possible: "",
  mess_level: "",
  reheat_friendly: "",
};

const FORMAT_TO_STRUCTURE: Partial<Record<string, StructureType>> = {
  pasta: "pasta",
  burger: "burger",
  tacos: "taco",
  wrap: "wrap",
  bowl: "bowl",
  salad: "bowl",
  sheet_pan: "sheet-pan",
  skillet: "skillet",
  stir_fry: "stir-fry",
  soup_chili: "soup-stew",
  stew: "soup-stew",
  grill: "grill",
  one_pot: "one-pot",
  casserole: "casserole",
  breakfast: "breakfast-for-dinner",
  loaded_fries: "loaded-fries",
  sandwich: "sandwich",
  plated_main: "plated-main",
};

export interface EmergencyFallbackResult {
  recipe: GenerateResponse;
  protein: string;
  emergencyId: string;
  seed: EmergencyMealSeed;
  recipeSource: RecipeSourceAttribution;
}

function resolveStructure(request: GenerateRequest, seed: EmergencyMealSeed): StructureType {
  const fmt = (request.meal_format || seed.mealFormat || "random").toLowerCase();
  if (fmt !== "random" && FORMAT_TO_STRUCTURE[fmt]) {
    return FORMAT_TO_STRUCTURE[fmt]!;
  }
  return pickStructure(
    request.appliances,
    request.time_available,
    request.recent_meal_styles || [],
    request.prefer_different_style || false,
  );
}

export function buildEmergencyFallbackRecipe(
  request: GenerateRequest,
  varietySeed: string,
): EmergencyFallbackResult {
  const seed = pickEmergencyFallbackSeed(request, varietySeed);
  const structure = resolveStructure(request, seed);
  const structureDisplay = STRUCTURE_DISPLAY[structure] || structure;

  const protein =
    request.protein && request.protein !== "any"
      ? request.protein
      : seed.protein !== "any"
        ? seed.protein
        : "chicken";

  let recipe: GenerateResponse;
  try {
    recipe = buildFallbackRecipe(
      STUB_TEMPLATE,
      request,
      protein,
      structure,
      [],
    );
    recipe.title = seed.title;
    recipe.why_it_fits_tonight = seed.whyItFits;
    recipe.meal_style = structureDisplay;
  } catch {
    recipe = buildSafeFallbackRecipe(seed.mealFormat, request.crew_size ?? 4);
    recipe.title = seed.title;
    recipe.why_it_fits_tonight = seed.whyItFits;
    recipe.meal_style = structureDisplay;
  }

  recipe._fallback = true;
  recipe.chosen_protein = protein;

  log(
    `[generate:emergency] id=${seed.id} protein=${protein} format=${seed.mealFormat}`,
    "generate",
  );

  return {
    recipe,
    protein,
    emergencyId: seed.id,
    seed,
    recipeSource: {
      ...TEMPLATE_FALLBACK_ATTRIBUTION,
      name: "Firehall emergency meal",
    },
  };
}
