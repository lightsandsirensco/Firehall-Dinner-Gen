import type { PlanId } from "@shared/billing/types";

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
   * "Save 33%" — always rendered in normal document flow (never
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

// --- Pricing math — computed once and verified below, then threaded through
// PLAN_PRESENTATIONS.firefighter_plus.billingOptions. Never hand-type a
// savings percentage or monthly-equivalent price as a separate magic string
// — derive it from these two real prices so it can never silently drift out
// of sync with what Stripe actually charges (see server/billing/stripe-client.ts
// EXPECTED_PRICE_SPECS, which is the source of truth for the real amounts).
const MONTHLY_PRICE_USD = 4.99;
const ANNUAL_PRICE_USD = 39.99;
const ANNUAL_MONTHLY_EQUIVALENT_USD = ANNUAL_PRICE_USD / 12;
// (4.99 * 12 - 39.99) / (4.99 * 12) = 19.89 / 59.88 = 0.3322... → 33%
const ANNUAL_SAVINGS_PERCENT = Math.round(
  ((MONTHLY_PRICE_USD * 12 - ANNUAL_PRICE_USD) / (MONTHLY_PRICE_USD * 12)) * 100,
);

const MONTHLY_PRICE_LABEL = `$${MONTHLY_PRICE_USD.toFixed(2)}`;
const ANNUAL_PRICE_LABEL = `$${ANNUAL_PRICE_USD.toFixed(2)}`;
const ANNUAL_EQUIVALENT_LABEL = `$${ANNUAL_MONTHLY_EQUIVALENT_USD.toFixed(2)}/month billed annually`;
const ANNUAL_SAVINGS_LABEL = `Save ${ANNUAL_SAVINGS_PERCENT}%`;

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
  { label: "Personal meal history" },
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
        label: "Meal Memory",
        description: "Remembers what you've cooked and helps keep the Generator varied.",
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
