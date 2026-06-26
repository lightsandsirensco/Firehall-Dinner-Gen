import { useEffect } from "react";
import { trackShiftReminderClicked, trackShiftReminderOpened } from "@/lib/analytics";

const TRACKED_KEY = "fh_shift_reminder_tracked";

function markTracked(sendId: string, kind: string): boolean {
  try {
    const raw = sessionStorage.getItem(TRACKED_KEY);
    const set = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    const key = `${sendId}:${kind}`;
    if (set.has(key)) return false;
    set.add(key);
    sessionStorage.setItem(TRACKED_KEY, JSON.stringify([...set].slice(-40)));
    return true;
  } catch {
    return true;
  }
}

/** Fire client analytics when landing from a shift reminder email link. */
export function useShiftReminderAttribution(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sendId = params.get("sr_send")?.trim();
    if (!sendId) return;

    const action = params.get("shift_action")?.trim();
    if (markTracked(sendId, "opened")) {
      trackShiftReminderOpened(sendId, action || undefined);
    }
    if (action && markTracked(sendId, `click:${action}`)) {
      trackShiftReminderClicked(sendId, action);
    }
  }, []);
}
