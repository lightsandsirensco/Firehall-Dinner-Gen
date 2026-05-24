/** S6 — earned email capture (save or 3rd successful generation). */

export const EMAIL_CAPTURE_GEN_THRESHOLD = 3;

const GEN_COUNT_KEY = "firehall_successful_gen_count";
const PROMPT_STATE_KEY = "firehall_email_capture_state";

export type EmailCaptureTrigger = "save" | "generation";

type PromptState = {
  completed: boolean;
  dismissed: boolean;
  shown: boolean;
  lastTrigger?: EmailCaptureTrigger;
};

const DEFAULT_STATE: PromptState = {
  completed: false,
  dismissed: false,
  shown: false,
};

function readPromptState(): PromptState {
  try {
    const raw = localStorage.getItem(PROMPT_STATE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writePromptState(state: PromptState): void {
  try {
    localStorage.setItem(PROMPT_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

export function getPersistedGenerationCount(): number {
  try {
    const n = parseInt(localStorage.getItem(GEN_COUNT_KEY) || "0", 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Call once per successful, non-duplicate meal delivery. Returns new total. */
export function recordSuccessfulGeneration(): number {
  const next = getPersistedGenerationCount() + 1;
  try {
    localStorage.setItem(GEN_COUNT_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function canShowEarnedEmailCapture(): boolean {
  const state = readPromptState();
  return !state.completed && !state.dismissed && !state.shown;
}

export function shouldTriggerEmailCaptureOnGeneration(generationCount: number): boolean {
  return generationCount >= EMAIL_CAPTURE_GEN_THRESHOLD && canShowEarnedEmailCapture();
}

export function shouldTriggerEmailCaptureOnSave(): boolean {
  return canShowEarnedEmailCapture();
}

export function markEmailCaptureShown(trigger: EmailCaptureTrigger): void {
  const state = readPromptState();
  writePromptState({ ...state, shown: true, lastTrigger: trigger });
}

export function markEmailCaptureDismissed(): void {
  const state = readPromptState();
  writePromptState({ ...state, dismissed: true });
}

export function markEmailCaptureCompleted(): void {
  writePromptState({
    completed: true,
    dismissed: false,
    shown: true,
  });
}

let pendingCaptureTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule earned capture after the reward moment (save confirmation / meal on screen).
 * Coalesces rapid double-triggers (e.g. save on 3rd gen).
 */
export function scheduleEarnedEmailCapture(
  trigger: EmailCaptureTrigger,
  onOpen: () => void,
  delayMs = 1000,
): void {
  if (!canShowEarnedEmailCapture()) return;
  if (trigger === "generation" && getPersistedGenerationCount() < EMAIL_CAPTURE_GEN_THRESHOLD) {
    return;
  }

  if (pendingCaptureTimer) {
    clearTimeout(pendingCaptureTimer);
  }

  pendingCaptureTimer = setTimeout(() => {
    pendingCaptureTimer = null;
    if (!canShowEarnedEmailCapture()) return;
    if (trigger === "generation" && getPersistedGenerationCount() < EMAIL_CAPTURE_GEN_THRESHOLD) {
      return;
    }
    markEmailCaptureShown(trigger);
    onOpen();
  }, delayMs);
}

export function cancelScheduledEmailCapture(): void {
  if (pendingCaptureTimer) {
    clearTimeout(pendingCaptureTimer);
    pendingCaptureTimer = null;
  }
}
