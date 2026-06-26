import type { Express, Response } from "express";
import { logError } from "../logger.js";
import { insertAnalyticsEvents } from "../analytics/analytics-store.js";
import {
  getShiftReminderSend,
  initShiftReminderStore,
  markShiftReminderClicked,
  markShiftReminderOpened,
} from "./store.js";
import { processDueShiftReminders, startShiftReminderScheduler } from "./scheduler.js";
import { redirectPathForAction } from "./mail.js";
import { SHIFT_REMINDER_ACTIONS, type ShiftReminderAction } from "../../shared/shift-reminder/types.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initShiftReminderStore();
    storeReady = true;
  }
}

function trackShiftEvent(
  eventType: "shift_reminder_opened" | "shift_reminder_clicked",
  metadata: Record<string, string>,
): void {
  try {
    insertAnalyticsEvents([{ event_type: eventType, route: "/api/shift-reminder", metadata }]);
  } catch {
    /* optional */
  }
}

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export function registerShiftReminderRoutes(app: Express): void {
  startShiftReminderScheduler();

  app.get("/api/shift-reminder/open/:sendId", async (req, res: Response) => {
    try {
      await ensureStore();
      const sendId = String(req.params.sendId ?? "");
      const send = getShiftReminderSend(sendId);
      if (!send) {
        return res.status(404).end();
      }

      const firstOpen = markShiftReminderOpened(sendId);
      if (firstOpen) {
        trackShiftEvent("shift_reminder_opened", {
          send_id: sendId,
          user_id: send.user_id,
          shift_date: send.shift_date,
        });
      }

      res.setHeader("Content-Type", "image/gif");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      return res.status(200).send(TRANSPARENT_GIF);
    } catch (err) {
      logError("shift-reminder", "open track failed", err);
      return res.status(500).end();
    }
  });

  app.get("/api/shift-reminder/click/:sendId", async (req, res: Response) => {
    try {
      await ensureStore();
      const sendId = String(req.params.sendId ?? "");
      const actionRaw = String(req.query.action ?? "generate");
      const action = SHIFT_REMINDER_ACTIONS.includes(actionRaw as ShiftReminderAction)
        ? (actionRaw as ShiftReminderAction)
        : "generate";

      const result = markShiftReminderClicked(sendId, action);
      if (!result) {
        return res.redirect(302, "/generator");
      }

      if (result.firstClick) {
        trackShiftEvent("shift_reminder_clicked", {
          send_id: sendId,
          user_id: result.user_id,
          shift_date: result.shift_date,
          action,
        });
      }

      return res.redirect(302, redirectPathForAction(action, sendId));
    } catch (err) {
      logError("shift-reminder", "click redirect failed", err);
      return res.redirect(302, "/generator");
    }
  });

  app.post("/api/shift-reminder/run", async (_req, res: Response) => {
    try {
      if (process.env.NODE_ENV === "production" && process.env.SHIFT_REMINDER_RUN_KEY) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await ensureStore();
      const sent = await processDueShiftReminders();
      return res.json({ ok: true, sent });
    } catch (err) {
      logError("shift-reminder", "manual run failed", err);
      return res.status(500).json({ message: "Failed to run shift reminders" });
    }
  });
}
