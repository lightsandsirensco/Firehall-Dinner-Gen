/**
 * Small shared helpers for recipe normalization.
 */

import type { INGREDIENT_CATEGORIES } from "./constants.js";

const PROTEIN_RE =
  /\b(chicken|beef|pork|turkey|fish|salmon|shrimp|sausage|bacon|tofu|steak|ground)\b/i;
const PRODUCE_RE =
  /\b(onion|garlic|pepper|tomato|lettuce|spinach|broccoli|carrot|celery|mushroom|lime|lemon|herb|cilantro)\b/i;
const DAIRY_RE = /\b(cheese|milk|cream|butter|yogurt|sour cream|parmesan)\b/i;
const STARCH_RE = /\b(rice|pasta|noodle|potato|bread|bun|tortilla|wrap|quinoa|couscous)\b/i;
const SAUCE_RE = /\b(sauce|salsa|broth|stock|marinade|dressing|glaze)\b/i;
const SPICE_RE = /\b(salt|pepper|paprika|cumin|oregano|chili|spice|seasoning)\b/i;

export function inferIngredientCategory(
  name: string,
): (typeof INGREDIENT_CATEGORIES)[number] {
  const n = name.toLowerCase();
  if (PROTEIN_RE.test(n)) return "protein";
  if (STARCH_RE.test(n)) return "starch";
  if (PRODUCE_RE.test(n)) return "produce";
  if (DAIRY_RE.test(n)) return "dairy";
  if (SAUCE_RE.test(n)) return "sauce";
  if (SPICE_RE.test(n)) return "spice";
  return "other";
}
