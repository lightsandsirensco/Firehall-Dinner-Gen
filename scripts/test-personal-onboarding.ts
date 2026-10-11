#!/usr/bin/env tsx
/**
 * Validates personal onboarding state machine — Generate → Save → Profile → Done.
 *
 * Hall operations is on hold, so the funnel no longer asks the "do you cook
 * at a fire hall?" question or offers to connect a hall — profile_built
 * goes straight to "completed". See FIREHALL MEALS — REMOVE HALL OPERATIONS
 * / HALL SIGNUP SURFACES cleanup.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultPersonalOnboardingProgress,
  isPersonalOnboardingComplete,
  personalOnboardingStep,
  type PersonalOnboardingProgress,
} from "../client/src/lib/onboarding/state.ts";

function progress(patch: Partial<PersonalOnboardingProgress>): PersonalOnboardingProgress {
  return { ...defaultPersonalOnboardingProgress(), ...patch };
}

function main(): void {
  assert.equal(personalOnboardingStep(defaultPersonalOnboardingProgress(), false), "generate_meal");
  assert.equal(
    personalOnboardingStep(progress({ first_meal_generated: true }), false),
    "save_meal",
  );
  assert.equal(
    personalOnboardingStep(progress({ first_meal_generated: true, first_meal_saved: true }), false),
    "profile",
  );
  assert.equal(
    personalOnboardingStep(
      progress({
        first_meal_generated: true,
        first_meal_saved: true,
        profile_built: true,
      }),
      false,
    ),
    "completed",
  );
  // Hall operations is on hold — works_at_firehall/hall_connect_skipped are
  // still valid stored fields (back-compat with existing localStorage data),
  // but no longer change the returned step once profile_built is true.
  assert.equal(
    personalOnboardingStep(
      progress({
        first_meal_generated: true,
        first_meal_saved: true,
        profile_built: true,
        works_at_firehall: true,
      }),
      false,
    ),
    "completed",
  );
  assert.equal(
    personalOnboardingStep(
      progress({
        first_meal_generated: true,
        first_meal_saved: true,
        profile_built: true,
        works_at_firehall: false,
      }),
      false,
    ),
    "completed",
  );
  assert.equal(
    personalOnboardingStep(
      progress({
        first_meal_generated: true,
        first_meal_saved: true,
        profile_built: true,
        works_at_firehall: true,
        hall_connect_skipped: true,
      }),
      false,
    ),
    "completed",
  );

  const personalComplete = progress({
    first_meal_generated: true,
    first_meal_saved: true,
    profile_built: true,
    works_at_firehall: false,
    status: "completed",
  });
  assert.equal(isPersonalOnboardingComplete(personalComplete, false), true);
  assert.equal(isPersonalOnboardingComplete(defaultPersonalOnboardingProgress(), false), false);

  // Phase 16 — the funnel is progress-only: no gate redirects on it and the hall branch is gone.
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
  const app = read("client/src/App.tsx");
  assert.ok(!app.includes("OnboardingGate"), "no forced onboarding gate is mounted");
  assert.ok(!existsSync(path.join(root, "client/src/components/onboarding/onboarding-gate.tsx")));
  assert.ok(!existsSync(path.join(root, "client/src/pages/onboarding-hall-page.tsx")), "hall question page removed");
  assert.match(app, /path="\/onboarding\/hall">\{\(\) => <Redirect to="\/shift"/, "/onboarding/hall → /shift");
  assert.match(
    read("server/routes.ts"),
    /app\.get\("\/onboarding\/hall"[\s\S]{0,80}redirect\(301, "\/shift"\)/,
    "server 301 for /onboarding/hall",
  );
  for (const rel of [
    "client/src/pages/account-page.tsx",
    "client/src/components/recipe-card.tsx",
    "client/src/pages/shift-planner.tsx",
    "client/src/pages/shift-list-page.tsx",
  ]) {
    const src = read(rel);
    assert.ok(!src.includes("/onboarding/hall"), `${rel} never links to the hall question`);
    assert.ok(!src.includes("onboarding=1"), `${rel} never pushes into forced profile onboarding`);
  }

  console.log("[test-personal-onboarding] OK");
}

main();
