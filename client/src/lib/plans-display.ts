import type { PlanId } from "@shared/billing/types";

export interface PlanFeatureItem {
  label: string;
}

export type PlanCtaKind = "link" | "upgrade" | "disabled";

export interface PlanPresentation {
  planId: PlanId;
  title: string;
  price: string;
  pricePeriod?: string;
  tagline: string;
  features: PlanFeatureItem[];
  ctaLabel: string;
  ctaKind: PlanCtaKind;
  ctaHref?: string;
  badge?: string;
  recommended?: boolean;
}

export const PLANS_PAGE = {
  title: "Choose Your Plan",
  subtitle: "Simple pricing. No surprises.",
} as const;

/**
 * Only Free and Firefighter Plus are sold here. Hall Pro is hall-scoped
 * (not self-serve) and its features are behind the Hall Operations private
 * beta, so it's left off this page rather than advertised as available.
 */
export const PLAN_PRESENTATIONS: Record<Exclude<PlanId, "hall_pro">, PlanPresentation> = {
  guest: {
    planId: "guest",
    title: "Free",
    price: "$0",
    tagline: "Everything you need to start cooking tonight.",
    features: [
      { label: "Meal generator" },
      { label: "Classics wheel" },
      { label: "Browse the recipe library" },
    ],
    ctaLabel: "Get Started",
    ctaKind: "link",
    ctaHref: "/generator",
  },
  personal: {
    planId: "personal",
    title: "Firefighter Plus",
    price: "$4.99",
    pricePeriod: "/month",
    tagline: "Everything in Free, plus the tools built for your shift.",
    badge: "Most Popular",
    features: [
      { label: "Sync meals across every device" },
      { label: "Save your favorite meals" },
      { label: "Personal meal history" },
      { label: "Grocery lists" },
      { label: "Shift reminders" },
    ],
    ctaLabel: "Start Free Trial",
    ctaKind: "upgrade",
    recommended: true,
  },
};

export const PLAN_CUSTOMER_LABELS: Record<PlanId, string> = {
  guest: "Free",
  personal: "Firefighter Plus",
  hall_pro: "Hall Pro",
};
