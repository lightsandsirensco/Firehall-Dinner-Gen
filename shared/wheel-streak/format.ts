import type { WheelStreakSnapshot } from "./types.js";
import { isWednesday, localDateKey } from "./streak-math.js";

export function wheelStreakHeadline(snapshot: WheelStreakSnapshot, now = new Date()): string {
  const today = localDateKey(now);

  if (snapshot.wednesdayStreak >= 2 && isWednesday(now)) {
    return `Wheel Wednesday streak — ${snapshot.wednesdayStreak} in a row.`;
  }
  if (snapshot.currentStreak >= 2) {
    return `${snapshot.currentStreak} shifts in a row.`;
  }
  if (snapshot.currentStreak === 1 && snapshot.lastSpinDay === today) {
    return "Streak started — spin again next shift.";
  }
  if (snapshot.totalSpins > 0) {
    return "Build a shift streak — one spin per tour.";
  }
  return "Spin the wheel to start your crew streak.";
}

export function wheelStreakKeepAliveMessage(
  snapshot: WheelStreakSnapshot,
  now = new Date(),
): string | null {
  const today = localDateKey(now);
  if (snapshot.currentStreak < 1) return null;
  if (snapshot.lastSpinDay === today) return null;
  return "Keep the streak alive.";
}
