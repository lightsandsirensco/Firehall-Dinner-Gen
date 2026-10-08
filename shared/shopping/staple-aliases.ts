/**
 * Smart Shopping — pantry lookup aliases for common staples.
 *
 * Canonical keys stay specific ("kosher salt" and "salt" are separate list
 * lines), but pantry matching needs to know that a pantry entry for "Salt"
 * covers "Kosher Salt". This is an explicit, reviewed table — no fuzzy
 * matching — and an exact pantry entry for the specific key always wins.
 */

import { canonicalizeIngredientName } from "./ingredient-normalizer";

const RAW_STAPLE_ALIASES: [variant: string, staple: string][] = [
  ["Kosher Salt", "Salt"],
  ["Sea Salt", "Salt"],
  ["Flaky Sea Salt", "Salt"],
  ["Coarse Salt", "Salt"],
  ["Coarse Sea Salt", "Salt"],
  ["Table Salt", "Salt"],
  ["Fine Salt", "Salt"],
  ["Ground Black Pepper", "Black Pepper"],
  ["Coarse Black Pepper", "Black Pepper"],
  ["Cracked Black Pepper", "Black Pepper"],
  ["Freshly Ground Black Pepper", "Black Pepper"],
  ["Freshly Cracked Black Pepper", "Black Pepper"],
  ["Unsalted Butter", "Butter"],
  ["Salted Butter", "Butter"],
  ["All-Purpose Flour", "Flour"],
  ["Extra-Virgin Olive Oil", "Olive Oil"],
  ["Extra Virgin Olive Oil", "Olive Oil"],
  ["Vegetable Oil", "Cooking Oil"],
  ["Canola Oil", "Cooking Oil"],
  ["Neutral Oil", "Cooking Oil"],
  ["Neutral High-Heat Oil", "Cooking Oil"],
  ["Cumin", "Ground Cumin"],
  ["Ground Cinnamon", "Cinnamon"],
  ["Bay Leaf", "Bay Leaves"],
  ["Crushed Red Chili Flakes", "Crushed Red Pepper Flakes"],
];

export const STAPLE_ALIASES: Record<string, string> = Object.fromEntries(
  RAW_STAPLE_ALIASES.map(([variant, staple]) => [
    canonicalizeIngredientName(variant),
    canonicalizeIngredientName(staple),
  ]).filter(([variant, staple]) => variant !== staple),
);

/** Keys to check in a pantry for this item, most specific first. */
export function pantryLookupKeys(canonicalKey: string): string[] {
  const alias = STAPLE_ALIASES[canonicalKey];
  return alias ? [canonicalKey, alias] : [canonicalKey];
}

/** "kosher salt and black pepper" -> ["kosher salt", "black pepper"]; null for single ingredients. */
export function splitCompoundKey(canonicalKey: string): string[] | null {
  const parts = canonicalKey
    .split(" and ")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : null;
}
