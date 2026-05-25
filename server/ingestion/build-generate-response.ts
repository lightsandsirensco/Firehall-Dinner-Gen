/**

 * Build minimal GenerateResponse from curated ingest draft (publisher path).

 * Preserves original publisher steps — no rule expansion at import time.

 */



import type { IngestRecipeDraft } from "../../shared/ingestion/recipe-ingest-schema.js";

import type { GenerateResponse } from "../../shared/schema.js";

import { attachImportedRecipeMeta } from "../../shared/imported-recipe.js";

import type { RecipeSourceAttribution } from "../../shared/canonical-recipe.js";



export function buildGenerateResponseFromDraft(draft: IngestRecipeDraft): GenerateResponse {

  const cookMin = Math.max(0, draft.totalMinutes - draft.prepMinutes);



  const steps = draft.steps.map((s) => ({

    heading: `Step ${s.number}`,

    body: s.step.trim(),

  }));



  const source: RecipeSourceAttribution = {

    kind: "publisher",

    name: draft.sourceName || "Recipe blog",

    url: draft.sourceUrl || "",

    license: draft.license === "owned" ? "owned" : "partner",

  };



  const base: GenerateResponse = {

    template_id: 0,

    chosen_protein: draft.protein,

    primary_protein_source: draft.protein,

    title: draft.title,

    why_it_fits_tonight:

      draft.summary ||

      `A real ${draft.mealFormat.replace(/_/g, " ")} from ${draft.sourceName || "the web"}, scaled for your hall.`,

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

    steps,

    cleanup_tip:

      (draft.cleanupDifficulty ?? 3) <= 2

        ? "One-pan cleanup — fast turnover."

        : "Standard hall cleanup.",

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

      quick_cleanup: (draft.cleanupDifficulty ?? 3) <= 2,

    },

  };



  return attachImportedRecipeMeta(base, source, { preserveSteps: true });

}


