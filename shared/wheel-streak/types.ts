/**
 * Classics Wheel streak — shift cadence gamification (device-local).
 */

export const WHEEL_STREAK_SCHEMA_VERSION = 1 as const;

export interface WheelStreakSnapshot {
  schemaVersion: typeof WHEEL_STREAK_SCHEMA_VERSION;
  hallId: string;
  totalSpins: number;
  currentStreak: number;
  longestStreak: number;
  weeklySpins: number;
  /** Local calendar week bucket, e.g. `2026-W26`. */
  weekKey: string;
  wednesdayStreak: number;
  /** Unique local spin days (YYYY-MM-DD). */
  spinDays: string[];
  lastSpinAt?: string;
  lastSpinDay?: string;
  updatedAt: string;
}

export interface WheelStreakSpinResult {
  snapshot: WheelStreakSnapshot;
  streakBroken: boolean;
  previousStreak: number;
  isNewShiftDay: boolean;
}
