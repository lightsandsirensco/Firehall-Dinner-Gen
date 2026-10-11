/**
 * Firehall Meals Pro pricing — the single source of truth for every amount
 * shown in the UI (client/src/lib/plans-display.ts), the Stripe price/coupon
 * contracts checkout verifies against (server/billing/stripe-client.ts), and
 * the Terms page copy guard (scripts/test-legal-pages.ts).
 *
 * Founding offer: the standard annual price plus a Stripe coupon with
 * `duration: "once"`, so Stripe discounts only the first annual invoice and
 * renews at the standard annual price with no app-side billing logic.
 */

export const PRO_MONTHLY_PRICE_CENTS = 599;
export const PRO_ANNUAL_PRICE_CENTS = 3999;
export const FOUNDING_ANNUAL_DISCOUNT_CENTS = 1000;
export const FOUNDING_FIRST_YEAR_PRICE_CENTS = PRO_ANNUAL_PRICE_CENTS - FOUNDING_ANNUAL_DISCOUNT_CENTS;
export const PRO_PRICE_CURRENCY = "usd";

export function formatUsdCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Whole-percent saving of `cents` per year versus paying monthly for 12 months. */
export function savingsVersusMonthlyPercent(annualCents: number): number {
  const monthlyYear = PRO_MONTHLY_PRICE_CENTS * 12;
  return Math.round(((monthlyYear - annualCents) / monthlyYear) * 100);
}

export const PRO_PRICE_LABEL = `${formatUsdCents(PRO_MONTHLY_PRICE_CENTS)}/mo · ${formatUsdCents(PRO_ANNUAL_PRICE_CENTS)}/yr`;

/**
 * Whether a checkout gets the founding first-year discount: annual only,
 * while the admin flag is on, and only for an account's first paid
 * subscription (a returning subscriber renews at the standard price).
 */
export function foundingOfferApplies(params: {
  billingPeriod: "monthly" | "annual";
  offerEnabled: boolean;
  hadPaidSubscription: boolean;
}): boolean {
  return params.billingPeriod === "annual" && params.offerEnabled && !params.hadPaidSubscription;
}
