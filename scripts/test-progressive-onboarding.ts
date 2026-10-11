#!/usr/bin/env tsx
/**
 * Phase 16 — progressive onboarding.
 * Schedule setup only behind "Plan my shift", 4 short steps, then the plan;
 * preferences / nutrition / staples / crew are "learn later" prompts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SCHEDULE_ONBOARDING_STEPS,
  createScheduleOnboardingSession,
  wantsScheduleOnboarding,
} from "../client/src/lib/onboarding/schedule-onboarding.ts";
import {
  progressivePromptsFor,
  type ProgressivePromptInput,
} from "../client/src/lib/onboarding/progressive-prompts.ts";
import { ANALYTICS_EVENT_TYPES } from "../shared/analytics/events.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

function sessionLifecycle(): void {
  let t = 1_000_000;
  const clock = () => t;

  const done = createScheduleOnboardingSession("shift_home", clock);
  done.step(2);
  done.step(4);
  t += 42_400;
  assert.deepEqual(done.complete(), { type: "completed", durationSec: 42 });
  assert.equal(done.abandon("navigated_away"), null, "unmount after completing never reports abandoned");
  assert.equal(done.complete(), null, "completed fires once");

  const left = createScheduleOnboardingSession("deep_link", clock);
  left.step(3);
  left.step(2);
  left.step(9);
  t += 5_000;
  assert.deepEqual(left.abandon("cancelled"), {
    type: "abandoned",
    reason: "cancelled",
    lastStep: 3,
    durationSec: 5,
  });
  assert.equal(left.abandon("navigated_away"), null, "cancel + unmount reports one abandon");
  assert.equal(left.complete(), null);
  assert.equal(left.ended, true);

  assert.equal(SCHEDULE_ONBOARDING_STEPS, 4);
  assert.equal(wantsScheduleOnboarding("?setup=1"), true);
  assert.equal(wantsScheduleOnboarding("setup=1&shift=x"), true);
  assert.equal(wantsScheduleOnboarding("?setup=0"), false);
  assert.equal(wantsScheduleOnboarding(""), false);
}

function prompts(): void {
  const base: ProgressivePromptInput = {
    hasValue: true,
    nutritionGoals: [],
    dietaryRestrictions: [],
    allergies: [],
    excludedIngredients: [],
    pantryConfigured: false,
    hasNutritionGoalsFeature: false,
    dismissed: new Set(),
  };
  const ids = (input: Partial<ProgressivePromptInput>) => progressivePromptsFor({ ...base, ...input }).map((p) => p.id);

  assert.deepEqual(ids({ hasValue: false }), [], "nothing before the user has a planned meal");
  assert.deepEqual(ids({}), ["food_preferences", "nutrition_goals", "staples", "crew"]);

  const nutrition = progressivePromptsFor(base).find((p) => p.id === "nutrition_goals")!;
  assert.equal(nutrition.locked, true, "Nutrition Goals shows the Pro lock on Free");
  const nutritionPro = progressivePromptsFor({ ...base, hasNutritionGoalsFeature: true }).find(
    (p) => p.id === "nutrition_goals",
  )!;
  assert.equal(nutritionPro.locked, false);
  assert.equal(nutritionPro.href, "/me/profile?edit=food");
  assert.ok(!ids({ hasNutritionGoalsFeature: true, nutritionGoals: ["high_protein"] }).includes("nutrition_goals"));
  assert.ok(
    ids({ hasNutritionGoalsFeature: false, nutritionGoals: ["high_protein"] }).includes("nutrition_goals"),
    "a stale goal without Pro still shows the locked prompt",
  );

  assert.ok(!ids({ allergies: ["peanut"] }).includes("food_preferences"));
  assert.ok(!ids({ excludedIngredients: ["cilantro"] }).includes("food_preferences"));
  assert.ok(!ids({ pantryConfigured: true }).includes("staples"));

  const crew = progressivePromptsFor(base).find((p) => p.id === "crew")!;
  assert.equal(crew.href, null, "crew linking is 'coming soon', not a dead link");

  assert.deepEqual(ids({ dismissed: new Set(["staples", "crew"]) }), ["food_preferences", "nutrition_goals"]);
}

function wiring(): void {
  for (const e of ["schedule_onboarding_started", "schedule_onboarding_completed", "schedule_onboarding_abandoned"]) {
    assert.ok((ANALYTICS_EVENT_TYPES as readonly string[]).includes(e), `${e} registered`);
  }

  const flow = read("client/src/components/schedule/schedule-setup-flow.tsx");
  assert.match(flow, /const totalSteps = quick \? 4 : 3/);
  assert.match(flow, /quick && step === 3/, "start time is its own step in onboarding");

  const onboarding = read("client/src/components/schedule/schedule-onboarding.tsx");
  assert.match(onboarding, /<ScheduleSetupFlow\s+quick/);
  for (const banned of ["nutrition", "pantry", "invite", "excluded_ingredients", "dietary"]) {
    assert.ok(!onboarding.toLowerCase().includes(banned), `setup never asks about ${banned}`);
  }
  assert.match(onboarding, /trackScheduleOnboardingStarted/);
  assert.match(onboarding, /trackScheduleOnboardingCompleted/);
  assert.match(onboarding, /abandonRef\.current\("navigated_away"\)/);
  assert.match(onboarding, /"pagehide"/);
  assert.match(onboarding, /abandon\("cancelled"\)/);

  const shift = read("client/src/pages/shift-planner.tsx");
  assert.match(shift, /data-testid="button-plan-my-shift"/);
  assert.match(shift, /<ScheduleOnboarding/);
  assert.match(shift, /autoFill=\{justOnboarded && !plan\.planAhead\}/, "plan is generated right after setup");
  assert.match(shift, /<LearnLaterPrompts hasValue=\{hasPlannedMeal\}/);
  assert.match(shift, /openSignIn\(`\$\{SHIFT\}\?\$\{SCHEDULE_ONBOARDING_PARAM\}=1`\)/, "signed-out tap resumes setup after sign-in");

  const planner = read("client/src/components/shift-planner/next-shift-planner.tsx");
  assert.match(planner, /if \(!autoFill \|\| autoFilled\.current \|\| resolvedCount > 0\) return;/);

  const app = read("client/src/App.tsx");
  for (const route of ["/explore", "/generator", "/recipes"]) {
    assert.ok(app.includes(`path="${route}`), `${route} is a plain public route`);
  }
}

function main(): void {
  sessionLifecycle();
  prompts();
  wiring();
  console.log("[test-progressive-onboarding] OK");
}

main();
