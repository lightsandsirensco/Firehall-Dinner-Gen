/**
 * Manual trigger for the shift-reminder scheduler (POST /api/shift-reminder/run).
 *
 * The endpoint only exists when SHIFT_REMINDER_RUN_KEY is configured, and then
 * requires that key in the `x-shift-reminder-key` header. Kept free of DB/store
 * imports so the auth rules are unit-testable — see
 * scripts/test-shift-reminder-run-auth.ts.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler, Response } from "express";
import { logError } from "../logger.js";

export const SHIFT_REMINDER_RUN_KEY_HEADER = "x-shift-reminder-key";

export type ShiftReminderRunAuth = "authorized" | "disabled" | "unauthorized";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function authorizeShiftReminderRun(
  providedKey: string | undefined,
  configuredKey: string | undefined,
): ShiftReminderRunAuth {
  const expected = configuredKey?.trim();
  if (!expected) return "disabled";
  if (!providedKey) return "unauthorized";
  return timingSafeEqual(sha256(providedKey), sha256(expected)) ? "authorized" : "unauthorized";
}

export function createShiftReminderRunHandler(deps: {
  runDue: () => Promise<number>;
  getConfiguredKey?: () => string | undefined;
}): RequestHandler {
  const getConfiguredKey = deps.getConfiguredKey ?? (() => process.env.SHIFT_REMINDER_RUN_KEY);

  return async (req: Request, res: Response) => {
    const auth = authorizeShiftReminderRun(req.get(SHIFT_REMINDER_RUN_KEY_HEADER), getConfiguredKey());
    if (auth === "disabled") {
      return res.status(404).json({ message: "Not found" });
    }
    if (auth === "unauthorized") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const sent = await deps.runDue();
      return res.json({ ok: true, sent });
    } catch (err) {
      logError("shift-reminder", "manual run failed", err);
      return res.status(500).json({ message: "Failed to run shift reminders" });
    }
  };
}
