/**
 * Editorial title fields for Golden recipe pages.
 */

import type { GoldenRecipeDefinition } from "../types.js";
import { hasWeakTitle } from "./placeholders.js";

export interface RecipeTitleFields {
  displayTitle: string;
  seoTitle: string;
  slugTitle: string;
  shortDescription: string;
}

function cleanDisplayTitle(title: string): string {
  let t = title
    .replace(/\s*recipe\s*$/i, "")
    .replace(/\s+with\s+.+$/i, "")
    .replace(/\s+and\s+.+$/i, "")
    .trim();
  if (t.length > 48) {
    t = t.split(/\s+/).slice(0, 7).join(" ");
  }
  return t || title.trim();
}

export function buildRecipeTitleFields(def: GoldenRecipeDefinition): RecipeTitleFields {
  const displayTitle = hasWeakTitle(def.title) ? cleanDisplayTitle(def.hookLine || def.title) : def.title.trim();
  const seoTitle = `${displayTitle} | Firefighter Meal`;
  const slugTitle = def.slug;
  const shortDescription =
    def.hookLine?.trim() ||
    `${displayTitle} — crew portions and timing that still work when the board runs hot.`;

  return { displayTitle, seoTitle, slugTitle, shortDescription };
}
