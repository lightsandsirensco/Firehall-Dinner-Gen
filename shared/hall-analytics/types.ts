export const HALL_ACTIVITY_TYPES = [
  "meal_cooked",
  "vote_created",
  "wheel_spin",
  "shopping_list_completed",
] as const;

export type HallActivityType = (typeof HALL_ACTIVITY_TYPES)[number];

export interface HallActivityEvent {
  activity_id: string;
  hall_id: string;
  user_id: string | null;
  event_type: HallActivityType;
  external_id: string;
  title: string;
  recipe_slug: string | null;
  cuisine: string | null;
  category: string | null;
  shift_label: string | null;
  occurred_at: string;
}

export interface HallAnalyticsRankedRow {
  label: string;
  count: number;
  recipe_slug?: string | null;
}

export interface HallAnalyticsPayload {
  hall_id: string;
  generated_at: string;
  metrics: {
    meals_cooked: number;
    votes_created: number;
    wheel_spins: number;
    shopping_lists: number;
    meal_streak: number;
    most_active_shift: string | null;
  };
  top_meals: HallAnalyticsRankedRow[];
  cards: {
    top_meal: HallAnalyticsRankedRow | null;
    top_cuisine: HallAnalyticsRankedRow | null;
    most_cooked_meal: HallAnalyticsRankedRow | null;
    longest_streak: number;
  };
}

export interface HallActivitySyncEntry {
  external_id: string;
  event_type: HallActivityType;
  title: string;
  recipe_slug?: string;
  cuisine?: string;
  category?: string;
  shift_label?: string;
  occurred_at: string;
}
