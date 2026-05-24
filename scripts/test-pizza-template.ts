#!/usr/bin/env tsx
import { buildPizzaTemplate } from "../server/pizza-templates.js";
import { finalizePizzaRecipe } from "../server/pizza-finalize.js";

const req = {
  crew_size: 6,
  time_available: "45-60" as const,
  dough_option: "premade" as const,
  style_preference: "classic" as const,
  heat_level: "medium" as const,
  allergens_to_avoid: [] as string[],
  vegetarian_swap_needed: false,
};

const r = finalizePizzaRecipe(buildPizzaTemplate("buffalo_chicken", req), req, "buffalo_chicken", "template");
console.log("OK", r.title, "steps", r.build_steps.length, "sauce", r.ingredients.sauce.length);
