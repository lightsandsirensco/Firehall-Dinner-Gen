/**
 * v2-fallback.ts
 * Minimal deterministic fallback for the V2 Spoonacular engine.
 *
 * Triggers ONLY when Spoonacular returns no valid candidate after validation.
 * Respects: protein, meal_format, allergens, carb rules.
 * Does NOT invent or relabel formats — the requested meal_format drives the
 * StructureType selection directly; pickStructure() is only called when format
 * is "random" or absent.
 */

import type { GenerateRequest, GenerateResponse, TemplateRow } from "@shared/schema";
import { log } from "./index";
import { type StructureType, pickStructure, STRUCTURE_DISPLAY } from "./structure-variety";
import { buildFallbackRecipe } from "./fallback-recipe";
import { buildSafeFallbackRecipe } from "./ai";

// ── Format → Structure map ─────────────────────────────────────────────────
// Each schema meal_format value maps to the closest StructureType in the
// archetype table.  "random" and unmapped values fall through to pickStructure().
const FORMAT_TO_STRUCTURE: Partial<Record<string, StructureType>> = {
  pasta:        "pasta",
  burger:       "burger",
  tacos:        "taco",
  wrap:         "wrap",
  bowl:         "bowl",
  salad:        "bowl",             // bowl archetype covers green-base salads
  sheet_pan:    "sheet-pan",
  skillet:      "skillet",
  stir_fry:     "stir-fry",
  soup_chili:   "soup-stew",
  stew:         "soup-stew",
  grill:        "grill",
  one_pot:      "one-pot",
  casserole:    "casserole",
  breakfast:    "breakfast-for-dinner",
  loaded_fries: "loaded-fries",
  sandwich:     "sandwich",
  plated_main:  "plated-main",
};

// Minimal synthesised TemplateRow — buildFallbackRecipe only reads template_id
// from the template object; everything else (ingredients, steps, archetype) comes
// from its own built-in data.
const STUB_TEMPLATE: TemplateRow = {
  template_id:           "0",
  template_name:         "Fallback",
  style:                 "",
  base_idea_description: "",
  appliances_needed:     "",
  time_range_minutes:    "",
  busy_level_fit:        "",
  healthiness_level:     "",
  proteins_allowed:      "",
  allergens_possible:    "",
  mess_level:            "",
  reheat_friendly:       "",
};

export interface V2FallbackResult {
  recipe: GenerateResponse;
  protein: string;
  structure: StructureType;
  structureDisplay: string;
  usedFallback: true;
}

/**
 * Run the deterministic V2 fallback.
 *
 * @param request     - The original GenerateRequest (protein, allergens, crew, etc.)
 * @param reason      - Human-readable reason for why the fallback fired
 * @param recentSigs  - Recent recipe signatures to avoid repetition
 */
export async function runV2Fallback(
  request: GenerateRequest,
  reason: string,
  recentSigs: string[] = [],
): Promise<V2FallbackResult> {
  const fmt = request.meal_format && request.meal_format !== "random"
    ? request.meal_format
    : null;

  // ── Derive structure ───────────────────────────────────────────────────────
  let targetStructure: StructureType;
  let structureSource: string;

  if (fmt && FORMAT_TO_STRUCTURE[fmt]) {
    targetStructure = FORMAT_TO_STRUCTURE[fmt]!;
    structureSource = `requested format "${fmt}"`;
  } else {
    // Only call variety rotation when no specific format was requested
    targetStructure = pickStructure(
      request.appliances,
      request.time_available,
      request.recent_meal_styles || [],
      false,
    );
    structureSource = "variety rotation (format=random)";
  }

  const protein = request.protein ?? "chicken";

  log(
    `[fallback] used=true | reason=${reason} | format=${fmt ?? "random"} → structure=${targetStructure} (${structureSource}) | protein=${protein}`,
    "fallback",
  );

  // ── Build recipe ───────────────────────────────────────────────────────────
  let recipe: GenerateResponse;
  try {
    recipe = buildFallbackRecipe(STUB_TEMPLATE, request, protein, targetStructure, recentSigs);
    log(`[fallback] recipe built | title="${recipe.title}" | structure=${targetStructure}`, "fallback");
  } catch (err: any) {
    log(`[fallback] buildFallbackRecipe threw: ${err.message} — using safe fallback`, "fallback");
    recipe = buildSafeFallbackRecipe(targetStructure, request.crew_size ?? 4);
  }

  const structureDisplay = STRUCTURE_DISPLAY[targetStructure] || targetStructure;

  return {
    recipe,
    protein,
    structure: targetStructure,
    structureDisplay,
    usedFallback: true,
  };
}
