/**
 * Copy for the one personal Pro paywall (components/billing/pro-paywall.tsx).
 * Only approved Premium triggers live here — add a trigger only when its
 * feature is already Pro-gated, never as a generic upgrade banner.
 */
import { PRO_TRIAL_DAYS, type BillingFeature } from "@shared/billing/types";

export const PRO_TRIAL_CTA = `Start ${PRO_TRIAL_DAYS}-day Pro trial`;
export const PRO_EARLY_ACCESS_CTA = "Join Pro early access";
export const PRO_SUBSCRIBE_CTA = "Subscribe to Pro";

export type ProPaywallTrigger =
  | "plan_ahead"
  | "run_it_back"
  | "nutrition_goals"
  | "meal_memory"
  | "foods_to_avoid"
  | "pro_filters";

export interface ProPaywallCopy {
  /** Entitlement this trigger unlocks (server paywall-view counts, plan-page attribution). */
  feature: BillingFeature;
  headline: string;
  body: string;
  /**
   * "Continue free" when the Free version keeps working (next-shift planning,
   * 30-day history, Explore without Pro filters); "Not now" for a single action.
   */
  secondary: "Not now" | "Continue free";
  /** Short name in the "Also in Pro" list. */
  shortLabel: string;
}

export const PRO_PAYWALL_COPY: Record<ProPaywallTrigger, ProPaywallCopy> = {
  plan_ahead: {
    feature: "plan_ahead",
    headline: "Plan the whole rotation.",
    body: "Plan upcoming shifts before they arrive and keep your meals from repeating.",
    secondary: "Continue free",
    shortLabel: "Plan Ahead",
  },
  run_it_back: {
    feature: "run_it_back",
    headline: "Run the last tour back.",
    body: "Reuse your previous shift plan in one tap, then swap anything you want.",
    secondary: "Not now",
    shortLabel: "Run It Back",
  },
  nutrition_goals: {
    feature: "nutrition_goals",
    headline: "Plan around your nutrition goal.",
    body: "Make High Protein, Lower Calorie, Lower Carb or Balanced part of every recommendation.",
    secondary: "Not now",
    shortLabel: "Nutrition Goals",
  },
  meal_memory: {
    feature: "meal_memory",
    headline: "Keep your full meal history.",
    body: "Remember every meal, rating and note — and use them to improve future shifts.",
    secondary: "Continue free",
    shortLabel: "Full meal history",
  },
  foods_to_avoid: {
    feature: "ingredient_preferences",
    headline: "Keep the foods you skip off the table.",
    body: "Save the ingredients you avoid so every pick, browse and shift plan leaves them out.",
    secondary: "Not now",
    shortLabel: "Foods to Avoid",
  },
  pro_filters: {
    feature: "advanced_search",
    headline: "Find the right meal faster.",
    body: "Filter by High Protein, calories, carbs and more to find exactly what your crew needs.",
    secondary: "Continue free",
    shortLabel: "Pro filters",
  },
};

/** The four core Pro features shown under "Also in Pro" (minus the one being sold). */
export const CORE_PRO_TRIGGERS: readonly ProPaywallTrigger[] = ["plan_ahead", "run_it_back", "nutrition_goals", "meal_memory"];
