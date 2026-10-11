/**
 * Personal onboarding progress — Generate → Save → Profile, tracked for the
 * in-page OnboardingBanner only. Nothing redirects on it: signed-in onboarding
 * is the schedule setup behind "Plan my shift" (./schedule-onboarding.ts).
 */

import { getSavedCount } from "@/lib/saved-meals";
import { hasUserGeneratedBefore } from "@/lib/prefetch";

export type PersonalOnboardingStatus = "pending" | "skipped" | "completed";

export type PersonalOnboardingStep =
  | "generate_meal"
  | "save_meal"
  | "profile"
  | "hall_question"
  | "connect_hall"
  | "completed";

export interface PersonalOnboardingProgress {
  status: PersonalOnboardingStatus;
  first_meal_generated: boolean;
  first_meal_saved: boolean;
  profile_built: boolean;
  works_at_firehall: boolean | null;
  hall_connect_skipped: boolean;
  updated_at: string;
}

export interface PersonalOnboardingSignals {
  hasHall?: boolean;
  profileComplete?: boolean;
}

const STORAGE_PREFIX = "fh_personal_onboarding_";
const SESSION_DISMISS_KEY = "fh_personal_onboarding_dismissed";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function defaultPersonalOnboardingProgress(): PersonalOnboardingProgress {
  return {
    status: "pending",
    first_meal_generated: false,
    first_meal_saved: false,
    profile_built: false,
    works_at_firehall: null,
    hall_connect_skipped: false,
    updated_at: new Date().toISOString(),
  };
}

function normalizeProgress(
  raw: Partial<PersonalOnboardingProgress> & Record<string, unknown>,
): PersonalOnboardingProgress {
  const status =
    raw.status === "skipped"
      ? "skipped"
      : raw.status === "completed"
        ? "completed"
        : "pending";

  return {
    status,
    first_meal_generated: raw.first_meal_generated === true,
    first_meal_saved: raw.first_meal_saved === true,
    profile_built: raw.profile_built === true,
    works_at_firehall:
      raw.works_at_firehall === true
        ? true
        : raw.works_at_firehall === false
          ? false
          : null,
    hall_connect_skipped: raw.hall_connect_skipped === true,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : new Date().toISOString(),
  };
}

function inferFromAppState(
  progress: PersonalOnboardingProgress,
  signals?: PersonalOnboardingSignals,
): PersonalOnboardingProgress {
  let next = { ...progress };

  if (!next.first_meal_generated && hasUserGeneratedBefore()) {
    next.first_meal_generated = true;
  }
  if (!next.first_meal_saved && getSavedCount() > 0) {
    next.first_meal_saved = true;
  }
  if (!next.profile_built && signals?.profileComplete) {
    next.profile_built = true;
  }
  if (signals?.hasHall) {
    next.works_at_firehall = true;
    next.first_meal_generated = true;
    next.first_meal_saved = true;
    next.profile_built = true;
    next.status = "completed";
  }

  return next;
}

export function readPersonalOnboardingProgress(
  userId: string,
  signals?: PersonalOnboardingSignals,
): PersonalOnboardingProgress {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const base = raw
      ? normalizeProgress(JSON.parse(raw) as Partial<PersonalOnboardingProgress> & Record<string, unknown>)
      : defaultPersonalOnboardingProgress();
    return inferFromAppState(base, signals);
  } catch {
    return inferFromAppState(defaultPersonalOnboardingProgress(), signals);
  }
}

