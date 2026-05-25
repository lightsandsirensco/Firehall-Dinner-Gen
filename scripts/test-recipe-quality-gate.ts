/**
 * Quality gate + format contract sanity tests.
 */
import {
  runRecipeQualityGate,
  applyQualityTitleFix,
} from "../shared/recipe-quality-gate.js";
import { titleMatchesIngredients } from "../shared/meal-format-contract.js";
import type { GenerateResponse } from "../shared/schema.js";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const badTaco: GenerateResponse = {
  title: "Chicken Tacos with Rice",
  meal_style: "tacos",
  servings: 6,
  chosen_protein: "chicken",
  ingredients: [
    { item: "Chicken breast", amount: "2 lb", notes: "" },
    { item: "Jasmine rice", amount: "2 cups", notes: "" },
  ],
  steps: [{ heading: "Cook", body: "Cook chicken until done." }],
  tags: { cuisine: "Mexican", meal_format: "tacos", base_carb: "rice" },
  timing: { prep_minutes: 10, cook_minutes: 20, total_minutes: 30 },
  macros_per_serving: { calories: 400, protein_g: 30, carbs_g: 40, fat_g: 10 },
};

const gate = runRecipeQualityGate(badTaco, {
  mealFormat: "tacos",
  identity: "taco",
  protein: "chicken",
});
assert(!gate.pass, "taco + rice should fail gate");
assert(gate.issues.length > 0, "should have issues");

const fixed = applyQualityTitleFix(badTaco, "tacos");
assert(!/\btaco/i.test(fixed.title), "title fix should remove taco label");
assert(titleMatchesIngredients(fixed.title, fixed.ingredients || []).ok, "fixed title ok");

const goodBowl: GenerateResponse = {
  title: "Smoky Chipotle Chicken Bowls",
  meal_style: "bowl",
  servings: 6,
  chosen_protein: "chicken",
  ingredients: [
    { item: "Chicken thighs", amount: "2 lb", notes: "" },
    { item: "Jasmine rice", amount: "2 cups", notes: "" },
    { item: "Chipotle powder", amount: "1 tbsp", notes: "" },
  ],
  steps: [
    {
      heading: "Sear chicken (medium-high, 6 min)",
      body: "Pat chicken dry and sear in a hot oiled skillet 5–6 minutes per side until golden and 165°F inside.",
    },
  ],
  tags: { cuisine: "Mexican", meal_format: "bowl", base_carb: "rice" },
  timing: { prep_minutes: 15, cook_minutes: 25, total_minutes: 40 },
  macros_per_serving: { calories: 500, protein_g: 35, carbs_g: 45, fat_g: 12 },
};

const goodGate = runRecipeQualityGate(goodBowl, {
  mealFormat: "bowl",
  identity: "bowl",
  protein: "chicken",
});
assert(goodGate.score >= 50, "reasonable bowl should score ok");

console.log("[test-recipe-quality-gate] OK");
