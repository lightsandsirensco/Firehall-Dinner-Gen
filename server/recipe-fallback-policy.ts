/**
 * Fallback policy — template/LLM paths are explicit last resort only.
 *
 * Default order for /api/generate (non-pantry):
 *   catalog → Spoonacular V2 → relaxed catalog → relaxed V2 → session cache → template
 *
 * LLM remix (fallbackRemix) is opt-in via ALLOW_LLM_FALLBACK=true.
 */

import type { RecipeSourceAttribution } from "../shared/canonical-recipe.js";

export function isLlmFallbackAllowed(): boolean {
  return process.env.ALLOW_LLM_FALLBACK === "true";
}

/** Attribution for deterministic template fallback meals. */
export const TEMPLATE_FALLBACK_ATTRIBUTION: RecipeSourceAttribution = {
  kind: "template",
  name: "Firehall Kitchen",
  url: "",
  license: "Firehall template — not a publisher recipe",
};
