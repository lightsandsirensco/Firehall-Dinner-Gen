/**
 * Build minimal GenerateResponse from curated ingest draft (publisher path).
 */

import type { IngestRecipeDraft } from "../../shared/ingestion/recipe-ingest-schema.js";
import type { GenerateResponse } from "../../shared/schema.js";
import {
  enhanceRecipeStepsSync,
  buildEnhanceContextFromTitle,
} from "../instruction-enhancer.js";

export function buildGenerateResponseFromDraft(draft: IngestRecipeDraft): GenerateResponse {
  const cookMin = Math.max(0, draft.totalMinutes - draft.prepMinutes);

  const ctx = buildEnhanceContextFromTitle(draft.title, {
    protein: draft.protein,
    totalMinutes: draft.totalMinutes,
    crewSize: draft.servingsBase,
    ingredients: draft.ingredients.map((i) => i.name),
    mealFormat: draft.mealFormat,
  });

  const enhancedSteps = enhanceRecipeStepsSync(
    draft.steps.map((s) => ({
      heading: `Step ${s.number}`,
      body: s.step,
    })),
    ctx,
  );

  return {
    template_id: 0,
    chosen_protein: draft.protein,
    primary_protein_source: draft.protein,
    title: draft.title,
    why_it_fits_tonight:
      draft.summary ||
      `A crew-tested ${draft.mealFormat.replace(/_/g, " ")} built for a busy hall night.`,
    timing: {
      prep_minutes: draft.prepMinutes,
      cook_minutes: cookMin,
      total_minutes: draft.totalMinutes,
    },
    protein_safety: [],
    ingredients: draft.ingredients.map((ing) => ({
      item: ing.name,
      amount: ing.original || `${ing.amount} ${ing.unit}`.trim(),
      notes: "",
    })),
    steps: enhancedSteps,
    cleanup_tip: draft.cleanupDifficulty <= 2 ? "One-pan cleanup — fast turnover." : "Standard hall cleanup.",
    macros_per_serving: {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    },
    tags: {
      cuisine: draft.cuisine,
      cooking_method: draft.mealFormat.replace(/_/g, " "),
      base_carb: "varies",
      key_ingredients: draft.ingredients.slice(0, 5).map((i) => i.name),
      high_protein: /chicken|beef|pork|fish|turkey/.test(draft.protein),
      high_fiber: false,
      quick_cleanup: draft.cleanupDifficulty <= 2,
    },
  };
}
