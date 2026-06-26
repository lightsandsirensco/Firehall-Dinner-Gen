import type { HallHistoryEntry } from "./types.js";

export function daysBetween(earlier: Date, later: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function formatCookedDate(date: Date, now = new Date()): string {
  const opts: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { month: "long", day: "numeric" }
      : { month: "long", day: "numeric", year: "numeric" };
  return date.toLocaleDateString("en-US", opts);
}

/** User-facing line for a prior cook — e.g. "We made this 9 days ago." */
export function formatLastCookedMessage(entry: HallHistoryEntry, now = new Date()): string {
  const cookedAt = new Date(entry.at);
  if (Number.isNaN(cookedAt.getTime())) return "";

  const shift = entry.shiftLabel?.trim();
  if (shift) {
    return `Last cooked by ${shift} on ${formatCookedDate(cookedAt, now)}.`;
  }

  const days = daysBetween(cookedAt, now);
  if (days === 0) return "We made this today.";
  if (days === 1) return "We made this yesterday.";
  return `We made this ${days} days ago.`;
}

export function daysSinceCooked(entry: HallHistoryEntry, now = new Date()): number {
  const cookedAt = new Date(entry.at);
  if (Number.isNaN(cookedAt.getTime())) return Number.POSITIVE_INFINITY;
  return daysBetween(cookedAt, now);
}

export function isWithinRepeatCooldown(
  entry: HallHistoryEntry | undefined,
  cooldownDays: number,
  now = new Date(),
): boolean {
  if (!entry) return false;
  return daysSinceCooked(entry, now) < cooldownDays;
}
