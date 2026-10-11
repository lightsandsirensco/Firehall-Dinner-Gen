#!/usr/bin/env tsx
/**
 * Firehall Meals Pro against REAL Stripe test mode (sk_test_ only — any other
 * key is refused before a single request is made). Never touches the app
 * database, never flips payments_enabled.
 *
 *   npx tsx scripts/stripe-test-mode-e2e.ts --setup
 *     Creates the test-mode product, $5.99/month + $39.99/year prices and the
 *     founding coupon ($10 off, duration once), and prints the env vars to set.
 *
 *   npx tsx scripts/stripe-test-mode-e2e.ts
 *     Verifies the configured prices/coupon with the same code checkout uses,
 *     creates real Checkout Sessions with our exact params, then runs a
 *     subscription on a Stripe test clock through the money-relevant part of
 *     the lifecycle: founding year billed $29.99 → renewal billed $39.99 →
 *     cancel at period end → Portal session → cancellation. Test clocks (and
 *     their customers) are deleted afterwards.
 *
 * Hosted Checkout payment is the one step a script cannot click through; the
 * subscription is created with the same price + coupon instead. The webhook
 * → entitlement half of the flow is covered by scripts/test-billing-e2e.ts;
 * for live webhook delivery use `stripe listen` (see the Phase 14 report).
 */
import assert from "node:assert/strict";
import Stripe from "stripe";
import { loadProjectEnv } from "../server/lib/load-project-env.js";

loadProjectEnv();

const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
if (!secretKey.startsWith("sk_test_")) {
  console.error(
    "[stripe-test-mode-e2e] Refusing to run: STRIPE_SECRET_KEY must be a Stripe TEST mode key (sk_test_...). " +
      (secretKey ? "A non-test key is configured — nothing was sent to Stripe." : "It is not set."),
  );
  process.exit(1);
}

const {
  FOUNDING_COUPON_SPEC,
  EXPECTED_PRICE_SPECS,
  buildProCheckoutSessionParams,
  getStripeClient,
  getVerifiedFoundingCouponId,
  getVerifiedPriceIdForPeriod,
  stripeSubscriptionToRecord,
} = await import("../server/billing/stripe-client.js");
const { FOUNDING_FIRST_YEAR_PRICE_CENTS, PRO_ANNUAL_PRICE_CENTS, PRO_MONTHLY_PRICE_CENTS } = await import(
  "../shared/billing/pricing.js"
);

const stripe: Stripe = getStripeClient();
const RUN = `fh-e2e-${Date.now()}`;
let passed = 0;
const ok = (msg: string) => {
  passed += 1;
  console.log(`  ✓ ${msg}`);
};

async function setup(): Promise<void> {
  const product = await stripe.products.create({
    name: "Firehall Meals Pro",
    description: "Plan Ahead, Run It Back, Nutrition Goals, full meal history.",
  });
  const monthly = await stripe.prices.create({
    product: product.id,
    currency: EXPECTED_PRICE_SPECS.monthly.currency,
    unit_amount: EXPECTED_PRICE_SPECS.monthly.unitAmountCents,
    recurring: { interval: "month", interval_count: 1 },
    nickname: "Pro monthly",
  });
  const annual = await stripe.prices.create({
    product: product.id,
    currency: EXPECTED_PRICE_SPECS.annual.currency,
    unit_amount: EXPECTED_PRICE_SPECS.annual.unitAmountCents,
    recurring: { interval: "year", interval_count: 1 },
    nickname: "Pro annual",
  });
  const coupon = await stripe.coupons.create({
    name: "Founding offer — first year",
    amount_off: FOUNDING_COUPON_SPEC.amountOffCents,
    currency: FOUNDING_COUPON_SPEC.currency,
    duration: FOUNDING_COUPON_SPEC.duration,
    applies_to: { products: [product.id] },
  });
  console.log("Created in Stripe TEST mode. Add to .env:\n");
  console.log(`STRIPE_PRICE_ID_MONTHLY=${monthly.id}`);
  console.log(`STRIPE_PRICE_ID_ANNUAL=${annual.id}`);
  console.log(`STRIPE_COUPON_ID_FOUNDING=${coupon.id}`);
}

