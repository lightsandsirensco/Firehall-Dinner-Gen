/**
 * Shared culinary semantics — ingredient roles, meal identity, and seasoning detection.
 * Used by server validation, plate building, and client shopping lists.
 */

export type ComponentRole =
  | "main_protein"
  | "bread_base"
  | "starch_side"
  | "veg_side"
  | "sauce"
  | "seasoning"
  | "garnish"
  | "optional_extra"
  | "unknown";

export type MealIdentity =
  | "french_dip"
  | "burger"
  | "sandwich"
  | "taco"
  | "wrap"
  | "pasta"
  | "bowl"
  | "stir_fry"
  | "indian_curry"
  | "soup_stew"
  | "plated_main"
  | "generic";

/** Spices, dried herbs, salt — never plate as a "side". */
export const SEASONING_PATTERN =
  /\b(salt|black pepper|white pepper|ground pepper|cracked pepper|pepper flake|red pepper flakes?|paprika|cumin|oregano|thyme|garlic powder|onion powder|chili powder|italian seasoning|cayenne|turmeric|coriander|nutmeg|cinnamon|garam masala|curry powder|bay leaf|mustard powder|allspice|cardamom|clove|gochugaru|smoked paprika|dried basil|dried oregano|dried thyme|dried parsley|seasoning blend|taco seasoning|cajun seasoning|old bay|msg)\b/i;

/** Fresh peppers / veg — not the same as ground pepper. */
export const FRESH_PEPPER_VEG_PATTERN =
  /\b(bell pepper|green pepper|red pepper|yellow pepper|jalape|jalapeño|poblano|serrano|habanero|banana pepper|roasted pepper)\b/i;

export const BREAD_BASE_PATTERN =
  /\b(bun|buns|burger bun|brioche bun|hoagie roll|sub roll|french roll|dinner roll|roll|rolls|baguette|ciabatta|bread|flatbread|pita|naan|tortilla|taco shell|corn tortilla|flour tortilla|wrap|lavash|english muffin|croissant)\b/i;

export const STARCH_SIDE_PATTERN =
  /\b(rice|jasmine|basmati|pasta|spaghetti|penne|noodle|udon|soba|potato|potatoes|fries|wedge|wedges|quinoa|couscous|macaroni|linguine|cornbread|hash brown|farro|barley|orzo|mac and cheese)\b/i;

export const VEG_SIDE_PATTERN =
  /\b(broccoli|green bean|asparagus|salad|lettuce|spinach|kale|carrot|zucchini|squash|corn on the cob|coleslaw|slaw|cucumber|tomato|mixed greens|caesar|vegetable|veg\b|peas|cauliflower|brussels|edamame|bok choy|green beans)\b/i;

export const PROTEIN_PATTERN =
  /\b(chicken|beef|pork|turkey|sausage|shrimp|salmon|fish|cod|tuna|steak|ground beef|bacon|ham|thigh|breast|drumstick|pulled pork|meatball|roast beef|brisket|ribeye|sirloin)\b/i;

export const SAUCE_PATTERN =
  /\b(sauce|dressing|raita|yogurt|pickle|kimchi|salsa|guacamole|aioli|gravy|au jus|jus|dip|marinara|pesto|tzatziki|chimichurri|bbq sauce|teriyaki|hoisin)\b/i;

export const GARNISH_PATTERN =
  /\b(lime wedge|lemon wedge|cilantro garnish|parsley garnish|sesame seeds|green onion garnish|chopped parsley for garnish)\b/i;

export function isSeasoningOrGarnish(name: string, notes = ""): boolean {
  const text = `${name} ${notes}`.toLowerCase().trim();
  if (GARNISH_PATTERN.test(text)) return true;
  if (SEASONING_PATTERN.test(text)) return true;
  if (/^pepper$|^salt$|^spice$/.test(text)) return true;
  if (/\b(black pepper|white pepper|ground pepper|cracked pepper|pepper flake)\b/.test(text)) return true;
  if (/\bpepper\b/.test(text) && !FRESH_PEPPER_VEG_PATTERN.test(text)) return true;
  if (/pantry staple|not a plate/i.test(notes)) return true;
  return false;
}

