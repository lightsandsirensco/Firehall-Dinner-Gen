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

const MEAL_FORMAT_LABELS: Record<string, string> = {
  burger: "Burgers",
  tacos: "Tacos",
  taco: "Tacos",
  wrap: "Wraps",
  bowl: "Bowls",
  pasta: "Pasta",
  salad: "Salad",
  sheet_pan: "Sheet Pan",
  skillet: "Skillet",
  stir_fry: "Stir-Fry",
  soup_chili: "Soup & Chili",
  soup: "Soup & Chili",
  stew: "Stew",
  grill: "Grill",
  one_pot: "One-Pot",
  breakfast: "Breakfast for Dinner",
  breakfast_for_dinner: "Breakfast for Dinner",
  loaded_fries: "Loaded Fries",
  sandwich: "Sandwiches",
  casserole: "Casserole",
  noodle_toss: "Noodles",
};

function formatKey(raw?: string | null): string {
  return (raw || "").toLowerCase().trim().replace(/\s*\/.*$/, "").replace(/[\s-]+/g, "_");
}

/**
 * Chip label for the dish format. Prefers the built dish's meal_style over the
 * requested meal_format; "random", "plated main" and unknown values return null.
 */
export function customerMealFormatLabel(
  recipe: Pick<ClientRecipeResponse, "meal_format" | "meal_style">,
): string | null {
  return MEAL_FORMAT_LABELS[formatKey(recipe.meal_style)] || MEAL_FORMAT_LABELS[formatKey(recipe.meal_format)] || null;
}

const NON_LABEL_VALUES = new Set(["", "any", "random", "mixed", "hall", "none"]);

export function customerProteinLabel(protein?: string | null): string | null {
  const p = (protein || "").trim();
  if (NON_LABEL_VALUES.has(p.toLowerCase())) return null;
  return p.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Cuisine caption; placeholder values ("Hall", "any") are internal, not a cuisine. */
export function customerCuisineLabel(cuisine?: string | null): string | null {
  const c = (cuisine || "").trim();
  if (NON_LABEL_VALUES.has(c.toLowerCase())) return null;
  return c;
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
