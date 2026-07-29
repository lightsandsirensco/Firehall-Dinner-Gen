/**
 * Classifies a recipe's meal role so nutrition sanity rules (like "calories under 250 is
 * suspicious for a full meal") only apply to dishes that are actually meant to be a full
 * serving — not sides, sauces, salads, garnishes, or shareable snack boards.
 */
export type MealRole = "entree" | "breakfast" | "smoothie" | "side" | "condiment" | "appetizer";

/** Format tags used by the bbq collection that explicitly mark a non-entree item. */
const SIDE_FORMAT_TAGS = new Set([
  "format:side",
  "format:brassica_tray",
  "format:ranch_spud_tray",
  "format:street_cup",
  "format:stone_fruit_salad",
  "format:antipasto_tray",
]);

/** Unambiguous side/condiment/appetizer words — deliberately narrow to avoid misclassifying
 *  protein-forward entrees that happen to be plated as a "board" or "platter" (e.g. a lamb
 *  chop grill board is still an entree; a charcuterie board is not). */
const SIDE_TITLE_KEYWORDS = [
  "salad",
  "slaw",
  "coleslaw",
  "dressing",
  "vinaigrette",
  "salsa",
  "chutney",
  "charcuterie",
  "antipasto",
  "esquites",
  "elote cup",
  "elote cups",
  "street cup",
  "street cups",
  "baked beans",
  "mac and cheese",
  "potato salad",
];

interface MealRoleInput {
  title?: string;
  subtitle?: string;
  shortDescription?: string;
  tags?: string[];
  mealType?: "dinner" | "breakfast" | "smoothie" | string;
}

export function classifyMealRole(page: MealRoleInput): MealRole {
  if (page.mealType === "smoothie") return "smoothie";
  if (page.mealType === "breakfast") return "breakfast";

  const tags = (page.tags ?? []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => SIDE_FORMAT_TAGS.has(t))) return "side";

  const haystack = `${page.title ?? ""} ${page.subtitle ?? ""} ${page.shortDescription ?? ""}`.toLowerCase();
  if (SIDE_TITLE_KEYWORDS.some((k) => haystack.includes(k))) return "side";

  return "entree";
}

/** Only entrees/breakfasts/lunches/dinners are subject to the "under 250 cal for a full meal"
 *  sanity check — sides, sauces, salads, condiments, and appetizer boards are exempt. */
export function isFullMealRole(role: MealRole): boolean {
  return role === "entree" || role === "breakfast";
}
