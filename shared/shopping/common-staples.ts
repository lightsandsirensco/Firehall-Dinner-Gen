/**
 * Smart Shopping — common staple defaults.
 *
 * Seeded into every new Personal and Hall Pantry as "always stocked" so a
 * brand-new list is already decluttered without the user configuring
 * anything — pantry intelligence should feel automatic, not like a setup
 * chore.
 */

import { canonicalizeIngredientName } from "./ingredient-normalizer";

export interface CommonStaple {
  key: string;
  label: string;
}

const RAW_COMMON_STAPLES: string[] = [
  "Salt",
  "Black Pepper",
  "Cooking Oil",
  "Olive Oil",
  "Butter",
  "Coffee",
  "Flour",
  "Rice",
  // Common spices
  "Garlic Powder",
  "Onion Powder",
  "Paprika",
  "Ground Cumin",
  "Chili Powder",
  "Dried Oregano",
  "Dried Basil",
  "Italian Seasoning",
  "Cinnamon",
  "Bay Leaves",
  "Crushed Red Pepper Flakes",
];

export const COMMON_STAPLES: CommonStaple[] = RAW_COMMON_STAPLES.map((label) => ({
  key: canonicalizeIngredientName(label),
  label,
}));

export const COMMON_STAPLE_KEYS: string[] = COMMON_STAPLES.map((s) => s.key);

export function isCommonStapleKey(key: string): boolean {
  return COMMON_STAPLE_KEYS.includes(key);
}

export function commonStapleLabel(key: string): string | undefined {
  return COMMON_STAPLES.find((s) => s.key === key)?.label;
}
