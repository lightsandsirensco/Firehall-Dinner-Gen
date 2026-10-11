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
import {
  FOUNDING_ANNUAL_DISCOUNT_CENTS,
  PRO_ANNUAL_PRICE_CENTS,
  PRO_MONTHLY_PRICE_CENTS,
  PRO_PRICE_CURRENCY,
} from "../../shared/billing/pricing.js";

export type BillingPeriod = "monthly" | "annual";

let cachedClient: Stripe | null = null;

/** Test-only: swap in a stand-in client (scripts/test-billing-e2e.ts). Pass null to restore the real one. */
export function setStripeClientForTests(client: Stripe | null): void {
  cachedClient = client;
}

/**
 * Boolean-only Stripe configuration status for the admin billing console —
 * presence checks ONLY, never the actual secret/key values. Safe to send to
 * the browser. See getAdminBillingDashboard() in store.ts, the only caller.
 */
export interface StripeConfigStatus {
  secret_key_configured: boolean;
  webhook_secret_configured: boolean;
  price_monthly_configured: boolean;
  price_annual_configured: boolean;
  founding_coupon_configured: boolean;
  public_site_url_configured: boolean;
}

export function getStripeConfigStatus(): StripeConfigStatus {
  return {
    secret_key_configured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    webhook_secret_configured: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    price_monthly_configured: Boolean(process.env.STRIPE_PRICE_ID_MONTHLY?.trim()),
    price_annual_configured: Boolean(process.env.STRIPE_PRICE_ID_ANNUAL?.trim()),
    founding_coupon_configured: Boolean(process.env.STRIPE_COUPON_ID_FOUNDING?.trim()),
    // Same fallback chain resolvePublicSiteOrigin() uses (server/seo/sitemap.ts) —
    // "configured" means checkout/portal redirect URLs won't fall back to the
    // hardcoded canonical origin.
    public_site_url_configured: Boolean(
      process.env.PUBLIC_SITE_URL?.trim() ||
        process.env.SITE_URL?.trim() ||
        process.env.REPLIT_DEPLOYMENT_URL?.trim(),
    ),
  };
}

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
  monthly: { unitAmountCents: PRO_MONTHLY_PRICE_CENTS, currency: PRO_PRICE_CURRENCY, interval: "month", intervalCount: 1 },
  annual: { unitAmountCents: PRO_ANNUAL_PRICE_CENTS, currency: PRO_PRICE_CURRENCY, interval: "year", intervalCount: 1 },
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
 * Founding offer contract: a fixed $10.00 USD discount on exactly one
 * invoice. Applied only to the annual price, that first invoice is $29.99
 * and every renewal is the standard $39.99 — Stripe enforces "first year
 * only" itself, with no schedule or webhook repricing on our side.
 */
export const FOUNDING_COUPON_SPEC = {
  amountOffCents: FOUNDING_ANNUAL_DISCOUNT_CENTS,
  currency: PRO_PRICE_CURRENCY,
  duration: "once",
} as const;

export function couponMatchesFoundingSpec(coupon: {
  amount_off?: number | null;
  percent_off?: number | null;
  currency?: string | null;
  duration?: string | null;
  valid?: boolean | null;
}): { ok: boolean; reason?: string } {
  if (coupon.percent_off != null) {
    return { ok: false, reason: `expected a fixed amount_off coupon, got percent_off=${coupon.percent_off}` };
  }
  if (coupon.amount_off !== FOUNDING_COUPON_SPEC.amountOffCents) {
    return { ok: false, reason: `expected amount_off=${FOUNDING_COUPON_SPEC.amountOffCents}, got ${coupon.amount_off}` };
  }
  if ((coupon.currency ?? "").toLowerCase() !== FOUNDING_COUPON_SPEC.currency) {
    return { ok: false, reason: `expected currency=${FOUNDING_COUPON_SPEC.currency}, got ${coupon.currency}` };
  }
  if (coupon.duration !== FOUNDING_COUPON_SPEC.duration) {
    return { ok: false, reason: `expected duration=once (first invoice only), got ${coupon.duration}` };
  }
  if (coupon.valid === false) {
    return { ok: false, reason: "coupon is no longer valid (expired or fully redeemed)" };
  }
  return { ok: true };
}

/**
 * STRIPE_COUPON_ID_FOUNDING, checked against the live coupon on every
 * founding checkout (validity can change when it expires or hits
 * max_redemptions). Fails closed so nobody shown $29.99 is charged $39.99.
 */
export async function getVerifiedFoundingCouponId(): Promise<string> {
  const couponId = process.env.STRIPE_COUPON_ID_FOUNDING?.trim();
  if (!couponId) {
    throw new Error("STRIPE_COUPON_ID_FOUNDING is not set — cannot apply the founding offer.");
  }
  const coupon = await getStripeClient().coupons.retrieve(couponId);
  const result = couponMatchesFoundingSpec(coupon);
  if (!result.ok) {
    throw new Error(`STRIPE_COUPON_ID_FOUNDING (${couponId}) does not match the founding offer contract: ${result.reason}`);
  }
  return couponId;
}

/**
 * The one Checkout Session shape for Firehall Meals Pro. Deliberately has no
 * subscription_data.trial_period_days: the only trial is the no-card
 * personal reverse trial (server/billing/pro-trial.ts), and paid Pro bills
 * immediately. Stripe rejects `discounts` together with
 * `allow_promotion_codes`, so a founding checkout omits the promo field.
 */
export function buildProCheckoutSessionParams(params: {
  customerId: string;
  userId: string;
  priceId: string;
  billingPeriod: BillingPeriod;
  origin: string;
  foundingCouponId: string | null;
  feature?: string;
}): Stripe.Checkout.SessionCreateParams {
  const founding = Boolean(params.foundingCouponId);
  return {
    mode: "subscription",
    customer: params.customerId,
    client_reference_id: params.userId,
    line_items: [{ price: params.priceId, quantity: 1 }],
    subscription_data: {
      metadata: { user_id: params.userId, ...(founding ? { founding_offer: "true" } : {}) },
    },
    metadata: {
      user_id: params.userId,
      billing_period: params.billingPeriod,
      ...(founding ? { founding_offer: "true" } : {}),
      ...(params.feature ? { feature: params.feature } : {}),
    },
    success_url: `${params.origin}/plans?checkout=success`,
    cancel_url: `${params.origin}/plans?checkout=cancelled`,
    ...(founding ? { discounts: [{ coupon: params.foundingCouponId! }] } : { allow_promotion_codes: true }),
  };
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

/**
 * The fields we persist from a Stripe Subscription. A scheduled cancellation
 * can arrive as `cancel_at_period_end` or as a `cancel_at` timestamp
 * (depending on how it was cancelled in the Portal/Dashboard) — both mean
 * "access continues until then, no renewal".
 */
export function stripeSubscriptionToRecord(subscription: {
  status: Stripe.Subscription.Status;
  cancel_at_period_end: boolean;
  cancel_at?: number | null;
  items: { data: Array<{ price?: { id: string } | null; current_period_end?: number | null }> };
}): {
  stripePriceId: string | null;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
} {
  const item = subscription.items.data[0];
  return {
    stripePriceId: item?.price?.id ?? null,
    status: mapStripeStatus(subscription.status),
    cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.cancel_at != null,
    currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
  };
}
