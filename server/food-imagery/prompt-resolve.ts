import { buildFoodImageryPrompt } from "../../shared/food-imagery/prompt-builder.js";
import { buildPizzaFoodImageryPrompt } from "../../shared/food-imagery/pizza-prompt-builder.js";
import { getPizzaConceptMeta } from "../../shared/pizza-concepts.js";
import type { FoodImageryContext } from "../../shared/food-imagery/types.js";

export function buildPromptForContext(ctx: FoodImageryContext): string {
  if (ctx.recipeKey.startsWith("pizza:") || ctx.mealFormat === "pizza") {
    const styleId = ctx.recipeKey.replace(/^pizza:/, "");
    const meta = getPizzaConceptMeta(styleId);
    if (meta) return buildPizzaFoodImageryPrompt(meta, ctx.title);
  }
  return buildFoodImageryPrompt(ctx);
}
