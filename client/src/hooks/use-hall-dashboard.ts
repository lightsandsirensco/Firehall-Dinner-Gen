import { useMemo } from "react";
import { useHallHistory } from "@/hooks/use-hall-history";
import { useHallFavorites } from "@/hooks/use-hall-favorites";
import { useHallProfile } from "@/hooks/use-hall-profile";
import { useWheelStreak } from "@/hooks/use-wheel-streak";
import { useAuth } from "@/lib/auth/context";
import { useHallMembership } from "@/lib/hall-membership/context";
import {
  countHistoryByType,
  countMealsCookedThisMonth,
  getMostCookedMeals,
} from "@/lib/hall-history-store";
import { buildHallStreaksSnapshot } from "@shared/hall-streak/compute";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { resolveCanteenManagerDisplayName } from "@shared/hall-identity/display";
import type { HallHistoryEntry } from "@shared/hall-profile/types";

function entryRecipeHref(entry?: HallHistoryEntry): string | undefined {
  if (!entry) return undefined;
  if (entry.recipePath) return entry.recipePath;
  if (entry.recipeSlug) return approvedCatalogRecipePath(entry.recipeSlug);
  return undefined;
}

export function useHallDashboard() {
  const { authenticated, user } = useAuth();
  const { activeHall, detail, hasPermission, loading: membershipLoading } = useHallMembership();
  const history = useHallHistory();
  const { favorites, count: favoriteCount } = useHallFavorites();
  const { profile } = useHallProfile();
  const wheelStreak = useWheelStreak();

  return useMemo(() => {
    const mostCooked = getMostCookedMeals(1)[0];
    const lastVote = history.hallVotes[0];
    const lastWheel = history.wheelResults[0];
    const lastGenerated = history.entries.find((entry) => entry.type === "meal_generated");
    const tonightPick = history.lastMealCooked ?? lastWheel ?? lastGenerated;
    const mealsThisMonth = countMealsCookedThisMonth();

    const hall = detail?.hall;
    const members = detail?.members ?? [];

    const hallName = hall?.hall_name?.trim() || activeHall?.hall_name?.trim() || "Hall";

    const stationNumber = hall?.station_number ?? activeHall?.station_number ?? null;

    const department =
      hall?.department_name ?? hall?.department ?? activeHall?.department_name ?? activeHall?.department ?? null;

    const city = hall?.city ?? null;
    const hallPhotoUrl = hall?.hall_photo_url ?? null;
    const motto = hall?.motto ?? null;
    const canteenManagerName = hall
      ? resolveCanteenManagerDisplayName(
          hall.canteen_manager_display_name,
          hall.canteen_manager_user_id,
          members,
        )
      : null;

    const crewSize = hall?.crew_size ?? profile.defaultCrewSize;
    const shiftNames =
      detail?.shifts.filter((shift) => shift.enabled).map((shift) => shift.name) ??
      hall?.shift_names ??
      [];
    const myMember = members.find((member) => member.user_id === user?.user_id);
    const shiftName =
      myMember?.shift_name ??
      (shiftNames.length === 1 ? shiftNames[0] : null);
    const myShiftId = myMember?.shift_id ?? null;
    const memberCount = detail ? members.length : (activeHall?.member_count ?? 0);
    const identityLoading = Boolean(activeHall?.hall_id && membershipLoading && !detail);
    const canManageSettings = hasPermission("manage_settings");
    const streaks = buildHallStreaksSnapshot({
      entries: history.entries,
      wheelCurrent: wheelStreak.currentStreak,
      wheelLongest: wheelStreak.longestStreak,
      shiftLabel: shiftName,
    });
    const hallStreak = streaks.hall.meals.current;

    return {
      authenticated,
      hallName,
      stationNumber,
      department,
      city,
      hallPhotoUrl,
      motto,
      canteenManagerName,
      crewSize,
      shiftNames,
      shiftName,
      myShiftId,
      memberCount,
      members,
      identityLoading,
      canManageSettings,
      activeHallId: activeHall?.hall_id ?? null,
      canManageShoppingLists: hasPermission("manage_shopping_lists"),
      stats: {
        mealsCooked: countHistoryByType("meal_cooked"),
        votesCreated: countHistoryByType("hall_vote"),
        wheelSpins: wheelStreak.totalSpins,
        hallStreak,
        mostCooked,
      },
      mealsThisMonth,
      tonightPick,
      tonightRecipeHref: entryRecipeHref(tonightPick),
      cookHref: entryRecipeHref(history.lastMealCooked) ?? entryRecipeHref(tonightPick),
      lastMealCooked: history.lastMealCooked,
      lastVote,
      favorites,
      favoriteCount,
      recentlyCooked: history.recentlyCooked,
      wheelResults: history.wheelResults,
      wheelStreak,
      isEmpty: history.entries.length === 0 && favoriteCount === 0,
    };
  }, [
    authenticated,
    activeHall,
    detail,
    hasPermission,
    membershipLoading,
    history,
    favorites,
    favoriteCount,
    profile,
    wheelStreak,
    user?.user_id,
  ]);
}
