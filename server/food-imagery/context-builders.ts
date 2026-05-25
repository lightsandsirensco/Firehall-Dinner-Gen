import type { GenerateResponse, PizzaResponse } from "../../shared/schema.js";
import type { FoodImageryContext } from "../../shared/food-imagery/types.js";
import { getPizzaConceptMeta } from "../../shared/pizza-concepts.js";
import { buildPizzaImageryContext } from "../../shared/food-imagery/pizza-prompt-builder.js";

export function mealImageryKeyFromSignature(signature: string): string {
  return `meal:sig:${signature.slice(0, 48)}`;
}

export function mealImageryKeyFromId(recipeId: string): string {
  return `meal:id:${recipeId}`;
}

export function pizzaImageryKey(styleId: string): string {
  return `pizza:${styleId}`;
}

export function foodImageryContextFromGenerateResponse(
  recipe: GenerateResponse,
  recipeId: string,
  signature?: string,
): FoodImageryContext {
  const ingredients = (recipe.ingredients || []).map((i) => ({
    name: i.item,
  }));
  return {
    recipeKey: signature ? mealImageryKeyFromSignature(signature) : mealImageryKeyFromId(recipeId),
    title: recipe.title,
    displayTitle: recipe.title,
    summary: recipe.why_it_fits_tonight,
    cuisine: (recipe.tags?.cuisine as string) || "American",
    mealFormat: recipe.meal_style || "plated_main",
    protein: recipe.chosen_protein,
    ingredients,
    tags: recipe.tags ? Object.values(recipe.tags).filter((v) => typeof v === "string") as string[] : [],
    sourceKind: recipe._recipe_source?.kind || recipe._source || "generated",
    heroImage: undefined,
  };
}

export function foodImageryContextFromPizza(recipe: PizzaResponse): FoodImageryContext | null {
  const meta = getPizzaConceptMeta(recipe.pizza_style_id);
  if (!meta) {
    return {
      recipeKey: pizzaImageryKey(recipe.pizza_style_id),
      title: recipe.title,
      displayTitle: recipe.title,
      summary: recipe.why_this_works,
      mealFormat: "pizza",
      protein: "mixed",
      sourceKind: "generated",
    };
  }
  return buildPizzaImageryContext(meta, recipe.title);
}
