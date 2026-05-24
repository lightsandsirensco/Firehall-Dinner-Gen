#!/usr/bin/env tsx
import "dotenv/config";
import { generatePizzaRecipe } from "../server/pizza-ai.js";

const req = {
  crew_size: 6,
  time_available: "45-60" as const,
  dough_option: "premade" as const,
  style_preference: "classic" as const,
  heat_level: "medium" as const,
  allergens_to_avoid: [] as string[],
  vegetarian_swap_needed: false,
};

const t0 = Date.now();
const r = await generatePizzaRecipe(req, "bbq_chicken");
console.log("done", Date.now() - t0, "ms", r.recipe.title, "template?", r.fromTemplate);
console.log("sauce:", r.recipe.ingredients.sauce.map((i) => i.item).join(", "));
console.log("steps:", r.recipe.build_steps.length);
