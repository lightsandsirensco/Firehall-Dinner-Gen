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
  "account_deleted",
  "login",
  "magic_link_requested",
  "magic_link_sent",
  "magic_link_failed",
  "magic_link_opened",
  "magic_link_completed",
  "magic_link_expired",
  "profile_updated",
  "google_linked",
  "google_email_collision",
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
  "admin_signups_viewed",
  "admin_signup_opened",
  "admin_signups_exported",
  "protein_deals_viewed",
  "protein_deal_clicked",
  "protein_recipe_generated",
  "protein_shopping_list_created",
  "postal_code_saved",
  "nearby_stores_loaded",
  "preferred_store_added",
  "preferred_store_removed",
  "protein_setup_completed",
  "pro_paywall_viewed",
  "pro_feature_clicked",
  "pro_plan_selected",
  "pro_upgrade_interest",
  "stripe_checkout_started",
  "stripe_checkout_completed",
  "stripe_subscription_updated",
  "stripe_subscription_cancelled",
  "stripe_billing_portal_opened",
  "shop_viewed",
  "shop_product_viewed",
  "shop_checkout_started",
  "shop_purchase_completed",
  "nutrition_goal_selected",
  "nutrition_goal_override",
  "recipe_generated_with_nutrition_goal",
  "meal_logged",
  "meal_rated",
  "meal_make_again_selected",
  "meal_feedback_tag_selected",
  "meal_note_added",
  "history_paywall_viewed",
  "progress_page_viewed",
  "goal_created",
  "goal_completed",
  "goal_removed",
  "insights_page_viewed",
  "insight_viewed",
  "insights_pro_teaser_clicked",
  "history_personalization_used",
  "history_personalization_disabled",
  "personalized_recipe_selected",
  "schedule_setup_started",
  /** Progressive onboarding — the short schedule setup launched from "Plan my shift" on /shift. */
  "schedule_onboarding_started",
  "schedule_onboarding_completed",
  /** params: reason (cancelled | navigated_away | page_hidden), last_step (1–4). */
  "schedule_onboarding_abandoned",
  "schedule_created",
  "schedule_updated",
  "extra_shift_added",
  "shift_override_created",
  "shift_viewed",
  "shift_plan_started",
  "shift_plan_autofilled",
  "shift_meal_swapped",
  "shift_meal_skipped",
  "shift_plan_completed",
  "shift_list_generated",
  "shift_list_opened",
  "shift_list_item_checked",
  "shift_list_manual_item_added",
  "future_shift_viewed",
  "plan_ahead_paywall_viewed",
  "future_shift_plan_created",
  "run_it_back_clicked",
  "run_it_back_completed",
  "run_it_back_paywall_viewed",
  /** Personal Pro paywall — params: feature, trigger, paywall_source. */
  "premium_feature_clicked",
  "premium_paywall_viewed",
  /** Personal Pro reverse trial. started/expired are recorded server-side (once per account). */
  "premium_trial_started",
  "premium_trial_expired",
  /** Client — once per remaining-days value while the trial is active. */
  "premium_trial_day_viewed",
  /** Client — "Keep Pro" / subscribe tapped from a trial surface (status, ending or ended notice, paywall). */
  "premium_trial_upgrade_clicked",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export type AnalyticsPeriod = "today" | "7d" | "30d" | "90d" | "all";

/**
 * Emitted only by the server after the underlying action succeeded (auth,
 * Stripe webhooks, shared lists). The public ingest endpoint drops these so a
 * browser can neither spoof nor double-count them.
 */
export const SERVER_ONLY_ANALYTICS_EVENTS: ReadonlySet<AnalyticsEventType> = new Set<AnalyticsEventType>([
  "account_created",
  "login",
  "magic_link_sent",
  "magic_link_failed",
  "magic_link_opened",
  "magic_link_completed",
  "magic_link_expired",
  "stripe_checkout_started",
  "stripe_checkout_completed",
  "stripe_subscription_updated",
  "stripe_subscription_cancelled",
  "growth_dashboard_viewed",
  "admin_signups_viewed",
  "admin_signup_opened",
  "admin_signups_exported",
]);

