#!/usr/bin/env tsx
/**
 * CI guard — every meal format maps to a locked shot preset; master style is embedded in prompts.
 */
import { FOOD_IMAGERY_STYLE_VERSION } from "../shared/food-imagery/master-style.js";
import { MEAL_SHOT_PRESETS } from "../shared/food-imagery/shot-presets.js";
import { inferMealShotCategory } from "../shared/food-imagery/shot-presets.js";
import { buildFoodImageryPrompt, buildFoodImageryPromptSpec } from "../shared/food-imagery/prompt-builder.js";
import { buildMasterNegativePrompt } from "../shared/food-imagery/negative-prompt.js";
import type { FoodImageryContext } from "../shared/food-imagery/types.js";

const formats = Object.keys(MEAL_SHOT_PRESETS);
for (const fmt of formats) {
  const cat = inferMealShotCategory(fmt, `test ${fmt} dish`);
  if (cat !== fmt && fmt !== "plated_main") {
    // infer may map synonyms; ensure preset exists
  }
  if (!MEAL_SHOT_PRESETS[cat]) {
    throw new Error(`Missing shot preset for format ${fmt} -> ${cat}`);
  }
}

const ctx: FoodImageryContext = {
  recipeKey: "curated:smash-burgers",
  title: "Double Smash Burgers",
  mealFormat: "burger",
  protein: "Beef",
  cuisine: "American",
};

const spec = buildFoodImageryPromptSpec(ctx);
const prompt = buildFoodImageryPrompt(ctx);

if (spec.styleVersion !== FOOD_IMAGERY_STYLE_VERSION) {
  throw new Error("Spec styleVersion mismatch");
}
if (spec.shotPresetId !== "burger") {
  throw new Error(`Expected burger preset, got ${spec.shotPresetId}`);
}
if (!prompt.includes(FOOD_IMAGERY_STYLE_VERSION)) {
  throw new Error("Prompt must embed style version for cache busting");
}
if (!prompt.includes("warm key light")) {
  throw new Error("Prompt missing master lighting block");
}
if (!prompt.includes("active Canadian firehall kitchen")) {
  throw new Error("Prompt missing global firehall kitchen photo standard");
}
if (!prompt.includes("Camera angle (locked preset burger)")) {
  throw new Error("Prompt missing locked shot preset");
}

const neg = buildMasterNegativePrompt();
for (const term of ["floating ingredients", "plastic-looking cheese", "cartoon"]) {
  if (!neg.includes(term)) {
    throw new Error(`Negative prompt missing: ${term}`);
  }
}

console.log("[validate-food-imagery-style] OK", {
  styleVersion: FOOD_IMAGERY_STYLE_VERSION,
  shotPreset: spec.shotPresetId,
  promptLength: prompt.length,
});
