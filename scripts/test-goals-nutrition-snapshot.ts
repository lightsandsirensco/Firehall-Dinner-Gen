/**
 * Focused QA — nutrition_goal_match snapshot fix (frozen at goal-creation
 * time, never re-evaluated against a later-changed profile preference).
 * Pure logic only (computeProgress takes no DB access). Run:
 * tsx scripts/test-goals-nutrition-snapshot.ts
 */
import { computeProgress, type MonthStats } from "../server/goals/store.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${label}`);
  } else {
    console.log(`ok: ${label}`);
  }
}

function stats(overrides: Partial<MonthStats> = {}): MonthStats {
  return {
    totalCooked: 10,
    newMealsTried: 0,
    highProteinCount: 0,
    highFiberCount: 0,
    healthierCount: 0,
    nutritionGoalMatchCount: 0,
    matchCountByGoal: {},
    savedNutritionGoal: null,
    avgCostPerPerson: null,
    costDataCount: 0,
    rated4PlusCount: 0,
    ...overrides,
  };
}

// ── 1. Snapshotted goal counts against its OWN frozen value, not the live
//      (now different) profile preference. ────────────────────────────────
{
  const s = stats({
    matchCountByGoal: { high_protein: 5, balanced: 2 },
    savedNutritionGoal: "balanced", // user later changed their profile default
    nutritionGoalMatchCount: 2, // what the OLD live-comparison logic would have used
  });
  const progress = computeProgress("nutrition_goal_match", 6, s, "high_protein");
  check("snapshotted goal counts against its own frozen value (5), not the live goal (2)", progress.current === 5);
  check("progress reflects the frozen goal in the returned shape", progress.nutrition_goal_snapshot === "high_protein");
  check("not yet complete (5 of 6)", progress.completed === false);
}

// ── 2. Legacy goal (created before this fix) has no snapshot — falls back
//      to the previous live-comparison behavior exactly as before. ─────────
{
  const s = stats({
    matchCountByGoal: { high_protein: 5, balanced: 2 },
    savedNutritionGoal: "balanced",
    nutritionGoalMatchCount: 2,
  });
  const progress = computeProgress("nutrition_goal_match", 4, s, null);
  check("legacy (null-snapshot) goal falls back to live nutritionGoalMatchCount", progress.current === 2);
  check("legacy goal's displayed snapshot falls back to the live saved goal", progress.nutrition_goal_snapshot === "balanced");
}

// ── 3. Other goal types are completely unaffected by the snapshot param ────
{
  const s = stats({ totalCooked: 7 });
  const progress = computeProgress("shift_meals", 6, s, "high_protein");
  check("shift_meals ignores the nutrition snapshot entirely", progress.current === 7 && progress.nutrition_goal_snapshot === undefined);
}

console.log(failures === 0 ? "\nAll goals nutrition-snapshot checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
