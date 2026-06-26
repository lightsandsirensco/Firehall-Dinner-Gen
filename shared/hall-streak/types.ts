export const HALL_STREAK_KINDS = ["meals", "votes", "wheel"] as const;
export type HallStreakKind = (typeof HALL_STREAK_KINDS)[number];

export interface HallStreakCounts {
  current: number;
  longest: number;
}

export interface HallStreaksSnapshot {
  hall: {
    meals: HallStreakCounts;
    votes: HallStreakCounts;
    wheel: HallStreakCounts;
  };
  shift: {
    label: string;
    meals: HallStreakCounts;
    votes: HallStreakCounts;
    wheel: HallStreakCounts;
  } | null;
}

export interface HallStreakDisplayRow {
  id: string;
  scopeLabel: string;
  kind: HallStreakKind;
  current: number;
  longest: number;
  featured?: boolean;
}
