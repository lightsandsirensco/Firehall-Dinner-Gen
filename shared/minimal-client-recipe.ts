import type { ClientRecipeResponse } from "./schema.js";

/** Minimal client recipe shell for hall vote / placeholders. */
export function buildMinimalClientRecipe(title: string): ClientRecipeResponse {
  return {
    title,
    meal_format: "plated_main",
    servings: 6,
    tags: ["Hall vote"],
    timing: { prep_min: 0, cook_min: 0, total_min: 0 },
    protein_safety: { protein: "any", internal_temp_f: 165, rest_min: 0, notes: "" },
    ingredients: [],
    steps: [],
    plating: {
      serve_style: "Family style on the hall table",
      assembly_instructions: "Serve hot when the crew is ready.",
      optional_toppings: [],
    },
    macros_per_serving: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    chosen_protein: "any",
    primary_protein_source: "any",
    why_it_fits_tonight: "Crew vote option — generate the full meal after the poll closes.",
    cleanup_tip: "",
  };
}
