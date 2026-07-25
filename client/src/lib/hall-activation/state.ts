/**
 * Hall onboarding — Join → Welcome → Tonight.
 */

export type HallActivationStatus = "pending" | "skipped" | "completed";

export interface HallActivationProgress {
  status: HallActivationStatus;
  hall_id: string | null;
  welcome_seen: boolean;
  updated_at: string;
}

const STORAGE_PREFIX = "fh_hall_activation_";
const SESSION_DISMISS_KEY = "fh_hall_activation_dismissed";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function defaultActivationProgress(): HallActivationProgress {
  return {
    status: "pending",
    hall_id: null,
    welcome_seen: false,
    updated_at: new Date().toISOString(),
  };
}

function legacyWelcomeSeen(raw: Record<string, unknown>): boolean {
  if (raw.welcome_seen === true) return true;
  if (raw.status === "completed" || raw.status === "skipped") return true;
  return Boolean(raw.shift_selected && raw.invite_sent && raw.vote_created);
}

function normalizeProgress(raw: Partial<HallActivationProgress> & Record<string, unknown>): HallActivationProgress {
  const welcomeSeen = legacyWelcomeSeen(raw);
  const status =
    raw.status === "skipped"
      ? "skipped"
      : raw.status === "completed" || welcomeSeen
        ? "completed"
        : "pending";

  return {
    status,
    hall_id: typeof raw.hall_id === "string" ? raw.hall_id : null,
    welcome_seen: welcomeSeen,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : new Date().toISOString(),
  };
}

export function readActivationProgress(userId: string): HallActivationProgress {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return defaultActivationProgress();
    return normalizeProgress(JSON.parse(raw) as Partial<HallActivationProgress> & Record<string, unknown>);
  } catch {
    return defaultActivationProgress();
  }
}

export function writeActivationProgress(
  userId: string,
  patch: Partial<HallActivationProgress>,
): HallActivationProgress {
  const current = readActivationProgress(userId);
  const next = normalizeProgress({
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  });

  if (next.welcome_seen && next.hall_id && next.status === "pending") {
    next.status = "completed";
  }

  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function markActivationSkipped(userId: string): void {
  writeActivationProgress(userId, { status: "skipped", welcome_seen: true });
}

export function markWelcomeSeen(userId: string, hallId: string): HallActivationProgress {
  return writeActivationProgress(userId, {
    hall_id: hallId,
    welcome_seen: true,
    status: "completed",
  });
}

export function markActivationCompleted(userId: string, hallId: string): HallActivationProgress {
  return markWelcomeSeen(userId, hallId);
}

export function isActivationComplete(progress: HallActivationProgress): boolean {
  return progress.status === "completed" || progress.status === "skipped";
}

export function shouldShowActivationFunnel(userId: string): boolean {
  const progress = readActivationProgress(userId);
  if (isActivationComplete(progress)) return false;
  try {
    if (sessionStorage.getItem(SESSION_DISMISS_KEY) === userId) return false;
  } catch {
    /* ignore */
  }
  return true;
}

export function dismissActivationForSession(userId: string): void {
  try {
    sessionStorage.setItem(SESSION_DISMISS_KEY, userId);
  } catch {
    /* ignore */
  }
}

export function clearActivationSessionDismiss(): void {
  try {
    sessionStorage.removeItem(SESSION_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

export function primeHallActivationAfterSignIn(): void {
  clearActivationSessionDismiss();
}

export type OnboardingStep = 1 | 2 | 3;

export function onboardingStep(progress: HallActivationProgress, hasHall: boolean): OnboardingStep {
  const hallReady = Boolean(progress.hall_id || hasHall);
  if (!hallReady) return 1;
  if (!progress.welcome_seen && progress.status === "pending") return 2;
  return 3;
}

export const ONBOARDING_STEP_LABELS: Record<OnboardingStep, string> = {
  1: "Join Hall",
  2: "Welcome",
  3: "Tonight",
};

/** @deprecated use onboardingStep */
export function activationStep(progress: HallActivationProgress, hasHall: boolean): 1 | 2 | 3 {
  return onboardingStep(progress, hasHall);
}

export function onboardingPathForStep(step: OnboardingStep): string {
  switch (step) {
    case 1:
      return "/hall/join";
    case 2:
      return "/hall/welcome";
    case 3:
      return "/hall";
  }
}