export function writePersonalOnboardingProgress(
  userId: string,
  patch: Partial<PersonalOnboardingProgress>,
  signals?: PersonalOnboardingSignals,
): PersonalOnboardingProgress {
  const current = readPersonalOnboardingProgress(userId, signals);
  const next = normalizeProgress({
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  });

  if (next.works_at_firehall === false) {
    next.status = "completed";
  }
  if (next.works_at_firehall === true && (signals?.hasHall || next.hall_connect_skipped)) {
    next.status = "completed";
  }

  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function markFirstMealGenerated(
  userId: string,
  signals?: PersonalOnboardingSignals,
): PersonalOnboardingProgress {
  return writePersonalOnboardingProgress(userId, { first_meal_generated: true }, signals);
}

export function markFirstMealSaved(
  userId: string,
  signals?: PersonalOnboardingSignals,
): PersonalOnboardingProgress {
  return writePersonalOnboardingProgress(
    userId,
    { first_meal_saved: true, first_meal_generated: true },
    signals,
  );
}

export function markProfileBuilt(
  userId: string,
  signals?: PersonalOnboardingSignals,
): PersonalOnboardingProgress {
  return writePersonalOnboardingProgress(userId, { profile_built: true }, signals);
}

export function markHallConnectSkipped(
  userId: string,
  signals?: PersonalOnboardingSignals,
): PersonalOnboardingProgress {
  return writePersonalOnboardingProgress(
    userId,
    { hall_connect_skipped: true, status: "completed" },
    signals,
  );
}

export function markPersonalOnboardingCompleted(
  userId: string,
  signals?: PersonalOnboardingSignals,
): PersonalOnboardingProgress {
  return writePersonalOnboardingProgress(userId, { status: "completed" }, signals);
}

export function markPersonalOnboardingSkipped(
  userId: string,
  signals?: PersonalOnboardingSignals,
): PersonalOnboardingProgress {
  return writePersonalOnboardingProgress(userId, { status: "skipped" }, signals);
}

export function isPersonalOnboardingComplete(
  progress: PersonalOnboardingProgress,
  hasHall = false,
): boolean {
  if (progress.status === "completed" || progress.status === "skipped") return true;
  if (progress.works_at_firehall === false) return true;
  if (progress.works_at_firehall === true && (hasHall || progress.hall_connect_skipped)) {
    return true;
  }
  return false;
}

export function personalOnboardingStep(
  progress: PersonalOnboardingProgress,
  hasHall = false,
): PersonalOnboardingStep {
  if (isPersonalOnboardingComplete(progress, hasHall)) return "completed";
  if (!progress.first_meal_generated) return "generate_meal";
  if (!progress.first_meal_saved) return "save_meal";
  if (!progress.profile_built) return "profile";
  // Hall operations is on hold — the funnel no longer asks the
  // "do you cook at a fire hall?" question or offers to connect a hall.
  // `hall_question`/`connect_hall` remain valid PersonalOnboardingStep
  // values (kept for type/back-compat with any stored progress and other
  // switch statements below) but are never returned here anymore, so no
  // caller will route a user into that CTA. See FIREHALL MEALS — REMOVE
  // HALL OPERATIONS / HALL SIGNUP SURFACES cleanup.
  return "completed";
}

export const PERSONAL_ONBOARDING_STEP_LABELS: Record<
  Exclude<PersonalOnboardingStep, "completed">,
  string
> = {
  generate_meal: "Generate meal",
  save_meal: "Save meal",
  profile: "Build profile",
  hall_question: "Your setup",
  connect_hall: "Connect to hall",
};

export function personalOnboardingStepNumber(step: PersonalOnboardingStep): number {
  switch (step) {
    case "generate_meal":
      return 2;
    case "save_meal":
      return 3;
    case "profile":
      return 4;
    case "hall_question":
    case "connect_hall":
      return 5;
    case "completed":
      return 5;
  }
}

export function shouldShowPersonalOnboardingFunnel(userId: string): boolean {
  try {
    if (sessionStorage.getItem(SESSION_DISMISS_KEY) === userId) return false;
  } catch {
    /* ignore */
  }
  return true;
}

export function dismissPersonalOnboardingForSession(userId: string): void {
  try {
    sessionStorage.setItem(SESSION_DISMISS_KEY, userId);
  } catch {
    /* ignore */
  }
}

export function clearPersonalOnboardingSessionDismiss(): void {
  try {
    sessionStorage.removeItem(SESSION_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

export function primePersonalOnboardingAfterSignIn(): void {
  clearPersonalOnboardingSessionDismiss();
}

export function profileLooksComplete(profile: {
  first_name?: string | null;
  display_name?: string | null;
} | null): boolean {
  if (!profile) return false;
  return Boolean(profile.display_name?.trim() || profile.first_name?.trim());
}

export function onboardingSignalsFromAuth(
  halls: { hall_id: string }[],
  profile: { first_name?: string | null; display_name?: string | null } | null,
): PersonalOnboardingSignals {
  return {
    hasHall: halls.length > 0,
    profileComplete: profileLooksComplete(profile),
  };
}

export function isOnboardingMode(search?: string): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(search ?? window.location.search);
  return params.get("onboarding") === "1";
}
