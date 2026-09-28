/**
 * Focused QA for Nutrition Goal Personalization v1 — deterministic scoring,
 * profile default resolution, session override, and missing-data safety.
 * Run: tsx scripts/test-nutrition-goal-scoring.ts
 */
import assert from "node:assert";
import {
  scoreNutritionGoal,
  nutritionGoalToHealthiness,
  explainNutritionGoalFit,
  NUTRITION_GOAL_OPTIONS,
  NUTRITION_GOAL_LABELS,
} from "../shared/nutrition/goal-scoring.js";
import { resolveGeneratorFilters } from "../shared/generator-personalization.js";
import { createDefaultSimplifiedFilters } from "../shared/generator-simplified.js";
import { getDisplayableMacroRows, hasDisplayableNutrition } from "../client/src/components/recipe-nutrition-panel.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${label}`);
  } else {
    console.log(`ok: ${label}`);
  }
}

// ── 1. All 8 modes are valid and no_preference is neutral ─────────────────
check("8 nutrition modes defined", NUTRITION_GOAL_OPTIONS.length === 8);
check(
  "no_preference never contributes a score bonus",
  scoreNutritionGoal("no_preference", { nutritionCategory: "high_protein", totalMinutes: 10 }) === 0,
);

// ── 2. High protein prioritizes protein-dense category ─────────────────────
check(
  "high_protein rewards high_protein category",
  scoreNutritionGoal("high_protein", { nutritionCategory: "high_protein" }) >
    scoreNutritionGoal("high_protein", { nutritionCategory: "comfort" }),
);

// ── 3. Lighter meal prioritizes lighter category over indulgent ─────────────
check(
  "lighter rewards lighter category over indulgent",
  scoreNutritionGoal("lighter", { nutritionCategory: "lighter" }) >
    scoreNutritionGoal("lighter", { nutritionCategory: "indulgent" }),
);

// ── 4. Quick + Healthy rewards shorter real cook time, never fabricates time ─
check(
  "quick_healthy rewards a real 15-min recipe over a real 55-min recipe",
  scoreNutritionGoal("quick_healthy", { nutritionCategory: "lighter", totalMinutes: 15 }) >
    scoreNutritionGoal("quick_healthy", { nutritionCategory: "lighter", totalMinutes: 55 }),
);
check(
  "quick_healthy does not penalize when cook time is unknown (0/omitted)",
  scoreNutritionGoal("quick_healthy", { nutritionCategory: "lighter", totalMinutes: 0 }) ===
    scoreNutritionGoal("quick_healthy", { nutritionCategory: "lighter" }),
);

// ── 5. Missing category data never produces a negative/penalizing score ────
for (const goal of NUTRITION_GOAL_OPTIONS) {
  const score = scoreNutritionGoal(goal, {});
  check(`${goal}: missing nutritionCategory never penalizes (score=${score} >= 0)`, score >= 0);
}

// ── 6. heart_conscious never implies a "heart healthy" claim in scoring ─────
// (copy-level guarantee lives in shared/auth/constants.ts microcopy; here we just
// confirm it behaves like the other general "favor better balance" modes.)
check(
  "heart_conscious rewards balanced over indulgent",
  scoreNutritionGoal("heart_conscious", { nutritionCategory: "balanced" }) >
    scoreNutritionGoal("heart_conscious", { nutritionCategory: "indulgent" }),
);

// ── 7. Backward-compat bridge to legacy healthiness_preference ─────────────
check("lighter maps to lean", nutritionGoalToHealthiness("lighter") === "lean");
check("high_fiber maps to lean", nutritionGoalToHealthiness("high_fiber") === "lean");
check("high_carb maps to balanced (not lean)", nutritionGoalToHealthiness("high_carb") === "balanced");
check("no_preference maps to balanced", nutritionGoalToHealthiness("no_preference") === "balanced");