async function waitForClock(clockId: string): Promise<void> {
  for (let i = 0; i < 60; i++) {
    const clock = await stripe.testHelpers.testClocks.retrieve(clockId);
    if (clock.status === "ready") return;
    if (clock.status === "internal_failure") throw new Error(`test clock ${clockId} failed to advance`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`test clock ${clockId} did not finish advancing`);
}

async function advance(clockId: string, toUnix: number): Promise<void> {
  await stripe.testHelpers.testClocks.advance(clockId, { frozen_time: toUnix });
  await waitForClock(clockId);
}

async function verify(): Promise<void> {
  console.log("Configured prices + coupon (same verification checkout runs)");
  const monthlyPrice = await getVerifiedPriceIdForPeriod("monthly");
  const annualPrice = await getVerifiedPriceIdForPeriod("annual");
  const couponId = await getVerifiedFoundingCouponId();
  ok(`monthly ${monthlyPrice} = $5.99/month, annual ${annualPrice} = $39.99/year, coupon ${couponId} = $10 off once`);

  console.log("Real Checkout Sessions with our exact params");
  const probe = await stripe.customers.create({ email: `${RUN}@example.com`, metadata: { purpose: RUN } });
  try {
    const params = (period: "monthly" | "annual", founding: boolean) =>
      buildProCheckoutSessionParams({
        customerId: probe.id,
        userId: RUN,
        priceId: period === "monthly" ? monthlyPrice : annualPrice,
        billingPeriod: period,
        origin: "https://example.invalid",
        foundingCouponId: founding ? couponId : null,
      });
    const foundingSession = await stripe.checkout.sessions.create(params("annual", true));
    assert.ok(foundingSession.url?.startsWith("https://checkout.stripe.com/"));
    assert.equal(foundingSession.amount_total, FOUNDING_FIRST_YEAR_PRICE_CENTS, "founding checkout total must be $29.99");
    assert.equal(foundingSession.total_details?.amount_discount, FOUNDING_COUPON_SPEC.amountOffCents);
    const monthlySession = await stripe.checkout.sessions.create(params("monthly", false));
    assert.equal(monthlySession.amount_total, PRO_MONTHLY_PRICE_CENTS, "monthly checkout total must be $5.99");
    const standardSession = await stripe.checkout.sessions.create(params("annual", false));
    assert.equal(standardSession.amount_total, PRO_ANNUAL_PRICE_CENTS, "standard annual checkout total must be $39.99");
    for (const s of [foundingSession, monthlySession, standardSession]) await stripe.checkout.sessions.expire(s.id);
    ok("Stripe accepted all three sessions: founding annual $29.99, monthly $5.99, standard annual $39.99, no trial");
  } finally {
    await stripe.customers.del(probe.id);
  }

  console.log("Test clock lifecycle (founding annual)");
  const start = Math.floor(Date.now() / 1000);
  const clock = await stripe.testHelpers.testClocks.create({ frozen_time: start, name: RUN });
  try {
    const customer = await stripe.customers.create({ email: `${RUN}-clock@example.com`, test_clock: clock.id });
    const pm = await stripe.paymentMethods.attach("pm_card_visa", { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });

    const monthlySub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: monthlyPrice }],
      expand: ["latest_invoice"],
    });
    assert.equal((monthlySub.latest_invoice as Stripe.Invoice).total, PRO_MONTHLY_PRICE_CENTS);
    await stripe.subscriptions.cancel(monthlySub.id);
    ok("monthly first invoice: $5.99");

    let sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: annualPrice }],
      discounts: [{ coupon: couponId }],
      metadata: { user_id: RUN, founding_offer: "true" },
      expand: ["latest_invoice"],
    });
    assert.equal(sub.status, "active");
    assert.equal(sub.trial_end, null, "no Stripe trial");
    const firstInvoice = sub.latest_invoice as Stripe.Invoice;
    assert.equal(firstInvoice.total, FOUNDING_FIRST_YEAR_PRICE_CENTS);
    assert.equal(firstInvoice.status, "paid");
    assert.equal(stripeSubscriptionToRecord(sub).status, "active");
    ok("founding year 1: invoice $29.99 paid, subscription active, no trial");

    const periodEnd = sub.items.data[0]!.current_period_end;
    await advance(clock.id, periodEnd + 86400);
    const invoices = await stripe.invoices.list({ subscription: sub.id, limit: 5 });
    const renewal = invoices.data.find((inv) => inv.id !== firstInvoice.id);
    assert.ok(renewal, "a renewal invoice must exist after one year");
    assert.equal(renewal!.total, PRO_ANNUAL_PRICE_CENTS, "year 2 must renew at the standard $39.99");
    assert.equal(renewal!.status, "paid");
    sub = await stripe.subscriptions.retrieve(sub.id);
    assert.equal(sub.status, "active");
    ok("year 2: renewal invoice $39.99 paid automatically — coupon applied once only");

    sub = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
    const pending = stripeSubscriptionToRecord(sub);
    assert.equal(pending.status, "active");
    assert.equal(pending.cancelAtPeriodEnd, true);
    ok("cancel at period end: still active, maps to cancel_at_period_end=true");

    try {
      const portal = await stripe.billingPortal.sessions.create({ customer: customer.id, return_url: "https://example.invalid/account" });
      assert.ok(portal.url.startsWith("https://billing.stripe.com/"));
      ok("Customer Portal session created");
    } catch (err) {
      console.log(
        `  ! Customer Portal session failed — configure the TEST mode portal at https://dashboard.stripe.com/test/settings/billing/portal (${err instanceof Error ? err.message : err})`,
      );
    }

    await advance(clock.id, sub.items.data[0]!.current_period_end + 86400);
    sub = await stripe.subscriptions.retrieve(sub.id);
    assert.equal(sub.status, "canceled");
    assert.equal(stripeSubscriptionToRecord(sub).status, "cancelled");
    const after = await stripe.invoices.list({ subscription: sub.id, limit: 5 });
    assert.equal(after.data.length, invoices.data.length, "no invoice after the cancellation takes effect");
    ok("period end: subscription canceled, no further invoice, maps to cancelled");
  } finally {
    await stripe.testHelpers.testClocks.del(clock.id);
  }
  console.log(`\n${passed} passed — Stripe test mode OK`);
}

if (process.argv.includes("--setup")) {
  await setup();
} else {
  await verify();
}
