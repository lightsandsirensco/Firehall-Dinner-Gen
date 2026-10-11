import type { PlanId } from "@shared/billing/types";
import {
  FOUNDING_FIRST_YEAR_PRICE_CENTS,
  PRO_ANNUAL_PRICE_CENTS,
  PRO_MONTHLY_PRICE_CENTS,
  formatUsdCents,
  savingsVersusMonthlyPercent,
} from "@shared/billing/pricing";

export interface PlanFeatureItem {
  label: string;
  /** Optional supporting line under the label — used for the Pro benefit blocks. */
  description?: string;
}

export type PlanCtaKind = "link" | "upgrade" | "disabled";

export type PlanBillingPeriod = "monthly" | "annual";

export interface PlanBillingOption {
  id: PlanBillingPeriod;
  label: string;
  price: string;
  period: string;
  /**
   * Small pill shown next to the price when this option is active, e.g.
   * "Save 44%" — always rendered in normal document flow (never
   * `absolute`-positioned) so it can never overlap the price/period text at
   * any card width. Derived from real pricing math below — never a
   * hand-typed magic string.
   */
  savingsLabel?: string;
  /** Small line under the price when this option is active, e.g. "$3.33/month billed annually". */
  equivalentLabel?: string;
}

export interface PlanPresentation {
  planId: PlanId;
  title: string;
  price: string;
  pricePeriod?: string;
  /** Small secondary price line directly under the price (e.g. "Free forever"). */
  secondaryPrice?: string;
  tagline: string;
  /**
   * When set, the card renders an explicit Monthly/Annual picker instead of a
   * single static price — used for Firehall Meals Pro. The user must
   * actively pick one; nothing is selected merely by page load.
   */
  billingOptions?: PlanBillingOption[];
  /** Short, explicit "not purchasable yet" note — pre-launch only, hidden entirely once payments_enabled=true. */
  comingSoonNote?: string;
  /** Small label above the feature list, e.g. "Includes:" or "Includes everything in Free, plus:". */
  featuresHeading?: string;
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

// --- Pricing math — every label below is derived from the cents values in
// shared/billing/pricing.ts (the same values Stripe prices/coupon are
// verified against at checkout), never hand-typed, so the UI can't drift
// from what Stripe actually charges.
// $5.99 x 12 = $71.88; ($71.88 - $39.99) / $71.88 = 44%; founding $29.99 → 58%.
const MONTHLY_PRICE_LABEL = formatUsdCents(PRO_MONTHLY_PRICE_CENTS);
const ANNUAL_PRICE_LABEL = formatUsdCents(PRO_ANNUAL_PRICE_CENTS);
const ANNUAL_EQUIVALENT_LABEL = `${formatUsdCents(Math.round(PRO_ANNUAL_PRICE_CENTS / 12))}/month billed annually`;
const ANNUAL_SAVINGS_LABEL = `Save ${savingsVersusMonthlyPercent(PRO_ANNUAL_PRICE_CENTS)}%`;
const FOUNDING_PRICE_LABEL = formatUsdCents(FOUNDING_FIRST_YEAR_PRICE_CENTS);

/**
 * Founding offer presentation for the Annual option — shown only when the
 * server says this account would actually get it (founding_offer_eligible).
 */
export const FOUNDING_OFFER_DISPLAY = {
  badge: "Founding offer",
  price: FOUNDING_PRICE_LABEL,
  period: "/first year",
  standardPrice: ANNUAL_PRICE_LABEL,
  renewalNote: `${FOUNDING_PRICE_LABEL} for your first year, then ${ANNUAL_PRICE_LABEL}/year.`,
  equivalentLabel: `${formatUsdCents(Math.round(FOUNDING_FIRST_YEAR_PRICE_CENTS / 12))}/month for the first year`,
  savingsLabel: `Save ${savingsVersusMonthlyPercent(FOUNDING_FIRST_YEAR_PRICE_CENTS)}% first year`,
} as const;

/** One-line price summary for paywall/trial copy, e.g. "$5.99/month or $39.99/year". */
export function proPriceSummary(foundingEligible: boolean): string {
  return foundingEligible
    ? `${MONTHLY_PRICE_LABEL}/month, or ${FOUNDING_PRICE_LABEL} for your first year (then ${ANNUAL_PRICE_LABEL}/year)`
    : `${MONTHLY_PRICE_LABEL}/month or ${ANNUAL_PRICE_LABEL}/year`;
}

/** The option as it should render for this account (founding variant on Annual when eligible). */
export function resolveBillingOption(option: PlanBillingOption, foundingEligible: boolean): PlanBillingOption {
  if (option.id !== "annual" || !foundingEligible) return option;
  return {
    ...option,
    price: FOUNDING_OFFER_DISPLAY.price,
    period: FOUNDING_OFFER_DISPLAY.period,
    savingsLabel: FOUNDING_OFFER_DISPLAY.savingsLabel,
    equivalentLabel: FOUNDING_OFFER_DISPLAY.equivalentLabel,
  };
}

/**
 * Every feature a user gets for $0 — shown as ONE "Free" card. "guest"
 * (not signed in yet) and "personal" (signed in, still free) render
 * identical content; only the CTA differs (guest links straight into the
 * app, personal confirms the already-default free plan). See
 * plans-page.tsx for which catalog entry is actually shown. This
 * intentionally merges what used to be two separate visual cards (Free +
 * Personal) — Personal was never a real second commercial choice next to
 * Pro, and showing three cards side by side is what produced the cramped
 * desktop grid this file's card component used to render.
 */
const FREE_FEATURES: PlanFeatureItem[] = [
  { label: "Meal Generator" },
  { label: "Classics Wheel" },
  { label: "Full recipe library" },
  { label: "Dietary filters" },
  { label: "Nutrition information" },
  { label: "Crew-size scaling" },
  { label: "Save favorite meals" },
  { label: "Sync saved meals across devices" },
  { label: "Meal history for the last 30 days, with ratings and notes" },
];

/**
 * Free and Firehall Meals Pro are the two real customer-facing choices.
 * Hall Pro is hall-scoped (not self-serve) and its features are behind the
 * Hall Operations private beta, so it's left off this page rather than
 * advertised as available.
 */
export const PLAN_PRESENTATIONS: Record<Exclude<PlanId, "hall_pro">, PlanPresentation> = {
  guest: {
    planId: "guest",
    title: "Free",
    price: "$0",
    tagline: "Everything you need to start cooking.",
    featuresHeading: "Includes:",
    features: FREE_FEATURES,
    ctaLabel: "Continue free",
    ctaKind: "link",
    ctaHref: "/generator",
  },
  personal: {
    planId: "personal",
    title: "Free",
    price: "$0",
    tagline: "Everything you need to start cooking.",
    featuresHeading: "Includes:",
    features: FREE_FEATURES,
    ctaLabel: "Continue free",
    ctaKind: "upgrade",
  },
  firefighter_plus: {
    planId: "firefighter_plus",
    title: "Firehall Meals Pro",
    price: MONTHLY_PRICE_LABEL,
    pricePeriod: "/month",
    tagline: "Find the right meal faster — and stop repeating the same dinners.",
    comingSoonNote: "Self-serve checkout is coming soon — not yet available for purchase.",
    billingOptions: [
      { id: "monthly", label: "Monthly", price: MONTHLY_PRICE_LABEL, period: "/month" },
      {
        id: "annual",
        label: "Annual",
        price: ANNUAL_PRICE_LABEL,
        period: "/year",
        savingsLabel: ANNUAL_SAVINGS_LABEL,
        equivalentLabel: ANNUAL_EQUIVALENT_LABEL,
      },
    ],
    badge: "Coming Soon",
    featuresHeading: "Includes everything in Free, plus:",
    // Only currently-shipped Pro capabilities — no aspirational/unshipped
    // claims (AI, meal calendar, offline recipes, etc.). Keep in sync with
    // shared/billing/types.ts PLUS_FEATURES that actually gate real UI.
    features: [
      {
        label: "Advanced meal matching",
        description: "Set nutrition targets like protein, calories, carbs, and fat.",
      },
      {
        label: "Foods to Avoid",
        description: "Tell Firehall Meals what your crew doesn't want to eat.",
      },
      {
        label: "Nutrition Goals",
        description: "Pick High Protein, Lower Calorie, Lower Carb, or Balanced to shape Pick Tonight and Shift Planner.",
      },
      {
        label: "Meal Memory",
        description:
          "Your full meal history, long-term ratings and notes, crew favorites, and picks personalized from everything you've cooked.",
      },
    ],
    ctaLabel: "Join Pro Early Access",
    ctaKind: "upgrade",
    recommended: true,
  },
};

export const PLAN_CUSTOMER_LABELS: Record<PlanId, string> = {
  guest: "Free",
  personal: "Free",
  firefighter_plus: "Firehall Meals Pro",
  hall_pro: "Hall Pro",
};
