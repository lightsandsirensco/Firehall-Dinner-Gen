/**
 * Shared generation reliability rules — titles, ingredients_used, user-facing copy.
 */

import type { GenerateResponse } from "./schema.js";

/** Never expose Zod/validation traces to clients. */
export const GENERATION_USER_RETRY_MESSAGE =
  "Couldn't cook up a good meal right now — trying another one...";

export const GENERATION_USER_FAILURE_MESSAGE =
  "Couldn't cook up a good meal right now — tap Generate to try again.";

/** Shown when Game Day filter could not match but a retry may succeed after broadening. */
export const GENERATION_GAME_DAY_MESSAGE =
  "Game Day picks were tight for that combo — we widened to BBQ and crowd favorites. Tap Pick dinner again.";

export const GENERATION_GAME_DAY_EMPTY_MESSAGE =
  "Nothing in the Game Day lineup matched those filters. Try any protein or fewer restrictions, then pick again.";

const PANTRY_STAPLES =
  /^(salt|pepper|black pepper|water|oil|olive oil|vegetable oil|cooking spray|garlic powder|onion powder|paprika)$/i;

const PROTEIN_ITEM =
  /\b(chicken|beef|pork|turkey|fish|salmon|shrimp|tuna|cod|tilapia|ground beef|steak|sausage|bacon|ham|tofu|tempeh|chickpea|lentil|beans|eggs)\b/i;

const STARCH_ITEM =
  /\b(rice|pasta|noodle|potato|bread|bun|tortilla|wrap|quinoa|couscous|farro|barley|macaroni|spaghetti|penne|fries|naan|pita|flatbread|roll)\b/i;

const SAUCE_OR_VEG =
  /\b(sauce|salsa|glaze|dressing|marinade|broth|stock|tomato|onion|pepper|broccoli|carrot|spinach|kale|lettuce|cabbage|zucchini|mushroom|corn|beans|peas|asparagus|celery)\b/i;

/** Words that read like meal metadata, not something you'd say at the table. */
const METADATA_WORDS =
  /\b(plated\s*main|plated|comfort\s*bowl|comfort|protein\s*skillet|station\s*classic|main\s*course|meal\s*format|template|archetype|one[- ]?pot|sheet\s*pan|stir\s*fry|noodle\s*toss|rice\s*bake|loaded\s*fries|stuffed\s*bread|breakfast[- ]for[- ]dinner)\b/i;

const CUISINE_LEADING =
  /^\s*(asian|mexican|italian|korean|thai|indian|mediterranean|middle\s*eastern|bbq|cajun|canadian|japanese|greek|american)\s+/i;

const FLAVOR_IN_TITLE =
  /\b(sticky|crispy|smoky|garlic|honey|chili|chilli|chipotle|lemon|herb|herbed|bbq|barbecue|buffalo|teriyaki|ginger|sesame|maple|sriracha|chimichurri|firehall|cajun|braised|roasted|grilled|seared|zesty|tangy|spicy|savory|balsamic|mustard|pesto|curry|miso|gochujang|harissa|ranch|parmesan|butter|creamy)\b/i;

/** Metadata / template phrases — never ship these as titles. */
export const ROBOTIC_TITLE_PATTERNS: RegExp[] = [
  /\bplated\s+main\b/i,
  /\bcomfort\s+bowl\b/i,
  /\bprotein\s+skillet\b/i,
  /\bstation\s+classic\b/i,
  /\b(hall|crew|shift)\s+(spread|board|classic)\b/i,
  /\b(beef|chicken|pork|turkey|fish|seafood|vegetarian)\s+(plated|comfort|main|plate)\b/i,
  /\b(asian|mexican|italian|korean|thai|indian)\s+\w+\s+(plated|main|bowl|skillet|plate)\b/i,
  /^\s*protein\s+/i,
  /\bprotein\s+(skillet|bowl|main|plate)\b/i,
];

const BOWL_OK =
  /\b(rice bowl|poke|bibimbap|grain bowl|burrito bowl|power bowl|bbq bowl|teriyaki bowl|garlic bowl|honey bowl|chipotle bowl|sticky\s+garlic)\b/i;

