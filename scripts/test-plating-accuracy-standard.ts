#!/usr/bin/env tsx
/**
 * Plating Accuracy Standard — unit tests for prompts, negatives, and metadata audit.
 */
import assert from "node:assert/strict";
import {
  auditPlatingAccuracyMetadata,
  buildPlatingAccuracyNegativeHints,
  buildPlatingAccuracyPromptLines,
  isBreakfastTitle,
  isCurryRiceDishTitle,
  PLATING_ACCURACY_MAIN_RULE,
  getPlatingAccuracyVisionRubric,
} from "../shared/plating-accuracy-standard.js";
import { buildFullPlatingPromptLine, inferPlatingType } from "../shared/plating-type.js";
import { buildFoodImageryPrompt } from "../shared/food-imagery/prompt-builder.js";
import type { FoodImageryContext } from "../shared/food-imagery/types.js";

assert.ok(isBreakfastTitle("Hall Breakfast Plate with Pancakes"));
assert.ok(isCurryRiceDishTitle("Jerk Chicken & Peas and Rice"));
assert.equal(inferPlatingType("Butter Chicken"), "rice_plate");

const jerkLines = buildPlatingAccuracyPromptLines("Jerk Chicken & Peas and Rice");
assert.ok(jerkLines.some((l) => /rice must be clearly visible/i.test(l)), "curry rice rule present");

const breakfastNeg = buildPlatingAccuracyNegativeHints("Bacon and Eggs with Hash Browns");
assert.ok(breakfastNeg.some((h) => /eggs on top of pancakes/i.test(h)));

const eggsOnPancake = auditPlatingAccuracyMetadata({
  title: "Breakfast Plate",
  heroAlt: "eggs on top of pancake stack",
});
assert.equal(eggsOnPancake.pass, false);

const jerkNoRice = auditPlatingAccuracyMetadata({
  title: "Jerk Chicken & Peas and Rice",
  heroAlt: "jerk chicken platter sauce only no rice",
});
assert.equal(jerkNoRice.pass, false);

const steakToast = auditPlatingAccuracyMetadata({
  title: "Steak Sandwiches",
  heroAlt: "steak on toast slices",
});
assert.equal(steakToast.pass, false);

const jerkPass = auditPlatingAccuracyMetadata({
  title: "Jerk Chicken & Peas and Rice",
  heroAlt: "jerk chicken with rice and peas on firehall tray",
});
assert.equal(jerkPass.pass, true);

const fullPlating = buildFullPlatingPromptLine("Steak Sandwiches", "sandwich");
assert.ok(/bun|roll/i.test(fullPlating), "sandwich plating mentions bun");
assert.ok(fullPlating.includes(PLATING_ACCURACY_MAIN_RULE.slice(0, 40)));

const ctx: FoodImageryContext = {
  recipeKey: "jerk-chicken",
  title: "Jerk Chicken & Peas and Rice",
  cuisine: "Caribbean",
  mealFormat: "grill",
  protein: "Chicken",
};
const prompt = buildFoodImageryPrompt(ctx).toLowerCase();
assert.ok(prompt.includes("rice"), "generated prompt requires visible rice");
assert.ok(prompt.includes("plating accuracy") || prompt.includes("clearly visible"));

assert.ok(getPlatingAccuracyVisionRubric().includes("within 1 second"));

console.log("[test-plating-accuracy-standard] OK");
