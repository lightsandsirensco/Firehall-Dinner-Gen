/**
 * Thin Stripe SDK wrapper for Firehall Meals Pro (firefighter_plus) checkout.
 *
 * Intentionally minimal: this is the ONLY file that touches the `stripe`
 * package directly. Routes/store code should go through the helpers here so
 * the mapping between Stripe's data model and our own stays in one place.
 *
 * All of this is inert until real STRIPE_* env vars are set AND
 * billing_global_flags.payments_enabled is flipped on — see
 * getBillingPublicConfig() / requireStripeConfigured() below.
 */
import Stripe from "stripe";
import type { SubscriptionStatus } from "../../shared/billing/types.js";

export type BillingPeriod = "monthly" | "annual";

let cachedClient: Stripe | null = null;

/** Throws a clear, actionable error if Stripe isn't configured — never silently no-ops on a payment path. */
export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — Stripe checkout/portal/webhook routes cannot run until it is configured.",
    );
  }
  cachedClient = new Stripe(secretKey, {
    apiVersion: "2026-08-26.dahlia",
  });
  return cachedClient;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set — cannot verify Stripe webhook signatures.");
  }
  return secret;
}

/** Firehall Meals Pro (firefighter_plus) is currently the only plan sold through Stripe. */
export function getPriceIdForPeriod(period: BillingPeriod): string {
  const envKey = period === "monthly" ? "STRIPE_PRICE_ID_MONTHLY" : "STRIPE_PRICE_ID_ANNUAL";
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new Error(`${envKey} is not set — cannot start checkout for the ${period} plan.`);
  }
  return priceId;
}

/**
 * The product contract Firehall Meals Pro is marketed at (see
 * client/src/lib/plans-display.ts) — the ONLY source of truth for what each
 * configured Stripe price ID is expected to actually charge. Nothing in this
 * codebase can stop an operator from pasting the wrong price ID into
 * STRIPE_PRICE_ID_MONTHLY/STRIPE_PRICE_ID_ANNUAL (or swapping the two), so
 * getVerifiedPriceIdForPeriod() below cross-checks the *live* Stripe price
 * object against this spec before ever using it in a checkout session.
 */
export interface ExpectedPriceSpec {
  unitAmountCents: number;
  currency: string;
  interval: "month" | "year";
  intervalCount: number;
}

export const EXPECTED_PRICE_SPECS: Record<BillingPeriod, ExpectedPriceSpec> = {
  monthly: { unitAmountCents: 499, currency: "usd", interval: "month", intervalCount: 1 },
  annual: { unitAmountCents: 3999, currency: "usd", interval: "year", intervalCount: 1 },
};

/**
 * Pure comparison, deliberately factored out so it's unit-testable without a
 * live Stripe call — see scripts/test-stripe-billing.ts.
 */
export function priceMatchesExpectedSpec(
  price: {
    unit_amount?: number | null;
    currency?: string | null;
    recurring?: { interval?: string; interval_count?: number } | null;
  },
  period: BillingPeriod,
): { ok: boolean; reason?: string } {
  const spec = EXPECTED_PRICE_SPECS[period];
  if (price.unit_amount !== spec.unitAmountCents) {
    return {
      ok: false,
      reason: `expected unit_amount=${spec.unitAmountCents}, got ${price.unit_amount}`,
    };
  }
  if ((price.currency ?? "").toLowerCase() !== spec.currency) {
    return { ok: false, reason: `expected currency=${spec.currency}, got ${price.currency}` };
  }
  if (
    !price.recurring ||
    price.recurring.interval !== spec.interval ||
    price.recurring.interval_count !== spec.intervalCount
  ) {
    return {
      ok: false,
      reason: `expected recurring ${spec.intervalCount}x${spec.interval}, got ${JSON.stringify(price.recurring)}`,
    };
  }
  return { ok: true };
}

// Verified once per process per price id — this is a safety net against
// misconfiguration, not something that needs re-checking on every checkout.
const verifiedPriceIds = new Set<string>();

/** Test-only escape hatch so scripts/test-stripe-billing.ts can reset this between fixtures. */
export function resetVerifiedPriceIdsForTests(): void {
  verifiedPriceIds.clear();
}

/**
 * Same as getPriceIdForPeriod(), but also fetches the live Stripe Price and
 * asserts it actually matches the marketed monthly/annual contract (amount,
 * currency, recurring interval) before returning it. Fails closed — throws
 * (never falls back to the unverified id) so a misconfigured/swapped price
 * ID can never silently reach Stripe Checkout.
 */
export async function getVerifiedPriceIdForPeriod(period: BillingPeriod): Promise<string> {
  const priceId = getPriceIdForPeriod(period);
  if (verifiedPriceIds.has(priceId)) return priceId;

  const stripe = getStripeClient();
  const price = await stripe.prices.retrieve(priceId);
  const result = priceMatchesExpectedSpec(price, period);
  if (!result.ok) {
    const envKey = period === "monthly" ? "STRIPE_PRICE_ID_MONTHLY" : "STRIPE_PRICE_ID_ANNUAL";
    throw new Error(
      `${envKey} (${priceId}) does not match the expected ${period} Firehall Meals Pro price contract: ${result.reason}`,
    );
  }
  verifiedPriceIds.add(priceId);
  return priceId;
}

/**
 * Maps a Stripe Subscription status onto our internal SubscriptionStatus enum.
 * Kept narrow on purpose — Stripe has more granular pre-payment states
 * ("incomplete", "incomplete_expired", "unpaid", "paused") that only matter
 * before/after a subscription has ever been usable; we fold those into the
 * closest internal state rather than growing our own status enum to match
 * Stripe's exactly.
 *
 * IMPORTANT — "past_due" vs "unpaid": Stripe's `past_due` is the ACTIVE
 * dunning-retry window (Smart Retries still running) and correctly still
 * grants access (see subscriptionGrantsAccess). `unpaid`, by contrast, is
 * the TERMINAL state Stripe assigns once retries are exhausted *if* the
 * Stripe account's "Manage failed payments" setting is configured to mark
 * subscriptions unpaid rather than cancel them outright — no further
 * automatic retries occur from Stripe's side at that point. Mapping `unpaid`
 * to `past_due` would let Pro access continue indefinitely with no
 * subsequent event ever arriving to revoke it, so it is intentionally
 * treated as `cancelled` here instead (same bucket as a fully lapsed
 * subscription) — see scripts/test-stripe-billing.ts.
 */
export function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "incomplete":
      return "past_due";
    case "unpaid":
    case "canceled":
    case "incomplete_expired":
    case "paused":
      return "cancelled";
    default:
      return "cancelled";
  }
}
