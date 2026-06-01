/**
 * Firehall Meals product analytics — event names and metadata shapes.
 */

export const ANALYTICS_EVENT_TYPES = [
  "page_view",
  "recipe_view",
  "recipe_save",
  "recipe_share",
  "recipe_print",
  "recipe_copy",
  "meal_generated",
  "meal_generation_started",
  "meal_generation_failed",
  "wheel_spin",
  "wheel_recipe_open",
  "wheel_recipe_cook",
  "email_capture",
  "search",
  "explore_filter",
  "explore_recipe_click",
  "hall_vote_create",
  "hall_vote_share",
  "hall_vote_cast",
  "shopping_list_open",
  "shopping_list_action",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export type AnalyticsPeriod = "today" | "7d" | "30d" | "all";

export interface AnalyticsEventInput {
  event_type: AnalyticsEventType;
  route?: string;
  visitor_id?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface AnalyticsDashboardSummary {
  period: AnalyticsPeriod;
  generated_at: string;
  visitors: number;
  unique_visitors: number;
  sessions: number;
  returning_visitors: number;
  page_views: number;
  recipe_views: number;
  meal_generations: number;
  wheel_spins: number;
  email_captures: number;
  avg_pages_per_session: number;
}

export interface AnalyticsRankedRow {
  key: string;
  label: string;
  count: number;
}

export interface AnalyticsDashboardPayload {
  summary: AnalyticsDashboardSummary;
  top_viewed_recipes: AnalyticsRankedRow[];
  top_generated_meals: AnalyticsRankedRow[];
  top_shared_recipes: AnalyticsRankedRow[];
  top_saved_recipes: AnalyticsRankedRow[];
  top_wheel_landings: AnalyticsRankedRow[];
  top_searches: AnalyticsRankedRow[];
  top_explore_filters: AnalyticsRankedRow[];
  top_explore_categories: AnalyticsRankedRow[];
  top_explore_clicks: AnalyticsRankedRow[];
  top_traffic_sources: AnalyticsRankedRow[];
  never_viewed_recipes_sample: AnalyticsRankedRow[];
  generation_success_rate: number;
}
