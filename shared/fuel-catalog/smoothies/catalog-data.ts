/**
 * Smoothie catalog — canonical fuel data (not dinner, not Golden 100).
 */

import type { EditorialEmbeddedRecipe } from "../../editorial/content-schema.js";
import { FUEL_SET_TAG_SMOOTHIE } from "../constants.js";
import { inferSmoothieTaxonomy } from "./taxonomy.js";
import type { SmoothieCatalogItem } from "./types.js";
import { SMOOTHIE_RECIPES_SOURCE } from "./recipes-source.js";
import { smoothieHeroImagePath } from "../paths.js";

function mapSourceToItem(raw: EditorialEmbeddedRecipe): SmoothieCatalogItem {
  const slug = raw.id;
  const hero = raw.imagePath?.trim() || smoothieHeroImagePath(slug);
  return {
    slug,
    title: raw.name,
    subtitle: raw.category ?? "Smoothie",
    taxonomyCategory: inferSmoothieTaxonomy(raw.category ?? ""),
    intro: raw.intro,
    ingredients: raw.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      notes: i.notes,
    })),
    instructions: raw.instructions,
    nutritionHighlights: raw.nutritionHighlights,
    substitutions: raw.substitutions,
    shiftNote: raw.shiftNote,
    heroImage: hero,
    thumbImage: hero,
    imageAlt: raw.imageAlt ?? raw.name,
  };
}

export const SMOOTHIE_CATALOG_ITEMS: SmoothieCatalogItem[] =
  SMOOTHIE_RECIPES_SOURCE.map(mapSourceToItem);

export const SMOOTHIE_CATALOG_TAG = FUEL_SET_TAG_SMOOTHIE;

export function getSmoothieCatalogItem(slug: string): SmoothieCatalogItem | undefined {
  const key = slug.trim().toLowerCase();
  return SMOOTHIE_CATALOG_ITEMS.find((r) => r.slug === key);
}

const SMOOTHIE_SLUG_SET = new Set(SMOOTHIE_CATALOG_ITEMS.map((r) => r.slug));

/** True for any smoothie catalog slug — smoothies live at `/smoothies/:slug`, not `/recipes/:slug`. */
export function isSmoothieCatalogSlug(slug: string | null | undefined): boolean {
  const s = (slug || "").trim().toLowerCase();
  return s.length > 0 && SMOOTHIE_SLUG_SET.has(s);
}
