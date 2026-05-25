/**
 * Smoke test: meal instruction engine produces valid, ingredient-coupled steps.
 */
import { buildMealInstructionSteps, buildMealInstructionContext } from "../server/meal-instructions.js";
import { validateMealSteps } from "../shared/meal-step-validation.js";
import type { GenerateResponse } from "../shared/schema.js";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const burgerRecipe: GenerateResponse = {
  title: "Hall Cheeseburgers",
  meal_style: "burger",
  servings: 6,
  timing: { prep_minutes: 10, cook_minutes: 25, total_minutes: 35 },
  ingredients: [
    { item: "Ground beef", amount: "2 lb", notes: "" },
    { item: "Burger buns", amount: "6", notes: "" },
    { item: "Cheddar cheese", amount: "6 slices", notes: "" },
    { item: "Frozen french fries", amount: "2 lb", notes: "Station side" },
  ],
  steps: [
    { heading: "Simmer the pot", body: "Bring the mixture to a gentle bubble for 20 minutes." },
  ],
  tags: { cuisine: "american", meal_format: "burger", base_carb: "fries" },
  chosen_protein: "beef",
  primary_protein_source: "beef",
  macros_per_serving: { calories: 500, protein_g: 30, carbs_g: 40, fat_g: 22 },
};

const ctx = buildMealInstructionContext(burgerRecipe, "burger");
const steps = buildMealInstructionSteps(ctx);
const combined = steps.map((s) => `${s.heading} ${s.body}`).join(" ");

assert(!/gentle bubble/i.test(combined), "burger should not contain soup filler");
assert(/\b(burger|patty|patties|grill|sear)\b/i.test(combined), "burger steps must cook burgers");
assert(/\bGround beef\b/i.test(combined), "must reference ground beef");
assert(/\bBurger buns\b/i.test(combined), "must reference buns");

const val = validateMealSteps(steps, burgerRecipe.ingredients, {
  title: burgerRecipe.title,
  identity: ctx.identity,
  mealFormat: "burger",
  protein: "beef",
  totalMinutes: 35,
  crewSize: 6,
});

assert(val.ok, `validation failed: ${val.errors.join("; ")}`);

console.log("[test-meal-instructions] OK", steps.length, "steps");