export interface AnalyticsEventInput {
  event_type: AnalyticsEventType;
  route?: string;
  visitor_id?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface AnalyticsRankedRow {
  key: string;
  label: string;
  count: number;
}

export interface MagicLinkFunnelStats {
  period: AnalyticsPeriod;
  requested: number;
  sent: number;
  failed: number;
  opened: number;
  completed: number;
  expired: number;
  completion_rate: number;
}

/** A metric that may be unavailable — never a fabricated zero. */
export type MetricValue = number | null;

export interface AnalyticsSectionStatus {
  available: boolean;
  /** Where the numbers come from (shown under the section heading). */
  source: string;
  /** Why the section (or part of it) is unavailable / caveats. */
  note?: string;
}

export interface AnalyticsDailyPoint {
  date: string; // YYYY-MM-DD (UTC)
  page_views: number;
  visitors: number;
}

export interface AnalyticsAudienceSection {
  status: AnalyticsSectionStatus;
  unique_visitors: number;
  new_visitors: number;
  returning_visitors: number;
  sessions: number;
  page_views: number;
  pages_per_session: number;
  /** Sessions attributed by the first page view's source. */
  traffic_sources: AnalyticsRankedRow[];
  top_pages: AnalyticsRankedRow[];
  /** Page views by device; "unknown" = recorded before device tracking. */
  devices: AnalyticsRankedRow[];
  daily: AnalyticsDailyPoint[];
}

export interface AnalyticsGrowthSection {
  status: AnalyticsSectionStatus;
  newsletter_subscribers_total: MetricValue;
  newsletter_signups_new: MetricValue;
  newsletter_unsubscribes: MetricValue;
  newsletter_signups_by_source: AnalyticsRankedRow[];
  registered_users_total: MetricValue;
  registered_users_new: MetricValue;
  /** Distinct emails across accounts + newsletter consent (test domains excluded). */
  known_emails_total: MetricValue;
  test_accounts_excluded: number;
  /** New newsletter signups ÷ unique visitors in the period (percent). */
  newsletter_conversion_rate: MetricValue;
  /** New accounts ÷ unique visitors in the period (percent). */
  account_conversion_rate: MetricValue;
  klaviyo_list_members: MetricValue;
  klaviyo_note?: string;
}

export interface AnalyticsEngagementSection {
  status: AnalyticsSectionStatus;
  meals_generated: number;
  meal_generation_success_rate: MetricValue;
  recipe_views: number;
  recipes_saved: number;
  recipes_saved_to_accounts: MetricValue;
  grocery_lists_created: number;
  wheel_spins: number;
  pizza_night_views: number;
  crew_votes: number;
  crews_created: number;
  checkout_starts: number;
  /** Feature usage ranked by distinct visitors. */
  feature_usage: AnalyticsRankedRow[];
  top_viewed_recipes: AnalyticsRankedRow[];
  top_generated_meals: AnalyticsRankedRow[];
  top_saved_recipes: AnalyticsRankedRow[];
  top_wheel_landings: AnalyticsRankedRow[];
  top_searches: AnalyticsRankedRow[];
  never_viewed_recipes_sample: AnalyticsRankedRow[];
}

export interface AnalyticsRevenueSection {
  status: AnalyticsSectionStatus;
  payments_enabled: boolean | null;
  active_paid_subscribers: MetricValue;
  trialing_subscribers: MetricValue;
  new_paid_subscriptions: MetricValue;
  cancellations: MetricValue;
  /** Monthly recurring revenue in cents, from Stripe list prices of active subscriptions. */
  mrr_cents: MetricValue;
  /** Paid Stripe invoices in the period, in cents. */
  revenue_cents: MetricValue;
  currency: string | null;
  /** Non-Stripe plan rows (admin grants / free plans) — never counted as paid. */
  complimentary_plans: MetricValue;
}

export interface AnalyticsDashboardPayload {
  period: AnalyticsPeriod;
  generated_at: string;
  /** All period boundaries and daily buckets are UTC. */
  timezone: "UTC";
  /** First recorded event in the analytics store (null = no data). */
  tracking_since: string | null;
  audience: AnalyticsAudienceSection;
  growth: AnalyticsGrowthSection;
  engagement: AnalyticsEngagementSection;
  revenue: AnalyticsRevenueSection;
}
