import type { HallShiftKey } from "../hall-identity/shifts.js";

export interface HallLeaderboardRankedRow {
  rank: number;
  label: string;
  count: number;
  shift_label?: string | null;
  shift_key?: HallShiftKey | null;
  recipe_slug?: string | null;
}

export interface HallLeaderboardPayload {
  month_label: string;
  most_cooked_meals: HallLeaderboardRankedRow[];
  most_active_shifts: HallLeaderboardRankedRow[];
  wheel_champion: HallLeaderboardRankedRow | null;
  wheel_champions: HallLeaderboardRankedRow[];
  top_voted_shifts: HallLeaderboardRankedRow[];
}