const FLAVOR_FROM_INGREDIENTS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(sticky).*(garlic)|garlic.*(sticky)\b/i, label: "Sticky Garlic" },
  { re: /\bchimichurri\b/i, label: "Chimichurri" },
  { re: /\b(honey).*(chili|chilli)|(chili|chilli).*honey\b/i, label: "Honey Chili" },
  { re: /\b(chipotle|adobo)\b/i, label: "Chipotle" },
  { re: /\b(bbq|barbecue)\b/i, label: "BBQ" },
  { re: /\b(teriyaki)\b/i, label: "Teriyaki" },
  { re: /\b(buffalo)\b/i, label: "Buffalo" },
  { re: /\b(lemon).*(herb|pepper)|herb.*lemon\b/i, label: "Lemon Herb" },
  { re: /\b(garlic)\b/i, label: "Garlic" },
  { re: /\b(honey)\b/i, label: "Honey" },
  { re: /\b(ginger|sesame)\b/i, label: "Ginger Sesame" },
  { re: /\b(cajun|creole)\b/i, label: "Cajun" },
  { re: /\b(pesto)\b/i, label: "Pesto" },
  { re: /\b(maple)\b/i, label: "Maple" },
];

const PROTEIN_LABEL: Record<string, string> = {
  chicken: "Chicken",
  beef: "Beef",
  pork: "Pork",
  turkey: "Turkey",
  fish: "Fish",
  seafood: "Shrimp",
  vegetarian: "Chickpea",
  pantry: "Pantry",
  any: "Chicken",
};

function titleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function hasFlavorAdjective(title: string): boolean {
  return FLAVOR_IN_TITLE.test(title);
}

function inferProteinLabel(protein: string, ingredientText: string): string {
  const p = protein.toLowerCase();
  if (/\b(steak|flank|sirloin|skirt|ribeye|strip)\b/i.test(ingredientText)) return "Steak";
  if (/\b(ground beef|beef mince)\b/i.test(ingredientText)) return "Beef";
  if (/\b(chicken thigh|thighs)\b/i.test(ingredientText)) return "Chicken Thighs";
  if (/\b(chicken breast|breasts)\b/i.test(ingredientText)) return "Chicken";
  if (/\b(salmon|cod|tilapia|halibut)\b/i.test(ingredientText)) return titleCaseWords(p === "fish" ? "Fish" : protein);
  if (/\b(shrimp|prawn)\b/i.test(ingredientText)) return "Shrimp";
  return PROTEIN_LABEL[p] || titleCaseWords(protein);
}

function extractFlavorHint(ingredientText: string, explicit?: string): string {
  if (explicit?.trim()) return titleCaseWords(explicit.trim());
  for (const { re, label } of FLAVOR_FROM_INGREDIENTS) {
    if (re.test(ingredientText)) return label;
  }
  return "";
}

function normalizeMealFormatKey(mealFormat?: string): string {
  const raw = (mealFormat || "bowl").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  const map: Record<string, string> = {
    plated_main: "plated_main",
    plated: "plated_main",
    "plated-main": "plated_main",
    stir_fry: "stir_fry",
    sheet_pan: "sheet_pan",
    one_pot: "one_pot",
    soup_chili: "soup_chili",
    loaded_fries: "loaded_fries",
    wrap: "wrap",
    burrito: "wrap",
  };
  return map[raw] || raw;
}

