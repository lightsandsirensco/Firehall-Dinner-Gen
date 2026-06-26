import { useEffect, useMemo, useState } from "react";
import {
  getWheelStreakSnapshot,
  WHEEL_STREAK_CHANGED_EVENT,
} from "@/lib/wheel-streak-store";

export function useWheelStreak() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1);
    window.addEventListener(WHEEL_STREAK_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(WHEEL_STREAK_CHANGED_EVENT, onChange);
  }, []);

  return useMemo(() => getWheelStreakSnapshot(), [version]);
}
