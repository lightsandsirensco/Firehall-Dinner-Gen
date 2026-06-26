import type { ShiftWeekday } from "./types.js";

const WEEKDAY_FROM_SHORT: Record<string, ShiftWeekday> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function parseReminderTime(time: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function dateKeyInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function zonedTimeParts(
  date: Date,
  timeZone: string,
): { dateKey: string; hour: number; minute: number; weekday: ShiftWeekday } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekday = WEEKDAY_FROM_SHORT[lookup.weekday ?? "Sun"] ?? 0;
  const hour = Number(lookup.hour ?? 0);
  const minute = Number(lookup.minute ?? 0);
  const dateKey = `${lookup.year}-${lookup.month}-${lookup.day}`;

  return { dateKey, hour, minute, weekday };
}

export function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return utc.toISOString().slice(0, 10);
}

export function weekdayForDateKey(dateKey: string, timeZone: string): ShiftWeekday {
  const [year, month, day] = dateKey.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekdayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(probe);
  return WEEKDAY_FROM_SHORT[weekdayLabel] ?? 0;
}

export function isWithinReminderWindow(
  currentHour: number,
  currentMinute: number,
  targetHour: number,
  targetMinute: number,
  windowMinutes = 15,
): boolean {
  const current = currentHour * 60 + currentMinute;
  const target = targetHour * 60 + targetMinute;
  return current >= target && current < target + windowMinutes;
}

export function shouldSendShiftReminder(input: {
  shiftDays: ShiftWeekday[];
  reminderTime: string;
  timeZone: string;
  now?: Date;
  alreadySentForShiftDate?: string | null;
}): { send: boolean; shiftDate?: string } {
  if (!input.shiftDays.length) return { send: false };

  const parsed = parseReminderTime(input.reminderTime);
  if (!parsed) return { send: false };

  const now = input.now ?? new Date();
  const zoned = zonedTimeParts(now, input.timeZone);
  if (!isWithinReminderWindow(zoned.hour, zoned.minute, parsed.hour, parsed.minute)) {
    return { send: false };
  }

  const shiftDate = addCalendarDays(zoned.dateKey, 1);
  const tomorrowWeekday = weekdayForDateKey(shiftDate, input.timeZone);
  if (!input.shiftDays.includes(tomorrowWeekday)) {
    return { send: false };
  }

  if (input.alreadySentForShiftDate === shiftDate) {
    return { send: false };
  }

  return { send: true, shiftDate };
}
