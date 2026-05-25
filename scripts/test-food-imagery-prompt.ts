#!/usr/bin/env tsx
import { buildFoodImageryPrompt, buildFoodImageryPromptSpec } from "../shared/food-imagery/prompt-builder.js";
import { FOOD_IMAGERY_STYLE_VERSION } from "../shared/food-imagery/master-style.js";
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
if (spec.shotPresetId !== "burger") {
  throw new Error(`Expected burger shot preset, got ${spec.shotPresetId}`);
}
if (!prompt.includes(FOOD_IMAGERY_STYLE_VERSION)) {
  throw new Error("Prompt must include style version");
}
if (!prompt.includes("locked preset burger")) {
  throw new Error("Prompt must use locked category shot preset");
}
if (prompt.length < 400) {
  throw new Error("Prompt too short — master style block missing?");
}

import { buildPizzaFoodImageryPrompt, buildPizzaFoodImageryPromptSpec } from "../shared/food-imagery/pizza-prompt-builder.js";
import { getPizzaConceptMeta } from "../shared/pizza-concepts.js";

const pepperoni = getPizzaConceptMeta("hot_honey_pepperoni");
if (!pepperoni) throw new Error("Missing pizza concept");
const pizzaSpec = buildPizzaFoodImageryPromptSpec(pepperoni);
const pizzaPrompt = buildPizzaFoodImageryPrompt(pepperoni);
if (pizzaSpec.shotPresetId !== "pizza") {
  throw new Error("Pizza must use pizza shot preset");
}
if (!pizzaPrompt.toLowerCase().includes("mozzarella")) {
  throw new Error("Pizza prompt missing cheese cue");
}
if (!pizzaPrompt.includes(FOOD_IMAGERY_STYLE_VERSION)) {
  throw new Error("Pizza prompt missing style version");
}

console.log("[test-food-imagery-prompt] OK");
console.log(prompt.slice(0, 320) + "...");
