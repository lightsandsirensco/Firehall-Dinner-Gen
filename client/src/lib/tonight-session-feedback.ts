import { emptySessionFeedback, type TonightSessionFeedback } from "@shared/tonight-filters";

/** sessionStorage: "Not feeling it" nudges last for this tab only, never synced or saved to an account. */
const KEY = "firehall_tonight_feedback_v1";

export function loadSessionFeedback(): TonightSessionFeedback {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...emptySessionFeedback(), ...JSON.parse(raw) } : emptySessionFeedback();
  } catch {
    return emptySessionFeedback();
  }
}

export function saveSessionFeedback(feedback: TonightSessionFeedback): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(feedback));
  } catch {}
}

export function clearSessionFeedback(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
