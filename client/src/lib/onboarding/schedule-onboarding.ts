/**
 * Progressive onboarding — the short schedule setup a signed-in user gets the
 * first time they tap "Plan my shift" without a schedule. Nothing else
 * (preferences, crew, pantry, nutrition) is asked up front.
 *
 * Framework-free lifecycle so started / completed / abandoned each fire at
 * most once per setup session, whichever way the user leaves.
 */

import type {
  ScheduleOnboardingAbandonReason,
  ScheduleOnboardingEntry,
} from "@/lib/analytics";

export const SCHEDULE_ONBOARDING_STEPS = 4;
/** `/shift?setup=1` opens the setup straight away (signed-out "Plan my shift" → sign in → back here). */
export const SCHEDULE_ONBOARDING_PARAM = "setup";

export type ScheduleOnboardingOutcome =
  | { type: "completed"; durationSec: number }
  | { type: "abandoned"; reason: ScheduleOnboardingAbandonReason; lastStep: number; durationSec: number };

export interface ScheduleOnboardingSession {
  readonly entry: ScheduleOnboardingEntry;
  step(step: number): void;
  /** Returns the outcome to report, or null when the session already ended. */
  complete(): ScheduleOnboardingOutcome | null;
  abandon(reason: ScheduleOnboardingAbandonReason): ScheduleOnboardingOutcome | null;
  readonly ended: boolean;
}

export function createScheduleOnboardingSession(
  entry: ScheduleOnboardingEntry,
  now: () => number = Date.now,
): ScheduleOnboardingSession {
  const startedAt = now();
  let lastStep = 1;
  let ended = false;
  const elapsed = () => Math.max(0, Math.round((now() - startedAt) / 1000));

  return {
    entry,
    get ended() {
      return ended;
    },
    step(step) {
      if (ended) return;
      const n = Math.trunc(step);
      if (n >= 1 && n <= SCHEDULE_ONBOARDING_STEPS && n > lastStep) lastStep = n;
    },
    complete() {
      if (ended) return null;
      ended = true;
      return { type: "completed", durationSec: elapsed() };
    },
    abandon(reason) {
      if (ended) return null;
      ended = true;
      return { type: "abandoned", reason, lastStep, durationSec: elapsed() };
    },
  };
}

export function wantsScheduleOnboarding(search: string): boolean {
  return new URLSearchParams(search).get(SCHEDULE_ONBOARDING_PARAM) === "1";
}
