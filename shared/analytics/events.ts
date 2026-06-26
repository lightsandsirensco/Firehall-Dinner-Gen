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
  "hall_vote_started",
  "hall_vote_shared",
  "hall_vote_submitted",
  /** @deprecated Use hall_vote_started */
  "hall_vote_create",
  /** @deprecated Use hall_vote_shared */
  "hall_vote_share",
  /** @deprecated Use hall_vote_submitted */
  "hall_vote_cast",
  "shopping_list_open",
  "shopping_list_action",
  "hall_history_viewed",
  "hall_meal_repeated",
  "hall_recent_meal_clicked",
  "hall_favorite_added",
  "hall_favorite_removed",
  "hall_favorites_viewed",
  "hall_dashboard_viewed",
  "shift_dashboard_viewed",
  "shift_meal_selected",
  "shift_vote_created",
  "wheel_streak_updated",
  "wheel_streak_broken",
  "meal_cooked",
  "hall_of_fame_viewed",
  "pwa_prompt_shown",
  "pwa_installed",
  "account_created",
  "login",
  "profile_updated",
  "hall_created",
  "hall_updated",
  "shift_created",
  "hall_joined",
  "hall_invite_sent",
  "hall_invite_accepted",
  "hall_activation_started",
  "hall_onboarding_started",
  "personal_onboarding_started",
  "personal_onboarding_step_completed",
  "personal_onboarding_completed",
  "personal_onboarding_hall_choice",
  "hall_activation_completed",
  "hall_first_invite_sent",
  "hall_first_vote_created",
  "shared_shopping_list_created",
  "shared_shopping_list_updated",
  "shared_shopping_list_exported",
  "shared_shopping_list_completed",
  "hall_supply_updated",
  "hall_supply_restocked",
  "hall_supply_viewed",
  "canteen_viewed",
  "canteen_item_reported",
  "canteen_item_low",
  "canteen_item_out",
  "canteen_item_requested",
  "canteen_item_purchased",
  "canteen_item_restocked",
  "canteen_manager_assigned",
  "shift_reminder_sent",
  "shift_reminder_opened",
  "shift_reminder_clicked",
  "hall_analytics_viewed",
  "growth_dashboard_viewed",
  "plan_viewed",
  "plan_selected",
  "paywall_viewed",
  "hall_pro_enabled",
  "hall_pro_trial_started",
  "hall_pro_converted",
  "hall_program_viewed",
  "hall_program_started",
  "sync_completed",
  "sync_failed",
  "admin_users_viewed",
  "admin_user_opened",
  "admin_leads_viewed",
  "protein_deals_viewed",
  "protein_deal_clicked",
  "protein_recipe_generated",
  "protein_shopping_list_created",
  "postal_code_saved",
  "nearby_stores_loaded",
  "preferred_store_added",
  "preferred_store_removed",
  "protein_setup_completed",
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