export function isValidPlateSide(name: string, notes = ""): boolean {
  if (isSeasoningOrGarnish(name, notes)) return false;
  const text = `${name} ${notes}`;
  if (BREAD_BASE_PATTERN.test(text) && !PROTEIN_PATTERN.test(text)) return true;
  if (STARCH_SIDE_PATTERN.test(text) && !PROTEIN_PATTERN.test(text)) return true;
  if (VEG_SIDE_PATTERN.test(text) && !PROTEIN_PATTERN.test(text)) return true;
  return false;
}

export function classifyComponentRole(item: string, notes = "", mealTitle = ""): ComponentRole {
  const text = `${item} ${notes}`.toLowerCase();
  const title = (mealTitle || "").toLowerCase();

  if (/plate_role:\s*(\w+)/i.test(notes)) {
    const m = notes.match(/plate_role:\s*(\w+)/i);
    const role = (m?.[1] || "").toLowerCase();
    if (role === "starch" || role === "bread") return "bread_base";
    if (role === "veg") return "veg_side";
    if (role === "optional") return "optional_extra";
    if (role === "main") return "main_protein";
  }

  if (/station side — starch|bowl base|bread_base|required — bread/i.test(notes)) {
    if (BREAD_BASE_PATTERN.test(text)) return "bread_base";
    return "starch_side";
  }
  if (/station side — veg|plate_role:\s*veg/i.test(notes)) return "veg_side";
  if (/station extra|optional/i.test(notes)) return "optional_extra";

  if (isSeasoningOrGarnish(item, notes)) return "seasoning";
  if (SAUCE_PATTERN.test(text) && !PROTEIN_PATTERN.test(text)) return "sauce";
  if (BREAD_BASE_PATTERN.test(text) && !PROTEIN_PATTERN.test(text)) {
    if (/sandwich|burger|taco|wrap|dip|sub|hoagie/i.test(title)) return "bread_base";
    return /\b(naan|pita|garlic bread|roll|bun)\b/i.test(text) ? "bread_base" : "optional_extra";
  }
  if (STARCH_SIDE_PATTERN.test(text) && !PROTEIN_PATTERN.test(text)) return "starch_side";
  if (VEG_SIDE_PATTERN.test(text) && !PROTEIN_PATTERN.test(text)) return "veg_side";
  if (PROTEIN_PATTERN.test(text)) return "main_protein";

  return "unknown";
}

