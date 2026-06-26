import {
  WHEEL_STREAK_SCHEMA_VERSION,
  type WheelStreakSnapshot,
  type WheelStreakSpinResult,
} from "@shared/wheel-streak/types";
import {
  computeShiftStreak,
  computeWednesdayStreak,
  daysBetweenLocalKeys,
  localDateKey,
  localWeekKey,
} from "@shared/wheel-streak/streak-math";
import { getHallProfile } from "@/lib/hall-profile-store";
import { getHallHistoryEntries } from "@/lib/hall-history-store";
import {
  trackWheelStreakBroken,
  trackWheelStreakUpdated,
} from "@/lib/analytics";

const STORAGE_KEY = "firehall_wheel_streak_v1";
const BACKFILL_FLAG = "firehall_wheel_streak_backfilled_v1";

export const WHEEL_STREAK_CHANGED_EVENT = "wheel-streak-changed";

function dispatchChanged(): void {
  window.dispatchEvent(new Event(WHEEL_STREAK_CHANGED_EVENT));
}

function emptySnapshot(hallId: string, now = new Date()): WheelStreakSnapshot {
  return {
    schemaVersion: WHEEL_STREAK_SCHEMA_VERSION,
    hallId,
    totalSpins: 0,
    currentStreak: 0,
    longestStreak: 0,
    weeklySpins: 0,
    weekKey: localWeekKey(now),
    wednesdayStreak: 0,
    spinDays: [],
    updatedAt: now.toISOString(),
  };
}

function recomputeDerived(snapshot: WheelStreakSnapshot): WheelStreakSnapshot {
  const spinDaySet = new Set(snapshot.spinDays);
  const currentStreak = computeShiftStreak(spinDaySet);
  const wednesdayStreak = computeWednesdayStreak(spinDaySet);
  const longestStreak = Math.max(snapshot.longestStreak, currentStreak);
  return {
    ...snapshot,
    currentStreak,
    wednesdayStreak,
    longestStreak,
  };
}

function parseSnapshot(raw: string, hallId: string): WheelStreakSnapshot {
  try {
    const parsed = JSON.parse(raw) as WheelStreakSnapshot;
    if (parsed?.schemaVersion !== WHEEL_STREAK_SCHEMA_VERSION) return emptySnapshot(hallId);
    if (parsed.hallId !== hallId) return emptySnapshot(hallId);
    const spinDays = Array.isArray(parsed.spinDays)
      ? [...new Set(parsed.spinDays.filter((d) => typeof d === "string"))]
      : [];
    const base: WheelStreakSnapshot = {
      ...parsed,
      totalSpins: Math.max(0, Number(parsed.totalSpins) || 0),
      weeklySpins: Math.max(0, Number(parsed.weeklySpins) || 0),
      weekKey: typeof parsed.weekKey === "string" ? parsed.weekKey : localWeekKey(new Date()),
      spinDays,
    };
    return recomputeDerived(base);
  } catch {
    return emptySnapshot(hallId);
  }
}

function writeSnapshot(snapshot: WheelStreakSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    dispatchChanged();
  } catch {
    /* quota / private mode */
  }
}

function backfillFromHallHistory(snapshot: WheelStreakSnapshot): WheelStreakSnapshot {
  if (snapshot.totalSpins > 0) return snapshot;
  try {
    if (localStorage.getItem(BACKFILL_FLAG) === snapshot.hallId) return snapshot;
  } catch {
    return snapshot;
  }

  const spinDays: string[] = [];
  let totalSpins = 0;
  let lastSpinAt: string | undefined;
  const weekCounts = new Map<string, number>();

  for (const entry of getHallHistoryEntries()) {
    if (entry.type !== "wheel_result") continue;
    totalSpins += 1;
    const key = localDateKey(new Date(entry.at));
    if (!spinDays.includes(key)) spinDays.push(key);
    if (!lastSpinAt || entry.at > lastSpinAt) lastSpinAt = entry.at;
    const wk = localWeekKey(new Date(entry.at));
    weekCounts.set(wk, (weekCounts.get(wk) ?? 0) + 1);
  }

  if (totalSpins === 0) return snapshot;

  const now = new Date();
  const weekKey = localWeekKey(now);
  try {
    localStorage.setItem(BACKFILL_FLAG, snapshot.hallId);
  } catch {
    /* ignore */
  }

  return recomputeDerived({
    ...snapshot,
    totalSpins,
    spinDays: spinDays.sort(),
    lastSpinAt,
    lastSpinDay: lastSpinAt ? localDateKey(new Date(lastSpinAt)) : undefined,
    weekKey,
    weeklySpins: weekCounts.get(weekKey) ?? 0,
    updatedAt: now.toISOString(),
  });
}

export function getWheelStreakSnapshot(): WheelStreakSnapshot {
  const hallId = getHallProfile().hallId;
  const now = new Date();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = backfillFromHallHistory(emptySnapshot(hallId, now));
      if (seeded.totalSpins > 0) writeSnapshot(seeded);
      return seeded;
    }
    const parsed = parseSnapshot(raw, hallId);
    const weekKey = localWeekKey(now);
    const weeklySpins = parsed.weekKey === weekKey ? parsed.weeklySpins : 0;
    const normalized = recomputeDerived({
      ...parsed,
      weekKey,
      weeklySpins,
    });
    return backfillFromHallHistory(normalized);
  } catch {
    return emptySnapshot(hallId, now);
  }
}

/** @deprecated Prefer getWheelStreakSnapshot().currentStreak */
export function getWheelStreak(): number {
  return getWheelStreakSnapshot().currentStreak;
}

export function recordWheelStreakSpin(at = new Date()): WheelStreakSpinResult {
  const hallId = getHallProfile().hallId;
  const snapshot = getWheelStreakSnapshot();
  const today = localDateKey(at);
  const weekKey = localWeekKey(at);
  const previousStreak = snapshot.currentStreak;

  let streakBroken = false;
  if (
    snapshot.lastSpinDay &&
    snapshot.lastSpinDay !== today &&
    daysBetweenLocalKeys(snapshot.lastSpinDay, today) > 1
  ) {
    streakBroken = true;
    trackWheelStreakBroken({
      previous_streak: previousStreak,
      days_since_last_spin: daysBetweenLocalKeys(snapshot.lastSpinDay, today),
    });
  }

  const isNewShiftDay = !snapshot.spinDays.includes(today);
  const spinDays = isNewShiftDay ? [...snapshot.spinDays, today].sort() : snapshot.spinDays;
  const weeklySpins =
    snapshot.weekKey === weekKey ? snapshot.weeklySpins + 1 : 1;

  const next = recomputeDerived({
    ...snapshot,
    hallId,
    totalSpins: snapshot.totalSpins + 1,
    weeklySpins,
    weekKey,
    spinDays,
    lastSpinAt: at.toISOString(),
    lastSpinDay: today,
    updatedAt: at.toISOString(),
  });

  writeSnapshot(next);

  trackWheelStreakUpdated({
    total_spins: next.totalSpins,
    current_streak: next.currentStreak,
    longest_streak: next.longestStreak,
    weekly_spins: next.weeklySpins,
    wednesday_streak: next.wednesdayStreak,
    is_new_shift_day: isNewShiftDay ? 1 : 0,
    streak_broken: streakBroken ? 1 : 0,
  });

  return {
    snapshot: next,
    streakBroken,
    previousStreak,
    isNewShiftDay,
  };
}
