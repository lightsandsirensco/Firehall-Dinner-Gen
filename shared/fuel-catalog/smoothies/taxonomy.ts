import { z } from "zod";
import { SMOOTHIE_TAXONOMY, SMOOTHIE_TAXONOMY_LABELS, type SmoothieTaxonomy } from "../constants.js";

export const smoothieTaxonomySchema = z.enum(SMOOTHIE_TAXONOMY);

export function smoothieTaxonomyLabel(cat: SmoothieTaxonomy): string {
  return SMOOTHIE_TAXONOMY_LABELS[cat];
}

export function inferSmoothieTaxonomy(categoryHint: string): SmoothieTaxonomy {
  const c = categoryHint.toLowerCase();
  if (c.includes("protein")) return "protein_smoothie";
  if (c.includes("recovery")) return "recovery_smoothie";
  if (c.includes("breakfast")) return "breakfast_smoothie";
  if (c.includes("green")) return "green_smoothie";
  if (c.includes("coffee") || c.includes("mocha")) return "coffee_smoothie";
  if (c.includes("berry") || c.includes("fruit") || c.includes("tropical")) return "fruit_smoothie";
  return "fruit_smoothie";
}
