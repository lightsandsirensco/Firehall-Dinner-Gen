#!/usr/bin/env tsx
import { buildFoodImageryPrompt, buildFoodImageryPromptSpec } from "../shared/food-imagery/prompt-builder.js";
import type { FoodImageryContext } from "../shared/food-imagery/types.js";

const ctx: FoodImageryContext = {
  recipeKey: "smash-burgers",
  title: "Double Smash Burgers with Caramelized Onions & Dirty Sauce",
  cuisine: "American",
  mealFormat: "burger",
  protein: "Beef",
  ingredients: [
    { name: "ground beef" },
    { name: "American cheese" },
    { name: "potato bun" },
  ],
};

const spec = buildFoodImageryPromptSpec(ctx);
const prompt = buildFoodImageryPrompt(ctx);

const lower = prompt.toLowerCase();
if (!lower.includes("burger") && !lower.includes("smash")) {
  throw new Error("Prompt missing burger context");
}
if (!spec.negative.includes("cartoon")) {
  throw new Error("Negative prompt missing cartoon guard");
}
if (prompt.length < 200) {
  throw new Error("Prompt too short");
}

import { buildPizzaFoodImageryPrompt } from "../shared/food-imagery/pizza-prompt-builder.js";
import { getPizzaConceptMeta } from "../shared/pizza-concepts.js";

const pepperoni = getPizzaConceptMeta("hot_honey_pepperoni");
if (!pepperoni) throw new Error("Missing pizza concept");
const pizzaPrompt = buildPizzaFoodImageryPrompt(pepperoni);
if (!pizzaPrompt.toLowerCase().includes("mozzarella")) {
  throw new Error("Pizza prompt missing cheese cue");
}
if (!pizzaPrompt.toLowerCase().includes("crust")) {
  throw new Error("Pizza prompt missing crust cue");
}

console.log("[test-food-imagery-prompt] OK");
console.log(prompt.slice(0, 280) + "...");
