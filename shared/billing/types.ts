export const PLAN_IDS = ["guest", "personal", "firefighter_plus", "hall_pro"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export const SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "cancelled"] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * Statuses that still grant plan access. `past_due` is a short Stripe dunning
 * grace period (card declined, retrying) — treated as still-entitled so a
 * transient card failure doesn't instantly lock a paying user out mid-retry.
 * Stripe's own retry schedule + emails handle recovery; if it lapses further,
 * Stripe moves the subscription to `canceled` and this becomes `cancelled` here.
 */
export function subscriptionGrantsAccess(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

export const BILLING_FEATURES = [
  "generator",
  "wheel",
  "browse",
  "cross_device_saves",
  "personal_meal_history",
  "grocery_exports",
  "shift_reminders",
  "hall_dashboard",
  /** Basic vote on Tonight — free with hall link; advanced tools are Hall Pro */
  "vote_history",
  "view_canteen",
  "shared_shopping_lists",
  "hall_history",
  "canteen_management",
  "advanced_hall_vote",
  "hall_grocery_planning",
  /** @deprecated Hall deals — use hall_grocery_planning (crew) or personal_protein_deals (Plus) */
  "protein_deals",
  /** Hall Pro — track canteen dues for hall members */
  "canteen_payment_tracker",
  /** Hall Pro — canteen order history, recurring reviews, CSV, product URLs */
  "canteen_manager_pro",
  /** Firefighter Plus — user-scoped (not implemented as plan_id yet) */
  "unlimited_meal_planning",
  "unlimited_saved_meals",
  "meal_calendar",
  "advanced_search",
  "personal_protein_deals",
  "personal_grocery_exports",
  "nutrition",
  "meal_prep",
  "ai_substitutions",
  "offline_recipes",
  /** Firefighter Plus — persistent "Foods to Avoid" ingredient preferences (Explore + Generator). */
  "ingredient_preferences",
  /**
   * Firefighter Plus V1 Feature 3 — "Meal Memory": durable, cross-device
   * account-level cooked-meal history + Generator variety personalization
   * built from it. Distinct from the free `personal_meal_history` sync key
   * (device-local Hall History timeline — generated/cooked/wheel/vote
   * activity, still free — see shared/sync/types.ts).
   */
  "meal_memory",
  /** @deprecated */
  "family_profiles",
  "shared_favorites",
  "hall_supplies",
  "hall_analytics",
  "hall_badges",
  "shift_reports",
] as const;

export type BillingFeature = (typeof BILLING_FEATURES)[number];

/** Crew collaboration unlocked per hall with Hall Pro — staples are free with hall link. */
export const HALL_PRO_FEATURES = [
  "shared_shopping_lists",
  "hall_history",
  "advanced_hall_vote",
  "hall_grocery_planning",
  "canteen_payment_tracker",
  "canteen_manager_pro",
] as const satisfies readonly BillingFeature[];

export type HallProFeature = (typeof HALL_PRO_FEATURES)[number];

/** Individual premium tools — Firefighter Plus (user-scoped). */
export const PLUS_FEATURES = [
  "unlimited_meal_planning",
  "unlimited_saved_meals",
  "meal_calendar",
  "advanced_search",
  "personal_protein_deals",
  "personal_grocery_exports",
  "nutrition",
  "meal_prep",
  "ai_substitutions",
  "offline_recipes",
  "ingredient_preferences",
  "meal_memory",
] as const satisfies readonly BillingFeature[];

export type PlusFeature = (typeof PLUS_FEATURES)[number];

export function isHallProFeature(feature: BillingFeature): feature is HallProFeature {
  return (HALL_PRO_FEATURES as readonly string[]).includes(feature);
}

export function isPlusFeature(feature: BillingFeature): feature is PlusFeature {
  return (PLUS_FEATURES as readonly string[]).includes(feature);
}

/** @deprecated Map legacy checks to hall grocery planning */
export function resolveBillingFeature(feature: BillingFeature): BillingFeature {
  if (feature === "protein_deals") return "hall_grocery_planning";
  return feature;
}

export interface PlanCatalogEntry {
  plan_id: PlanId;
  display_name: string;
  tagline: string;
  enabled: boolean;
  sort_order: number;
  features: BillingFeature[];
  price_label: string;
}

export type SubscriptionSource = "self_select" | "admin_grant" | "stripe";

export interface UserSubscription {
  user_id: string;
  plan_id: PlanId;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  selected_at: string;
  expires_at: string | null;
  /** Set only when source === "stripe". True once the user has scheduled cancellation. */
  cancel_at_period_end?: boolean;
  /** Set only when source === "stripe". ISO timestamp of current billing period end. */
  current_period_end?: string | null;
}

export interface HallSubscription {
  hall_id: string;
  plan_id: "hall_pro";
  status: SubscriptionStatus;
  source: "self_select" | "admin_grant";
  selected_at: string;
  trial_started_at: string | null;
  subscribed_by_user_id: string | null;
  updated_at: string;
}

export interface UserBillingState {
  /** Personal account tier — guest or personal only (Hall Pro is per hall). */
  plan_id: PlanId;
  effective_plan_id: PlanId;
  subscription: UserSubscription | null;
  features: Record<BillingFeature, boolean>;
  /** Hall IDs where the user is a member and Hall Pro is active or trialing. */
  hall_pro_hall_ids: string[];
  hall_subscriptions: HallSubscription[];
  catalog: PlanCatalogEntry[];
  /** True when this user has a live Stripe customer — i.e. the "Manage billing" portal link should show. */
  manage_billing_available: boolean;
}

export interface PlanFeatureFlagRow {
  plan_id: PlanId;
  feature_key: BillingFeature;
  enabled: boolean;
}

export const PLAN_DISPLAY: Record<
  PlanId,
  { display_name: string; tagline: string; price_label: string; sort_order: number }
> = {
  guest: {
    display_name: "Free",
    tagline: "Cook tonight — no account required.",
    price_label: "Free",
    sort_order: 0,
  },
  /**
   * Personal is the normal signed-in/free experience — NOT a paid tier.
   * (Previously mislabeled "Firefighter Plus — $4.99/month"; corrected so the
   * free plan doesn't display paid branding/pricing nobody is ever charged.)
   */
  personal: {
    display_name: "Personal",
    tagline: "Free forever — sync your meals across every device.",
    price_label: "Free",
    sort_order: 1,
  },
  /**
   * The real paid individual tier. Entitlement/testing only — no payment
   * processing exists yet (see PLUS_FEATURES / isPlusFeature()).
   */
  firefighter_plus: {
    display_name: "Firehall Meals Pro",
    tagline: "Find the right meal faster.",
    price_label: "$4.99/mo · $39.99/yr",
    sort_order: 2,
  },
  hall_pro: {
    display_name: "Hall Pro",
    tagline:
      "Built for entire fire halls. Manage meals, canteen operations, and crew collaboration from one place.",
    price_label: "Coming soon",
    sort_order: 3,
  },
};

/** Signed-in/free feature set — reused as the base of firefighter_plus below. */
const PERSONAL_FEATURES = [
  "generator",
  "wheel",
  "browse",
  "cross_device_saves",
  "personal_meal_history",
  "grocery_exports",
  "shift_reminders",
  "hall_dashboard",
] as const satisfies readonly BillingFeature[];

/** Base feature sets for user-scoped plans. Hall Pro features are hall-scoped at runtime. */
export const PLAN_BASE_FEATURES: Record<PlanId, readonly BillingFeature[]> = {
  guest: ["generator", "wheel", "browse"],
  personal: PERSONAL_FEATURES,
  /** Everything Personal has, plus the paid-only PLUS_FEATURES. */
  firefighter_plus: [...PERSONAL_FEATURES, ...PLUS_FEATURES],
  /** Catalog-only — user subscriptions never resolve to hall_pro */
  hall_pro: [],
};

export function planTierRank(planId: PlanId): number {
  switch (planId) {
    case "guest":
      return 0;
    case "personal":
      return 1;
    case "firefighter_plus":
      return 2;
    case "hall_pro":
      return 3;
  }
}

export function hasFeature(
  features: Record<BillingFeature, boolean>,
  feature: BillingFeature,
): boolean {
  const key = resolveBillingFeature(feature);
  return Boolean(features[key]);
}

export function requiredPlanForFeature(feature: BillingFeature): PlanId {
  const key = resolveBillingFeature(feature);
  if (isHallProFeature(key)) return "hall_pro";
  if (isPlusFeature(key)) return "firefighter_plus";
  if (PLAN_BASE_FEATURES.guest.includes(key)) return "guest";
  if (PLAN_BASE_FEATURES.personal.includes(key)) return "personal";
  return "hall_pro";
}

export function hallHasProStatus(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}
