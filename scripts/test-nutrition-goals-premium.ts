#!/usr/bin/env tsx
/**
 * Firehall Meals Pro — saved "Nutrition Goals".
 *
 *   npx tsx scripts/test-nutrition-goals-premium.ts
 */
import {
  PROFILE_NUTRITION_GOALS,
  PROFILE_GOALS_MAX_BONUS,
  PROFILE_GOALS_MAX_PENALTY,
  sanitizeProfileNutritionGoals,
  scoreProfileNutritionGoals,
  toggleProfileNutritionGoal,
} from "../shared/nutrition/profile-goals.js";
import { gateNutritionGoalsByEntitlement } from "../server/generation/nutrition-goals-gate.js";
import { BILLING_FEATURES, PLAN_BASE_FEATURES, type BillingFeature } from "../shared/billing/types.js";

let failures = 0;
function check(name: string, ok: boolean): void {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`  FAIL ${name}`);
  }
}

function features(enabled: BillingFeature[]): Record<BillingFeature, boolean> {
  return Object.fromEntries(BILLING_FEATURES.map((f) => [f, enabled.includes(f)])) as Record<BillingFeature, boolean>;
}

console.log("Nutrition Goals — definitions");
check("7 goals defined", PROFILE_NUTRITION_GOALS.length === 7);
check("Pro plan includes nutrition_goals", PLAN_BASE_FEATURES.firefighter_plus.includes("nutrition_goals"));
check("Free plans exclude nutrition_goals",
  !PLAN_BASE_FEATURES.guest.includes("nutrition_goals") && !PLAN_BASE_FEATURES.personal.includes("nutrition_goals"));

console.log("Sanitize + toggle");
check("unknown keys dropped", sanitizeProfileNutritionGoals(["high_protein", "keto", 4]).join() === "high_protein");
check("duplicates removed", sanitizeProfileNutritionGoals(["lower_fat", "lower_fat"]).length === 1);
check("conflicting carb pair resolves to first", sanitizeProfileNutritionGoals(["lower_carb", "higher_carb"]).join() === "lower_carb");
check("toggle swaps conflicting carb goal",
  toggleProfileNutritionGoal(["lower_carb", "high_protein"], "higher_carb").join() === "high_protein,higher_carb");
check("toggle removes selected goal", toggleProfileNutritionGoal(["balanced"], "balanced").length === 0);

console.log("Entitlement gate");
check("free account → []", gateNutritionGoalsByEntitlement({ features: features([]) }, ["high_protein"]).length === 0);
check("Pro account keeps goals",
  gateNutritionGoalsByEntitlement({ features: features(["nutrition_goals"]) }, ["high_protein", "bogus"]).join() === "high_protein");

console.log("Scoring");
const lean = { calories: 520, protein_g: 42, carbs_g: 30, fat_g: 14 };
const heavy = { calories: 1150, protein_g: 28, carbs_g: 95, fat_g: 55 };
check("no goals → 0", scoreProfileNutritionGoals([], lean) === 0);
check("high protein prefers 42g over 28g",
  scoreProfileNutritionGoals(["high_protein"], lean) > scoreProfileNutritionGoals(["high_protein"], heavy));
check("lower calorie penalizes 1150 cal", scoreProfileNutritionGoals(["lower_calorie"], heavy) < 0);
check("lower calorie gives only a small nudge to a too-light plate",
  scoreProfileNutritionGoals(["lower_calorie"], { calories: 300, protein_g: 30 }) < scoreProfileNutritionGoals(["lower_calorie"], lean));
check("lower fat prefers 14g over 55g",
  scoreProfileNutritionGoals(["lower_fat"], lean) > scoreProfileNutritionGoals(["lower_fat"], heavy));
check("higher carb prefers 95g carbs", scoreProfileNutritionGoals(["higher_carb"], heavy) > scoreProfileNutritionGoals(["higher_carb"], lean));
check("higher fibre uses high_fiber tag", scoreProfileNutritionGoals(["higher_fibre"], { highFiberTag: true }) > 0);
check("unknown macros fall back to category, never invented",
  scoreProfileNutritionGoals(["lower_carb"], {}) === 0 &&
  scoreProfileNutritionGoals(["high_protein"], { nutritionCategory: "high_protein" }) > 0);
check("combined bonus clamped",
  scoreProfileNutritionGoals(["high_protein", "lower_calorie", "lower_fat", "balanced"], lean) === PROFILE_GOALS_MAX_BONUS);
check("combined penalty clamped",
  scoreProfileNutritionGoals(["lower_calorie", "lower_fat", "lower_carb"], heavy) === PROFILE_GOALS_MAX_PENALTY);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll Nutrition Goals checks passed.");
