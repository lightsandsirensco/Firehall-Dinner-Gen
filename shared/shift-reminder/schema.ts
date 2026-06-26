import { z } from "zod";
import { SHIFT_WEEKDAYS } from "./types.js";

export const shiftReminderSettingsSchema = z.object({
  shift_reminders_enabled: z.boolean().optional(),
  shift_days: z.array(z.coerce.number().int().min(0).max(6)).max(7).optional(),
  shift_reminder_time: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/)
    .optional(),
  shift_reminder_timezone: z.string().min(3).max(80).optional(),
});

export function normalizeShiftDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set<number>();
  for (const value of raw) {
    const n = Number(value);
    if (SHIFT_WEEKDAYS.includes(n as (typeof SHIFT_WEEKDAYS)[number])) {
      set.add(n);
    }
  }
  return [...set].sort((a, b) => a - b);
}
