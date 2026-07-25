export const PLAN_IDS = ["guest", "personal", "hall_pro"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export const SUBSCRIPTION_STATUSES = ["active", "trialing", "cancelled"] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

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

export interface UserSubscription {
  user_id: string;
  plan_id: PlanId;
  status: SubscriptionStatus;
  source: "self_select" | "admin_grant";
  selected_at: string;
  expires_at: string | null;
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
  personal: {
    display_name: "Firefighter Plus",
    tagline: "Save, organize, and access your meals everywhere.",
    price_label: "$4.99/month",
    sort_order: 1,
  },
  hall_pro: {
    display_name: "Hall Pro",
    tagline:
      "Built for entire fire halls. Manage meals, canteen operations, and crew collaboration from one place.",
    price_label: "Coming soon",
    sort_order: 2,
  },
};

/** Base feature sets for user-scoped plans. Hall Pro features are hall-scoped at runtime. */
export const PLAN_BASE_FEATURES: Record<PlanId, readonly BillingFeature[]> = {
  guest: ["generator", "wheel", "browse"],
  personal: [
    "generator",
    "wheel",
    "browse",
    "cross_device_saves",
    "personal_meal_history",
    "grocery_exports",
    "shift_reminders",
    "hall_dashboard",
  ],
  /** Catalog-only — user subscriptions never resolve to hall_pro */
  hall_pro: [],
};

export function planTierRank(planId: PlanId): number {
  switch (planId) {
    case "guest":
      return 0;
    case "personal":
      return 1;
    case "hall_pro":
      return 2;
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
  if (isPlusFeature(key)) return "personal";
  if (PLAN_BASE_FEATURES.guest.includes(key)) return "guest";
  if (PLAN_BASE_FEATURES.personal.includes(key)) return "personal";
  return "hall_pro";
}

export function hallHasProStatus(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}
