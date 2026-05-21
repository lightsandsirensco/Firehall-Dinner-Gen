import type { ClientRecipeResponse, MealPlate, MealPlateLine } from "@shared/schema";
import {
  classifyComponentRole,
  isSeasoningOrGarnish,
  isValidPlateSide,
} from "@shared/meal-semantics";

const STARCH = /\b(rice|potato|pasta|bread|bun|naan|noodle|fries|wedge|quinoa|macaroni)\b/i;
const VEG = /\b(broccoli|bean|salad|slaw|corn|carrot|spinach|kale|cucumber|vegetable|greens|bell pepper)\b/i;
const PROTEIN = /\b(chicken|beef|pork|turkey|sausage|shrimp|salmon|fish|steak|thigh|breast)\b/i;

function inferRole(name: string, category: string, title = ""): MealPlateLine["role"] {
  if (isSeasoningOrGarnish(name)) return "optional";
  const semantic = classifyComponentRole(name, `category: ${category}`, title);
  if (semantic === "bread_base" || semantic === "starch_side") return "starch";
  if (semantic === "veg_side" && isValidPlateSide(name)) return "veg";
  if (semantic === "main_protein") return "main";
  if (semantic === "optional_extra" || semantic === "sauce") return "optional";
  const c = category.toLowerCase();
  if (c === "protein") return "main";
  if (c === "grain" || c === "bread") return "starch";
  if (c === "produce" && isValidPlateSide(name)) return "veg";
  if (STARCH.test(name) && !PROTEIN.test(name)) return "starch";
  if (VEG.test(name) && !PROTEIN.test(name) && isValidPlateSide(name)) return "veg";
  if (PROTEIN.test(name)) return "main";
  return "main";
}

/** Client fallback when API omits meal_plate (cached older responses). */
export function resolveMealPlate(recipe: ClientRecipeResponse): MealPlate | null {
  if (recipe.meal_plate?.main?.length) return recipe.meal_plate;

  const main: MealPlateLine[] = [];
  const sides: MealPlateLine[] = [];
  const optional: MealPlateLine[] = [];

  const title = recipe.title || "";
  for (const ing of recipe.ingredients || []) {
    if (isSeasoningOrGarnish(ing.name)) continue;
    const line: MealPlateLine = {
      name: ing.name,
      amount: ing.qty > 0 || ing.unit ? `${ing.qty ? ing.qty : ""} ${ing.unit}`.trim() : "",
      role: inferRole(ing.name, ing.category || "", title),
    };
    if (line.role === "starch" || (line.role === "veg" && isValidPlateSide(ing.name))) sides.push(line);
    else if (line.role === "optional") optional.push(line);
    else main.push(line);
  }

  if (main.length === 0 && sides.length === 0) return null;

  return {
    display_title: recipe.title,
    main: main.slice(0, 4),
    sides: sides.slice(0, 5),
    optional: optional.slice(0, 4),
    cuisine_label: recipe.recipe_tags?.cuisine,
  };
}
