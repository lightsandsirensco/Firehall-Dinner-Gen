#!/usr/bin/env tsx
import assert from "node:assert/strict";
import {
  calculateNutritionFromIngredients,
  hasCompleteNutrition,
  validateNutritionPerServing,
} from "../shared/nutrition/index.js";

const chili = calculateNutritionFromIngredients(
  [
    { name: "Ground beef (80/20)", quantity: "3.5", unit: "lb" },
    { name: "Kidney beans, drained", quantity: "3", unit: "cans" },
    { name: "Yellow onion", quantity: "3", unit: "large" },
    { name: "Crushed tomatoes", quantity: "2", unit: "cans" },
  ],
  { servings: 8, mealType: "dinner" },
);

assert.ok(chili.calories >= 450 && chili.calories <= 900, `chili calories ${chili.calories}`);
assert.ok(chili.protein >= 25, `chili protein ${chili.protein}`);
assert.equal(hasCompleteNutrition(chili), true);

const smoothie = calculateNutritionFromIngredients(
  [
    { name: "frozen mixed berries", quantity: "4", unit: "cups" },
    { name: "plain Greek yogurt", quantity: "2", unit: "cups" },
    { name: "banana", quantity: "2", unit: "count" },
  ],
  { servings: 8, mealType: "smoothie" },
);

assert.ok(smoothie.calories >= 120 && smoothie.calories <= 450, `smoothie calories ${smoothie.calories}`);
assert.equal(validateNutritionPerServing({ calories: -1, protein: 10, carbs: 10, fat: 5 }).some((i) => i.code === "negative"), true);

console.log("[test-recipe-nutrition] OK");
