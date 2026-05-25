import type { GenerateResponse } from "./schema.js";

/** Placeholder meal payload for hall vote options without a full recipe attached. */
export function buildMinimalGenerateResponse(title = "Hall vote option"): GenerateResponse {
  return {
    template_id: 0,
    chosen_protein: "any",
    primary_protein_source: "any",
    title,
    why_it_fits_tonight: "Crew picks this option — full recipe loads after the vote.",
    timing: { prep_minutes: 0, cook_minutes: 0, total_minutes: 0 },
    protein_safety: [],
    ingredients: [],
    steps: [],
    cleanup_tip: "",
    macros_per_serving: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  };
}
