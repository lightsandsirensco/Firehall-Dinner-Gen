/**
 * Fallback policy — template/LLM paths are explicit last resort only.
 *
 * Default order for /api/generate (non-pantry):
 *   curated editorial → Golden 100 → cache/catalog → emergency pools → live API (timeout) → emergency
 *
 * LLM remix (fallbackRemix) is opt-in via ALLOW_LLM_FALLBACK=true.
 * Template fallback can be disabled via DISABLE_TEMPLATE_FALLBACK=true (503 instead).
 */

import type { RecipeSourceAttribution } from "../shared/canonical-recipe.js";

export function isLlmFallbackAllowed(): boolean {
  return process.env.ALLOW_LLM_FALLBACK === "true";
}

export function isTemplateFallbackAllowed(): boolean {
  return process.env.DISABLE_TEMPLATE_FALLBACK !== "true";
}

/** Attribution for deterministic template fallback meals. */
export const TEMPLATE_FALLBACK_ATTRIBUTION: RecipeSourceAttribution = {
  kind: "template",
  name: "Firehall Kitchen",
  url: "",
  license: "internal",
};