export function detectMealIdentity(title: string, mealFormat: string): MealIdentity {
  const t = (title || "").toLowerCase();
  const fmt = (mealFormat || "").toLowerCase().replace(/_/g, "-");

  if (/\bfrench dip\b/i.test(t)) return "french_dip";
  if (/\b(butter chicken|tikka masala|chicken tikka|paneer|dal makhani|biryani)\b/i.test(t)) return "indian_curry";
  if (/\b(burger|sliders)\b/i.test(t) || fmt === "burger") return "burger";
  if (/\b(taco|tostada|enchilada|burrito|quesadilla|fajita)\b/i.test(t) || fmt === "tacos") return "taco";
  if (/\b(wrap|burrito bowl)\b/i.test(t) || fmt === "wrap") return "wrap";
  if (/\b(sandwich|sub|hoagie|melt|po'boy|poboy|reuben|panini|club)\b/i.test(t) || fmt === "sandwich") return "sandwich";
  if (/\b(pasta|spaghetti|penne|lasagna|linguine|fettuccine|macaroni|alfredo|carbonara)\b/i.test(t) || fmt === "pasta") return "pasta";
  if (/\b(stir fry|stir-fry|fried rice)\b/i.test(t) || fmt === "stir-fry" || fmt === "stir_fry") return "stir_fry";
  if (/\b(bowl|bibimbap|donburi)\b/i.test(t) || fmt === "bowl") return "bowl";
  if (/\b(soup|chili|stew|chowder|gumbo)\b/i.test(t) || fmt.includes("soup") || fmt.includes("stew")) return "soup_stew";
  if (fmt === "burger") return "burger";
  if (fmt === "sandwich") return "sandwich";
  if (fmt === "pasta") return "pasta";
  if (fmt === "bowl") return "bowl";
  if (fmt === "stir-fry" || fmt === "stir_fry") return "stir_fry";

  return "plated_main";
}

export interface RequiredComponent {
  id: string;
  label: string;
  pattern: RegExp;
}

export function getRequiredComponents(identity: MealIdentity): RequiredComponent[] {
  switch (identity) {
    case "french_dip":
      return [
        { id: "rolls", label: "Hoagie or French rolls", pattern: BREAD_BASE_PATTERN },
        { id: "au_jus", label: "Au jus / dipping broth", pattern: /\b(au jus|beef broth|consomme|jus|dipping broth|onion soup mix)\b/i },
      ];
    case "burger":
      return [{ id: "buns", label: "Burger buns", pattern: /\b(burger bun|brioche bun|bun|buns)\b/i }];
    case "sandwich":
      return [{ id: "bread", label: "Sandwich bread or rolls", pattern: BREAD_BASE_PATTERN }];
    case "taco":
      return [{ id: "tortillas", label: "Tortillas or taco shells", pattern: /\b(tortilla|taco shell)\b/i }];
    case "wrap":
      return [{ id: "wraps", label: "Tortillas or wraps", pattern: /\b(tortilla|wrap|lavash|flatbread)\b/i }];
    case "pasta":
      return [{ id: "pasta", label: "Pasta or noodles", pattern: /\b(pasta|spaghetti|penne|linguine|fettuccine|noodle|macaroni|rigatoni)\b/i }];
    case "bowl":
    case "stir_fry":
      return [{ id: "base", label: "Rice or bowl base", pattern: /\b(rice|jasmine|basmati|quinoa|noodle|greens|mixed greens)\b/i }];
    case "indian_curry":
      return [
        { id: "rice_or_naan", label: "Rice or naan", pattern: /\b(rice|basmati|jasmine|naan|roti)\b/i },
      ];
    default:
      return [];
  }
}

export function ingredientsMatchPattern(
  ingredients: { item: string; notes?: string }[],
  pattern: RegExp,
): boolean {
  return ingredients.some((i) => pattern.test(`${i.item} ${i.notes || ""}`));
}

/** Client shopping aisle — maps semantic role to store section. */
export function inferShoppingCategory(name: string, notes = ""): string {
  const role = classifyComponentRole(name, notes);
  if (role === "seasoning") return "Pantry & Spices";
  if (role === "main_protein") return "Proteins";
  if (role === "bread_base") return "Bakery / Dough";
  if (role === "sauce") return "Condiments & Sauces";
  if (role === "starch_side") {
    const lower = name.toLowerCase();
    if (/\b(rice|pasta|noodle|quinoa|couscous)\b/i.test(lower)) return "Pantry & Spices";
    if (/\b(potato|fries|wedge)\b/i.test(lower)) return "Produce";
    return "Pantry & Spices";
  }
  if (role === "veg_side") return "Produce";
  if (role === "optional_extra") {
    if (BREAD_BASE_PATTERN.test(name)) return "Bakery / Dough";
    if (SAUCE_PATTERN.test(name)) return "Condiments & Sauces";
    return "Other";
  }

  const lower = name.toLowerCase();
  if (PROTEIN_PATTERN.test(lower)) return "Proteins";
  if (BREAD_BASE_PATTERN.test(lower)) return "Bakery / Dough";
  if (/\b(cheese|milk|butter|cream|yogurt)\b/i.test(lower)) return "Dairy / Dairy Alternatives";
  if (VEG_SIDE_PATTERN.test(lower)) return "Produce";
  if (SEASONING_PATTERN.test(lower)) return "Pantry & Spices";
  if (SAUCE_PATTERN.test(lower)) return "Condiments & Sauces";
  return "Other";
}

export function isRequiredForMeal(notes: string): boolean {
  return /required\s*—|required for|plate_role:\s*(starch|bread|veg)/i.test(notes || "");
}