export function isRoboticTitle(title: string): boolean {
  const t = (title || "").trim();
  if (!t || t.split(/\s+/).length < 2) return true;

  for (const re of ROBOTIC_TITLE_PATTERNS) {
    if (re.test(t)) return true;
  }

  if (METADATA_WORDS.test(t)) return true;

  if (CUISINE_LEADING.test(t) && !hasFlavorAdjective(t)) return true;

  if (/\bbowl\b/i.test(t) && !BOWL_OK.test(t)) {
    if (/\b(chicken|beef|pork|turkey)\s+(comfort|heart|healthy)?\s*bowl\b/i.test(t)) return true;
    if (!hasFlavorAdjective(t) && /\b(chicken|beef|pork|turkey)\s+\w*\s*bowls?\b/i.test(t)) return true;
  }

  if (/\bskillet\b/i.test(t) && !hasFlavorAdjective(t)) return true;

  if (/\b(chicken|beef|pork|turkey|fish)\s+(main|plate|dinner)\s*$/i.test(t) && !hasFlavorAdjective(t)) {
    return true;
  }

  const words = t.split(/\s+/);
  if (words.length <= 3 && !hasFlavorAdjective(t) && METADATA_WORDS.test(t)) return true;

  return false;
}

function classifyIngredientRole(item: string): "protein" | "starch" | "sauce_veg" | "other" {
  const text = item.toLowerCase();
  if (PROTEIN_ITEM.test(text)) return "protein";
  if (STARCH_ITEM.test(text)) return "starch";
  if (SAUCE_OR_VEG.test(text)) return "sauce_veg";
  return "other";
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = (raw || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/**
 * Guarantee a minimum viable ingredients_used set (protein + starch + sauce/veg).
 * Auto-fills from the shopping list when the model left the array empty.
 */
export function normalizeIngredientsUsed(recipe: GenerateResponse): GenerateResponse {
  const existing = dedupeStrings(recipe.ingredients_used || []);
  if (existing.length >= 3) {
    return { ...recipe, ingredients_used: existing };
  }

  const candidates = (recipe.ingredients || [])
    .map((i) => (i.item || "").trim())
    .filter((item) => item.length > 0 && !PANTRY_STAPLES.test(item.split(",")[0].trim()));

  const byRole: Record<string, string[]> = { protein: [], starch: [], sauce_veg: [], other: [] };
  for (const item of candidates) {
    const role = classifyIngredientRole(item);
    if (role === "other") byRole.other.push(item);
    else byRole[role].push(item);
  }

  const picked: string[] = [];
  const take = (arr: string[], n = 1) => {
    for (const x of arr.slice(0, n)) picked.push(x);
  };

  take(byRole.protein, 2);
  take(byRole.starch, 2);
  take(byRole.sauce_veg, 2);
  if (picked.length < 3) take(byRole.other, 4 - picked.length);

  const merged = dedupeStrings([...existing, ...picked]);
  return { ...recipe, ingredients_used: merged.length > 0 ? merged : existing };
}

export function isMinimumViableRecipe(recipe: GenerateResponse): boolean {
  const title = (recipe.title || "").trim();
  const steps = recipe.steps || [];
  const ingredients = recipe.ingredients || [];
  const used = recipe.ingredients_used || [];

  if (!title || title.length < 4) return false;
  if (steps.length < 2) return false;
  if (ingredients.length < 4) return false;
  if (isRoboticTitle(title)) return false;

  const roles = new Set<string>();
  for (const u of used.length > 0 ? used : ingredients.map((i) => i.item)) {
    roles.add(classifyIngredientRole(u));
  }
  const hasProtein = roles.has("protein");
  const hasStarch = roles.has("starch");
  const hasSauceVeg = roles.has("sauce_veg");
  return hasProtein && (hasStarch || hasSauceVeg);
}

export interface HumanTitleOptions {
  protein: string;
  mealFormat?: string;
  flavorHint?: string;
  fallbackTitle?: string;
  ingredients?: Array<{ item?: string; notes?: string }>;
  cuisine?: string;
}

/** Build a title that sounds like a real meal — never metadata labels. */
export function suggestHumanMealTitle(opts: HumanTitleOptions): string {
  const { protein, mealFormat, flavorHint, fallbackTitle, ingredients, cuisine } = opts;
  if (fallbackTitle?.trim() && !isRoboticTitle(fallbackTitle)) {
    return fallbackTitle.trim();
  }

  const ingredientText = (ingredients || [])
    .map((i) => `${i.item || ""} ${i.notes || ""}`)
    .join(" ");
  const flavor = extractFlavorHint(ingredientText, flavorHint);
  const proteinLabel = inferProteinLabel(protein, ingredientText);
  const fmt = normalizeMealFormatKey(mealFormat);

  const templates: string[] = [];

  switch (fmt) {
    case "bowl":
      templates.push(
        flavor ? `${flavor} ${proteinLabel} Bowls` : `Smoky ${proteinLabel} Bowls`,
        flavor ? `Loaded ${flavor} ${proteinLabel} Bowls` : `Firehall ${proteinLabel} Bowls`,
      );
      break;
    case "tacos":
      templates.push(
        flavor ? `${flavor} ${proteinLabel} Tacos` : `Street-Style ${proteinLabel} Tacos`,
        `Firehall ${proteinLabel} Tacos`,
      );
      break;
    case "sandwich":
    case "burger":
      templates.push(
        `Firehall ${proteinLabel} ${fmt === "burger" ? "Burgers" : "Sandwiches"}`,
        flavor ? `${flavor} ${proteinLabel} ${fmt === "burger" ? "Burgers" : "Sandwiches"}` : `Crispy ${proteinLabel} Sandwiches`,
      );
      break;
    case "wrap":
      templates.push(
        flavor ? `${flavor} ${proteinLabel} Wraps` : `Loaded ${proteinLabel} Wraps`,
        `Firehall ${proteinLabel} Wraps`,
      );
      break;
    case "pasta":
      templates.push(
        flavor ? `${flavor} ${proteinLabel} Pasta` : `${proteinLabel} Pasta Night`,
        `Firehall ${proteinLabel} Pasta`,
      );
      break;
    case "skillet":
      templates.push(
        flavor ? `${flavor} ${proteinLabel} Skillet` : `Garlic Butter ${proteinLabel} Skillet`,
        `One-Pan ${proteinLabel} Skillet`,
      );
      break;
    case "stir_fry":
      templates.push(
        flavor ? `${flavor} ${proteinLabel} Stir-Fry` : `Ginger Sesame ${proteinLabel} Stir-Fry`,
      );
      break;
    case "grill":
    case "plated_main":
      templates.push(
        flavor ? `Seared ${flavor} ${proteinLabel}` : `Firehall ${proteinLabel} Plates`,
        flavor ? `${flavor} ${proteinLabel} Dinner` : `Roasted ${proteinLabel} Dinner`,
      );
      break;
    case "soup_chili":
    case "stew":
      templates.push(
        flavor ? `${flavor} ${proteinLabel} Chili` : `Hearty ${proteinLabel} Chili`,
        `${proteinLabel} & Bean Stew`,
      );
      break;
    default:
      templates.push(
        flavor ? `Crispy ${flavor} ${proteinLabel}` : `Crispy Honey Chili ${proteinLabel}`,
        flavor ? `${flavor} ${proteinLabel}` : `Firehall ${proteinLabel} Dinner`,
        `Sticky Garlic ${proteinLabel}`,
      );
  }

  if (cuisine && !CUISINE_LEADING.test(templates[0] || "")) {
    const c = titleCaseWords(cuisine.replace(/_/g, " "));
    if (flavor && fmt === "bowl") templates.unshift(`${c} ${flavor} ${proteinLabel} Bowls`);
  }

  for (const c of templates) {
    const trimmed = c.replace(/\s+/g, " ").trim();
    if (trimmed.length >= 8 && !isRoboticTitle(trimmed)) return trimmed;
  }

  return `Firehall ${proteinLabel} Dinner`;
}

/** Repair title on a full recipe using ingredients + format. */
export function repairRecipeTitle(
  recipe: GenerateResponse,
  mealFormat?: string,
): GenerateResponse {
  const title = recipe.title || "";
  if (!isRoboticTitle(title)) return recipe;

  const protein = (recipe.chosen_protein || "chicken").toLowerCase();
  return {
    ...recipe,
    title: suggestHumanMealTitle({
      protein,
      mealFormat: mealFormat || recipe.meal_style,
      fallbackTitle: title,
      ingredients: recipe.ingredients,
      cuisine: recipe.tags?.cuisine,
    }),
  };
}
