/**
 * Sanitize user-facing recipe text — strip internal vocabulary and fix whitespace.
 */

import type { GenerateResponse } from "../schema.js";

const INTERNAL_LEAK =
  /\b(fallback recipe|template fallback|loosen filter|publisher recipe|validation failed|schema error|station kitchen|plated main|protein bowl|archetype|meal format)\b/i;

const MULTI_SPACE = /\s{2,}/g;

export function sanitizeDisplayText(text: string): string {
  let t = (text || "").trim().replace(MULTI_SPACE, " ");
  if (INTERNAL_LEAK.test(t)) {
    return "A crew-ready dinner built for real shift nights.";
  }
  return t;
}

export function sanitizeRecipeTitle(title: string): string {
  return sanitizeDisplayText(title)
    .replace(/\s+with\s+with\b/gi, " with ")
    .replace(/\s+-\s+/g, " — ")
    .slice(0, 120);
}

export function sanitizeGenerateResponseCopy(recipe: GenerateResponse): GenerateResponse {
  return {
    ...recipe,
    title: sanitizeRecipeTitle(recipe.title || ""),
    why_it_fits_tonight: sanitizeDisplayText(recipe.why_it_fits_tonight || ""),
    cleanup_tip: sanitizeDisplayText(recipe.cleanup_tip || ""),
    pro_tips: (recipe.pro_tips || []).map((t) => sanitizeDisplayText(t)).filter(Boolean),
    steps: (recipe.steps || []).map((s) => ({
      ...s,
      heading: sanitizeDisplayText(s.heading || ""),
      body: sanitizeDisplayText(s.body || ""),
      title: s.title ? sanitizeDisplayText(s.title) : s.title,
      instruction: s.instruction ? sanitizeDisplayText(s.instruction) : s.instruction,
    })),
  };
}
