#!/usr/bin/env tsx
/**
 * Validates hall onboarding state machine — Join → Welcome → Tonight.
 */
import assert from "node:assert/strict";
import {
  defaultActivationProgress,
  isActivationComplete,
  onboardingPathForStep,
  onboardingStep,
  type HallActivationProgress,
} from "../client/src/lib/hall-activation/state.ts";

function progress(patch: Partial<HallActivationProgress>): HallActivationProgress {
  return { ...defaultActivationProgress(), ...patch };
}

function main(): void {
  assert.equal(onboardingStep(defaultActivationProgress(), false), 1);
  assert.equal(onboardingStep(defaultActivationProgress(), true), 2);

  assert.equal(onboardingStep(progress({ hall_id: "hall-1" }), false), 2);
  assert.equal(onboardingStep(progress({ hall_id: "hall-1", welcome_seen: true }), false), 3);
  assert.equal(onboardingStep(progress({ hall_id: "hall-1", status: "completed" }), false), 3);

  const complete = progress({
    hall_id: "hall-1",
    welcome_seen: true,
    status: "completed",
  });
  assert.equal(onboardingStep(complete, false), 3);
  assert.equal(isActivationComplete(complete), true);

  assert.equal(isActivationComplete(progress({ status: "skipped" })), true);
  assert.equal(isActivationComplete(progress({ hall_id: "hall-1" })), false);

  assert.equal(onboardingPathForStep(1), "/hall/join");
  assert.equal(onboardingPathForStep(2), "/hall/welcome");
  assert.equal(onboardingPathForStep(3), "/tonight");

  console.log("[test-hall-onboarding] OK");
}

main();