// ── 8. Signed-out user — default is no_preference, every mode selectable ───
{
  const filters = resolveGeneratorFilters({
    personal: null,
    session: null,
    preferences: null,
    hall: null,
    hallLinked: false,
  });
  check("signed-out default nutrition_goal is no_preference", filters.nutrition_goal === "no_preference");
}

// ── 9. Signed-in user — saved profile nutrition_goal becomes the default ───
{
  const filters = resolveGeneratorFilters({
    personal: null,
    session: null,
    preferences: { nutrition_goal: "high_protein" } as any,
    hall: null,
    hallLinked: false,
  });
  check("signed-in saved default applied", filters.nutrition_goal === "high_protein");
  check("healthiness derived in sync with saved default", filters.healthiness === "balanced");
}

// ── 10. Session override wins over saved profile default, profile untouched ─
{
  const filters = resolveGeneratorFilters({
    personal: null,
    session: { ...createDefaultSimplifiedFilters(), nutrition_goal: "lighter" },
    preferences: { nutrition_goal: "high_protein" } as any,
    hall: null,
    hallLinked: false,
  });
  check("session override wins for this generation", filters.nutrition_goal === "lighter");
  // The "preferences" input object itself is never mutated by resolveGeneratorFilters.
}

// ── 11. Recipe result UI — missing nutrition data is hidden, not fabricated ─
check(
  "zero/undefined macros produce zero displayable rows (no fake '0 cal')",
  getDisplayableMacroRows({ calories: 0, protein: 0, carbs: 0, fat: 0 }).length === 0,
);
check(
  "partial macros show only the real values",
  getDisplayableMacroRows({ calories: 620, protein: 0, carbs: 54, fat: undefined }).length === 2,
);
check(
  "hasDisplayableNutrition is false when estimateAvailable === false even with numbers present",
  hasDisplayableNutrition({ calories: 500, protein: 30, carbs: 40, fat: 10, estimateAvailable: false }) ===
    false,
);
check(
  "full macros are all displayable",
  getDisplayableMacroRows({ calories: 720, protein: 48, carbs: 62, fat: 22 }).length === 4,
);

// ── 12. Honest labeling — no fibre/sodium claim in the two proxy-scored modes ─
check(
  "high_fiber label does not claim 'fibre' (no direct fibre data exists)",
  !/fib(re|er)/i.test(NUTRITION_GOAL_LABELS.high_fiber),
);
check(
  "heart_conscious label does not claim 'heart' (no direct sodium data exists)",
  !/heart/i.test(NUTRITION_GOAL_LABELS.heart_conscious),
);

// ── 13. Result-fit explanation — only real data, never fabricated ──────────
check(
  "no_preference never shows a result explanation",
  explainNutritionGoalFit("no_preference", { calories: 500, protein_g: 40 }) === null,
);
check(
  "high_protein explanation cites real protein grams",
  explainNutritionGoalFit("high_protein", { protein_g: 52 }) === "52g protein per serving",
);
check(
  "quick_healthy explanation cites real minutes, never a fabricated one",
  explainNutritionGoalFit("quick_healthy", { totalMinutes: 35 }) === "35 min \u2022 balanced nutrition profile",
);
check(
  "quick_healthy with no real minutes falls back to real macros, not a guess",
  explainNutritionGoalFit("quick_healthy", { calories: 420, protein_g: 34 }) === "420 cal \u2022 34g protein",
);
check(
  "no explanation at all when there is truly no real data",
  explainNutritionGoalFit("high_protein", {}) === null,
);
check(
  "Plant Forward (high_fiber) never fabricates a fibre-gram claim",
  !/fib(re|er)/i.test(explainNutritionGoalFit("high_fiber", { calories: 480, protein_g: 22 }) || ""),
);

console.log(`\n[test-nutrition-goal-scoring] ${failures === 0 ? "OK" : `${failures} FAILURE(S)`}`);
if (failures > 0) process.exit(1);
