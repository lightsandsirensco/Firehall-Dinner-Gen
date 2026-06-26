import { useEffect, useMemo, useState } from "react";
import {
  getHallHistoryEntries,
  getRecentlyCooked,
  getRecentHallVotes,
  getRecentWheelResults,
  getLastEntryForSlug,
  getLastMealCooked,
  getMostCookedThisMonth,
  getMostGeneratedMeals,
  shouldAvoidRepeat,
} from "@/lib/hall-history-store";
import { HALL_HISTORY_CHANGED_EVENT } from "@/lib/hall-history-store";

export function useHallHistory() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1);
    window.addEventListener(HALL_HISTORY_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(HALL_HISTORY_CHANGED_EVENT, onChange);
  }, []);

  return useMemo(
    () => ({
      entries: getHallHistoryEntries(),
      recentlyCooked: getRecentlyCooked(),
      wheelResults: getRecentWheelResults(),
      hallVotes: getRecentHallVotes(),
      lastMealCooked: getLastMealCooked(),
      mostCookedThisMonth: getMostCookedThisMonth(),
      mostGeneratedMeals: getMostGeneratedMeals(),
      lastCookedForSlug: getLastEntryForSlug,
      shouldAvoidRepeat,
    }),
    [version],
  );
}
