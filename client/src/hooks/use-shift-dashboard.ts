import { useEffect, useMemo, useState } from "react";
import { useHallHistory } from "@/hooks/use-hall-history";
import { useHallFavorites } from "@/hooks/use-hall-favorites";
import { fetchHallDetail } from "@/lib/hall-membership/api";
import { useAuth } from "@/lib/auth/context";
import type { HallDetailPayload, HallMemberRecord, HallShiftRecord } from "@shared/hall-membership/types";
import type { HallHistoryEntry } from "@shared/hall-profile/types";
import {
  computeLongestMealStreak,
  countShiftMealsThisMonth,
  countShiftVotesThisMonth,
  filterHistoryForShift,
  filterShiftHistoryByType,
  getShiftMostCookedMeals,
} from "@shared/shift-dashboard/history";

export function useShiftDashboard(hallId: string, shiftId: string) {
  const { authenticated } = useAuth();
  const history = useHallHistory();
  const { favorites, count: favoriteCount } = useHallFavorites();
  const [detail, setDetail] = useState<HallDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hallId || !authenticated) {
      setDetail(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchHallDetail(hallId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
          setError("Hall not found");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hallId, authenticated]);

  return useMemo(() => {
    const shift: HallShiftRecord | undefined = detail?.shifts.find((row) => row.shift_id === shiftId);
    const shiftName = shift?.name ?? "";
    const shiftMembers: HallMemberRecord[] =
      detail?.members.filter((member) => member.shift_id === shiftId) ?? [];
    const crewSize = shiftMembers.length > 0 ? shiftMembers.length : (detail?.hall.crew_size ?? 0);

    const shiftEntries = shiftName
      ? filterHistoryForShift(history.entries, shiftName)
      : ([] as HallHistoryEntry[]);

    const recentlyCooked = filterShiftHistoryByType(history.entries, shiftName, "meal_cooked").slice(
      0,
      8,
    );
    const wheelResults = filterShiftHistoryByType(history.entries, shiftName, "wheel_result").slice(
      0,
      6,
    );
    const recentVotes = filterShiftHistoryByType(history.entries, shiftName, "hall_vote").slice(0, 5);
    const mostCooked = shiftName ? getShiftMostCookedMeals(history.entries, shiftName, 1)[0] : undefined;

    const mealsThisMonth = shiftName ? countShiftMealsThisMonth(history.entries, shiftName) : 0;
    const votesThisMonth = shiftName ? countShiftVotesThisMonth(history.entries, shiftName) : 0;
    const longestMealStreak = shiftName
      ? computeLongestMealStreak(history.entries, shiftName)
      : 0;

    return {
      authenticated,
      loading,
      error,
      detail,
      hallId,
      shiftId,
      shift,
      shiftName,
      hallName: detail?.hall.hall_name ?? "Linked Hall",
      crewSize,
      shiftMembers,
      memberCount: shiftMembers.length,
      shiftEntries,
      recentlyCooked,
      wheelResults,
      recentVotes,
      mostCooked,
      favorites,
      favoriteCount,
      stats: {
        mealsThisMonth,
        votesThisMonth,
        longestMealStreak,
      },
      notFound: !loading && (!detail || !shift || !shift.enabled),
    };
  }, [
    authenticated,
    loading,
    error,
    detail,
    hallId,
    shiftId,
    history.entries,
    favorites,
    favoriteCount,
  ]);
}
