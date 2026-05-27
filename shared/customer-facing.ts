/**
 * Customer-facing copy — never expose internal generation vocabulary.
 */

import type { ClientRecipeResponse } from "./schema.js";
import { formatAdaptationLabel } from "./imported-recipe.js";
import type { RecipeSourceAttribution } from "./canonical-recipe.js";

const INTERNAL_LEAK =
  /\b(fallback|template|publisher|schema|validation|loosen filter|station kitchen|station classic|plated main|protein bowl|ai.?generated|openai|spoonacular api)\b/i;

/** Lines shown when meal came from curated pool (server _fallback flag). */
const HALL_PICK_LINES = [
  "Hall-tested crew favorite",
  "Curated pick for tonight's table",
  "A proven meal at the station",
  "Chef's pick for busy shift nights",
] as const;

function stableIndex(key: string, len: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return Math.abs(h) % len;
}

export function sanitizeCustomerText(text: string): string {
  if (!text?.trim()) return "";
  if (INTERNAL_LEAK.test(text)) {
    return "Built for a real crew dinner tonight";
  }
  return text.trim();
}

export function customerSourceAttribution(
  source?: RecipeSourceAttribution | null,
): string | null {
  if (!source?.name) return null;
  const line = formatAdaptationLabel(source);
  if (!line || INTERNAL_LEAK.test(line)) return "Inspired by a trusted hall recipe";
  return sanitizeCustomerText(line);
}

export function customerHallPickLine(recipe: Pick<ClientRecipeResponse, "title" | "_signature">): string {
  const key = recipe._signature || recipe.title || "";
  return HALL_PICK_LINES[stableIndex(key, HALL_PICK_LINES.length)];
}

/** Strip internal fields from API payloads (keep server-side in debug only). */
export function stripInternalClientFields<T extends Record<string, unknown>>(
  client: T,
  debug = false,
): T {
  if (debug) return client;
  const out = { ...client };
  delete out._source;
  delete out._fallback;
  delete out._filters_adjusted;
  delete out._adjustment_note;
  return out as T;
}
