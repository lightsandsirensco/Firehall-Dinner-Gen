/**
 * Tag normalization and controlled vocabulary helpers.
 */

import { CUISINES, MEAL_TYPES, PROTEINS, RECIPE_TAG_SLUGS } from "./constants.js";

export function slugifyTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function normalizeRecipeTagList(tags: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags || []) {
    const slug = slugifyTag(raw);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out.slice(0, 24);
}

export function mergeControlledTags(
  tags: string[],
  flags: {
    highProtein?: boolean;
    highFiber?: boolean;
    quickCleanup?: boolean;
    rookieFriendly?: boolean;
    stationFavorite?: boolean;
    mealPrep?: boolean;
    freezerFriendly?: boolean;
  },
): string[] {
  const extra: string[] = [];
  if (flags.highProtein) extra.push("high_protein");
  if (flags.highFiber) extra.push("high_fiber");
  if (flags.quickCleanup) extra.push("quick_cleanup");
  if (flags.rookieFriendly) extra.push("rookie_friendly");
  if (flags.stationFavorite) extra.push("station_favorite");
  if (flags.mealPrep) extra.push("meal_prep");
  if (flags.freezerFriendly) extra.push("freezer_friendly");
  return normalizeRecipeTagList([...tags, ...extra]);
}

export function isKnownRecipeTag(tag: string): boolean {
  const s = slugifyTag(tag);
  return (RECIPE_TAG_SLUGS as readonly string[]).includes(s);
}

export function coerceProtein(raw: string | undefined): (typeof PROTEINS)[number] {
  const p = (raw || "any").toLowerCase().trim();
  if ((PROTEINS as readonly string[]).includes(p)) return p as (typeof PROTEINS)[number];
  if (/chicken|thigh|breast/.test(p)) return "chicken";
  if (/beef|steak|ground beef/.test(p)) return "beef";
  if (/pork|sausage/.test(p)) return "pork";
  if (/turkey/.test(p)) return "turkey";
  if (/shrimp|seafood|prawn/.test(p)) return "seafood";
  if (/salmon|cod|fish|tilapia/.test(p)) return "fish";
  if (/tofu|veggie|vegetarian|chickpea/.test(p)) return "vegetarian";
  return "any";
}

export function coerceCuisine(raw: string | undefined): (typeof CUISINES)[number] {
  const c = (raw || "american").toLowerCase().trim().replace(/\s+/g, "_");
  if ((CUISINES as readonly string[]).includes(c)) return c as (typeof CUISINES)[number];
  if (c === "any") return "american";
  if (/mex|tex/.test(c)) return "mexican";
  if (/ital/.test(c)) return "italian";
  if (/korean/.test(c)) return "korean";
  if (/thai/.test(c)) return "thai";
  if (/indian/.test(c)) return "indian";
  if (/bbq|barbecue/.test(c)) return "bbq";
  if (/mediterranean|greek/.test(c)) return "mediterranean";
  if (/asian|chinese|japanese/.test(c)) return "asian";
  return "american";
}

export function coerceMealType(raw: string | undefined): (typeof MEAL_TYPES)[number] {
  const m = (raw || "bowl")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  if (m === "taco") return "tacos";
  if (m === "soup" || m === "soup_chili") return "soup_chili";
  if (m === "stir-fry" || m === "stir_fry") return "stir_fry";
  if (m === "sheet-pan" || m === "sheet_pan") return "sheet_pan";
  if (m === "one-pot" || m === "one_pot") return "one_pot";
  if (m === "loaded-fries" || m === "loaded_fries") return "loaded_fries";
  if (m === "random" || m === "plated") return "plated_main";
  if ((MEAL_TYPES as readonly string[]).includes(m)) return m as (typeof MEAL_TYPES)[number];
  return "bowl";
}
