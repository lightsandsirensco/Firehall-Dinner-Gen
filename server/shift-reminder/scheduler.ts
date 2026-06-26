import { log, logError } from "../logger.js";
import { insertAnalyticsEvents } from "../analytics/analytics-store.js";
import {
  createShiftReminderSend,
  initShiftReminderStore,
  listDueShiftReminders,
  type ShiftReminderCandidate,
} from "./store.js";
import { sendShiftReminderEmail } from "./mail.js";
import { weekdayForDateKey } from "../../shared/shift-reminder/scheduling.js";
import { SHIFT_WEEKDAY_LABELS } from "../../shared/shift-reminder/types.js";

let storeReady = false;
let schedulerStarted = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initShiftReminderStore();
    storeReady = true;
  }
}

function shiftDateLabel(shiftDate: string, timeZone: string): string {
  const weekday = weekdayForDateKey(shiftDate, timeZone);
  const label = SHIFT_WEEKDAY_LABELS[weekday];
  const [, month, day] = shiftDate.split("-");
  return `${label} ${Number(month)}/${Number(day)}`;
}

function trackSent(candidate: ShiftReminderCandidate, sendId: string): void {
  try {
    insertAnalyticsEvents([
      {
        event_type: "shift_reminder_sent",
        route: "/api/shift-reminder/send",
        metadata: {
          user_id: candidate.user_id,
          send_id: sendId,
          shift_date: candidate.shift_date,
        },
      },
    ]);
  } catch {
    /* optional */
  }
}

export async function processDueShiftReminders(now = new Date()): Promise<number> {
  await ensureStore();
  const due = listDueShiftReminders(now);
  let sentCount = 0;

  for (const candidate of due) {
    try {
      const sendId = createShiftReminderSend(candidate.user_id, candidate.shift_date);
      const mail = await sendShiftReminderEmail({
        sendId,
        email: candidate.email,
        displayName: candidate.display_name,
        shiftDateLabel: shiftDateLabel(
          candidate.shift_date,
          candidate.settings.shift_reminder_timezone,
        ),
      });
      trackSent(candidate, sendId);
      sentCount += 1;
      log(
        `[shift-reminder] sent user=${candidate.user_id} shift=${candidate.shift_date} smtp=${mail.sent}`,
        "email",
      );
    } catch (err) {
      logError("shift-reminder", "send failed", err);
    }
  }

  return sentCount;
}

const TICK_MS = 15 * 60 * 1000;

export function startShiftReminderScheduler(): void {
  if (schedulerStarted || process.env.SHIFT_REMINDER_SCHEDULER === "off") return;
  schedulerStarted = true;

  void processDueShiftReminders().catch((err) => {
    logError("shift-reminder", "initial tick failed", err);
  });

  setInterval(() => {
    void processDueShiftReminders().catch((err) => {
      logError("shift-reminder", "scheduler tick failed", err);
    });
  }, TICK_MS);

  log("[shift-reminder] scheduler started (15m interval)", "startup");
}
