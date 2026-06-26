#!/usr/bin/env tsx
/**
 * Validates personal onboarding state machine — Generate → Save → Profile → Hall (optional).
 */
import assert from "node:assert/strict";
import {
  defaultPersonalOnboardingProgress,
  isPersonalOnboardingComplete,
  onboardingPathForStep,
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
    "hall_question",
  );
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
    "connect_hall",
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

  assert.equal(onboardingPathForStep("generate_meal"), "/generator?onboarding=1");
  assert.equal(onboardingPathForStep("profile"), "/me/profile?onboarding=1");
  assert.equal(onboardingPathForStep("hall_question"), "/onboarding/hall");
  assert.equal(onboardingPathForStep("connect_hall"), "/hall/join?onboarding=1");
  assert.equal(onboardingPathForStep("completed"), "/home");

  console.log("[test-personal-onboarding] OK");
}

main();
