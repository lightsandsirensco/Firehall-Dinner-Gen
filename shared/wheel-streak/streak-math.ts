/** Local calendar date key (YYYY-MM-DD). */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function previousLocalDateKey(key: string): string {
  const date = parseLocalDateKey(key);
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}

export function daysBetweenLocalKeys(earlier: string, later: string): number {
  const a = parseLocalDateKey(earlier).getTime();
  const b = parseLocalDateKey(later).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/** ISO week key (Monday-based week per ISO 8601). */
export function localWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Consecutive shift days with at least one spin, ending on the most recent spin day. */
export function computeShiftStreak(spinDays: Iterable<string>): number {
  const days = new Set(spinDays);
  if (days.size === 0) return 0;
  const sorted = [...days].sort((a, b) => b.localeCompare(a));
  let streak = 0;
  let cursor = sorted[0]!;
  while (days.has(cursor)) {
    streak += 1;
    cursor = previousLocalDateKey(cursor);
  }
  return streak;
}

function dateKeyMinusDays(key: string, days: number): string {
  const date = parseLocalDateKey(key);
  date.setDate(date.getDate() - days);
  return localDateKey(date);
}

/** Consecutive Wednesdays with at least one spin. */
export function computeWednesdayStreak(spinDays: Iterable<string>): number {
  const wednesdays = [...new Set(spinDays)].filter(
    (key) => parseLocalDateKey(key).getDay() === 3,
  );
  if (wednesdays.length === 0) return 0;

  const set = new Set(wednesdays);
  const sorted = [...set].sort((a, b) => b.localeCompare(a));
  let streak = 0;
  let cursor = sorted[0]!;
  while (set.has(cursor)) {
    streak += 1;
    cursor = dateKeyMinusDays(cursor, 7);
  }
  return streak;
}

export function isWednesday(date: Date): boolean {
  return date.getDay() === 3;
}
