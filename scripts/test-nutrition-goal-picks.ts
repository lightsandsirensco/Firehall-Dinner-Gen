/**
 * Nutrition goals must visibly change what the live generator picker serves, and
 * a "fits your goal" reason may only appear on a pick whose VERIFIED numbers meet it.
 *
 *   npx tsx scripts/test-nutrition-goal-picks.ts
 */
import { initCacheStore } from "../server/cache-store.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { pickGolden100ForGenerate } from "../server/generation/pick-local-recipes.js";
import { nutritionGoalFactsForSlug } from "../server/generation/nutrition-goals-gate.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";
import {
  meetsProfileNutritionGoal,
  PROFILE_NUTRITION_GOALS,
  type ProfileNutritionGoalKey,
} from "../shared/nutrition/profile-goals.js";

const RUNS = 60;
let failed = 0;
function check(name: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "  ok " : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

await initCacheStore();
await initCuratedRecipeStore();
const request = buildGenerateRequestInput();

function run(goal: ProfileNutritionGoalKey | null) {
  const picks = [];
  for (let i = 0; i < RUNS; i++) {
    const pick = pickGolden100ForGenerate(request, {
      varietySeed: `goal-picks:${goal ?? "none"}:${i}`,
      nutritionGoal: goal,
    });
    if (pick) picks.push(pick);
  }
  return picks;
}

const baseline = run(null);
check("baseline picks are filled", baseline.length === RUNS, `${baseline.length}/${RUNS}`);
check(
  "no goal → no goal reason",
  baseline.every((p) => !p.personalization?.reasons.some((r) => r.includes(" goal: "))),
);

for (const goal of PROFILE_NUTRITION_GOALS) {
  const meets = (slug: string) => meetsProfileNutritionGoal(goal, nutritionGoalFactsForSlug(slug));
  const withGoal = run(goal);
  const baseRate = baseline.filter((p) => meets(p.slug)).length / baseline.length;
  const goalRate = withGoal.filter((p) => meets(p.slug)).length / Math.max(1, withGoal.length);
  const distinct = new Set(withGoal.map((p) => p.slug)).size;
  check(`${goal}: every run filled`, withGoal.length === RUNS, `${withGoal.length}/${RUNS}`);
  check(
    `${goal}: verified goal matches dominate`,
    goalRate >= 0.8 && goalRate > baseRate,
    `${Math.round(goalRate * 100)}% with goal vs ${Math.round(baseRate * 100)}% without`,
  );
  check(`${goal}: still varied`, distinct >= 15, `${distinct} distinct meals in ${RUNS} runs`);
  const wrongClaims = withGoal.filter((p) => {
    const claims = p.personalization?.reasons.some((r) => r.includes(" goal: ")) ?? false;
    return claims !== meets(p.slug);
  });
  check(
    `${goal}: "fits your goal" shown exactly when verified numbers meet it`,
    wrongClaims.length === 0,
    wrongClaims.map((p) => p.slug).slice(0, 3).join(", "),
  );
}

if (failed) {
  console.error(`\n${failed} nutrition goal pick check(s) failed.`);
  process.exit(1);
}
console.log("\nAll nutrition goal pick checks passed.");
process.exit(0);
