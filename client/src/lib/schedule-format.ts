/**
 * Display helpers for shift local times ("YYYY-MM-DDTHH:MM" already in the
 * schedule's zone). Formatting runs in UTC so the device zone never shifts them.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateParts(local: string): { y: number; m: number; d: number; weekday: number } {
  const [y, m, d] = local.slice(0, 10).split("-").map(Number) as [number, number, number];
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

export function shiftDayParts(local: string): { weekday: string; day: string; month: string } {
  const p = dateParts(local);
  return { weekday: WEEKDAYS[p.weekday]!, day: String(p.d), month: MONTHS[p.m - 1]! };
}

/** "Thu, Oct 8" */
export function formatLocalDay(local: string): string {
  const p = shiftDayParts(local);
  return `${p.weekday}, ${p.month} ${p.day}`;
}

/** "07:00 → 07:00 Fri" (end day named only when it differs from the start day). */
export function formatShiftTimes(startLocal: string, endLocal: string): string {
  const startTime = startLocal.slice(11, 16);
  const endTime = endLocal.slice(11, 16);
  const sameDay = startLocal.slice(0, 10) === endLocal.slice(0, 10);
  return `${startTime} → ${endTime}${sameDay ? "" : ` ${shiftDayParts(endLocal).weekday}`}`;
}

/** "YYYY-MM-DD" for a date offset from today in `timeZone`. */
export function localDateInZone(timeZone: string, offsetDays = 0, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const base = Date.UTC(get("year"), get("month") - 1, get("day")) + offsetDays * 86_400_000;
  return new Date(base).toISOString().slice(0, 10);
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto";
  } catch {
    return "America/Toronto";
  }
}

const COMMON_ZONES = [
  "America/St_Johns",
  "America/Halifax",
  "America/Toronto",
  "America/New_York",
  "America/Chicago",
  "America/Winnipeg",
  "America/Regina",
  "America/Denver",
  "America/Edmonton",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Anchorage",
  "Pacific/Honolulu",
];

/** Common North American zones first, then every zone the browser knows. */
export function timeZoneOptions(include: string[] = []): string[] {
  let all: string[] = [];
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    all = supported ? supported("timeZone") : [];
  } catch {
    all = [];
  }
  const first = [...new Set([...include.filter(Boolean), ...COMMON_ZONES])];
  return [...first, ...all.filter((z) => !first.includes(z))];
}

export function timeZoneLabel(zone: string): string {
  return zone.replace(/_/g, " ");
}
