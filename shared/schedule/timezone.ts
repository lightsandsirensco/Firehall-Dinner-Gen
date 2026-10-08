/**
 * IANA timezone math on top of Intl (no tz library dependency).
 *
 * "Wall" values are local calendar/clock readings encoded as milliseconds on
 * a UTC-like timeline (Date.UTC(y, m, d, h, min)). Arithmetic on wall values
 * is pure calendar arithmetic — adding 24h of wall time always lands on the
 * same clock time tomorrow, leap days included — and only the conversion to
 * a real instant consults the timezone.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, fmt);
  }
  return fmt;
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== "string") return false;
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** Local wall reading (as wall ms) for a real instant. */
export function instantToWall(instantMs: number, timeZone: string): number {
  const parts = formatterFor(timeZone).formatToParts(new Date(instantMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return wall + (instantMs % 1000 + 1000) % 1000;
}

/** UTC offset (wall − instant) in ms at a given instant. */
export function offsetAt(instantMs: number, timeZone: string): number {
  return instantToWall(instantMs, timeZone) - instantMs;
}

export type WallResolution = "exact" | "gap" | "overlap";

/**
 * Real instant for a local wall reading. DST disambiguation follows the
 * Temporal/RFC 5545 "compatible" rule:
 *  - gap (spring forward, the clock reading never happens): move forward by
 *    the gap length, e.g. 02:30 → 03:30;
 *  - overlap (fall back, the reading happens twice): use the earlier one.
 */
export function wallToInstant(
  wallMs: number,
  timeZone: string,
): { instantMs: number; resolution: WallResolution } {
  const before = offsetAt(wallMs - 12 * HOUR_MS, timeZone);
  const after = offsetAt(wallMs + 12 * HOUR_MS, timeZone);
  const candidates = [...new Set([before, after])]
    .map((offset) => wallMs - offset)
    .filter((instant) => instantToWall(instant, timeZone) === wallMs)
    .sort((a, b) => a - b);

  if (candidates.length === 1) return { instantMs: candidates[0]!, resolution: "exact" };
  if (candidates.length > 1) return { instantMs: candidates[0]!, resolution: "overlap" };
  return { instantMs: wallMs - before, resolution: "gap" };
}

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;

/** "YYYY-MM-DD" → wall ms at local midnight, or null if not a real calendar date. */
export function parseLocalDate(value: string): number | null {
  const m = LOCAL_DATE_RE.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const wall = Date.UTC(y, mo - 1, d);
  const check = new Date(wall);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return wall;
}

/** "HH:MM" (24h) → minutes after midnight, or null. */
export function parseLocalTime(value: string): number | null {
  const m = LOCAL_TIME_RE.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** "YYYY-MM-DDTHH:MM" → wall ms, or null. */
export function parseLocalDateTime(value: string): number | null {
  const m = LOCAL_DATETIME_RE.exec(value);
  if (!m) return null;
  const date = parseLocalDate(`${m[1]}-${m[2]}-${m[3]}`);
  if (date == null) return null;
  return date + (Number(m[4]) * 60 + Number(m[5])) * MINUTE_MS;
}

/** wall ms → "YYYY-MM-DDTHH:MM". */
export function formatLocalDateTime(wallMs: number): string {
  return new Date(wallMs).toISOString().slice(0, 16);
}
