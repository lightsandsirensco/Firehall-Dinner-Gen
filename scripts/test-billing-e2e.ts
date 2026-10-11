#!/usr/bin/env tsx
/**
 * Phase 14 — Firehall Meals Pro billing end to end, fully offline:
 *
 *   Free → reverse trial → trial expiry → checkout → active Pro
 *        → cancel at period end → portal → cancellation
 *
 * What is REAL here: the production Express billing routes
 * (server/billing/routes.ts) with real auth sessions + CSRF, the real billing
 * store and every Postgres migration (run against in-process PGlite — never
 * DATABASE_URL), and real Stripe webhook signature verification (the Stripe
 * SDK's own constructEvent over HMAC-signed payloads).
 *
 * What is SIMULATED: Stripe's servers. A stand-in client records every
 * Checkout/Portal call our server makes and plays the parts of Stripe a
 * customer would drive by hand (paying on the hosted Checkout page,
 * cancelling in the Portal, the period ending). That Stripe really bills
 * $29.99 then renews at $39.99 for the founding coupon is verified against
 * real Stripe test mode by scripts/stripe-test-mode-e2e.ts (test clocks).
 *
 * Run: npx tsx scripts/test-billing-e2e.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Pool } from "pg";
import Stripe from "stripe";
import { PGlite } from "@electric-sql/pglite";

import { loadProjectEnv } from "../server/lib/load-project-env.js";

// Load .env once now so no later import can re-apply it over the overrides below.
loadProjectEnv();
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "fh-billing-e2e-"));
const WEBHOOK_SECRET = "whsec_offline_e2e_harness";
const PRICE_MONTHLY = "price_e2e_monthly";
const PRICE_ANNUAL = "price_e2e_annual";
const COUPON_FOUNDING = "coupon_e2e_founding";
process.env.LOCAL_SQLITE_DB_PATH = path.join(TMP_DIR, "cache.db");
process.env.DATABASE_URL = "postgres://pglite.invalid/never-connect";
process.env.STRIPE_SECRET_KEY = "sk_test_offline_e2e_harness_no_network";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.STRIPE_PRICE_ID_MONTHLY = PRICE_MONTHLY;
process.env.STRIPE_PRICE_ID_ANNUAL = PRICE_ANNUAL;
process.env.STRIPE_COUPON_ID_FOUNDING = COUPON_FOUNDING;
process.env.PUBLIC_SITE_URL = "https://e2e.firehallmeals.invalid";
// Plan changes sync to Klaviyo — never let harness users reach a real marketing account.
delete process.env.KLAVIYO_API_KEY;
delete process.env.KLAVIYO_WEBHOOK_SECRET;

const blockedRequests: string[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname !== "127.0.0.1") {
    blockedRequests.push(url.hostname);
    throw new Error(`test-billing-e2e: outbound request to ${url.hostname} blocked`);
  }
  return realFetch(input, init);
}) as typeof fetch;

const pg = new PGlite();
const pglitePool = {
  async query(text: string, params?: unknown[]) {
    if (params === undefined) {
      const results = await pg.exec(text);
      return results[results.length - 1] ?? { rows: [] };
    }
    return pg.query(text, params);
  },
  async connect() {
    return { query: pglitePool.query, release() {} };
  },
  async end() {},
  on() {},
};

const { setPgPoolForTests } = await import("../server/db/pg-client.js");
setPgPoolForTests(pglitePool as unknown as Pool);

const express = (await import("express")).default;
const cookieParser = (await import("cookie-parser")).default;
const { runPgMigrations } = await import("../server/db/pg-migrate.js");
const { runDbMigrations } = await import("../server/db/migrate.js");
const { releaseSqliteTimersForTests } = await import("../server/sqlite.js");
const { createAuthSession, getAuthCookieName, upsertEmailUser } = await import("../server/auth/auth-store.js");
const { attachAuthUser } = await import("../server/auth/auth-middleware.js");
const { registerBillingRoutes } = await import("../server/billing/routes.js");
const { adminSetGlobalFlag } = await import("../server/billing/store.js");
const stripeClient = await import("../server/billing/stripe-client.js");
const { foundingOfferApplies } = await import("../shared/billing/pricing.js");
type UserBillingState = import("../shared/billing/types.js").UserBillingState;

let passed = 0;
function ok(name: string): void {
  passed += 1;
  console.log(`  ✓ ${name}`);
}

// ---------------------------------------------------------------------------
// Stand-in Stripe. Every call our server makes is recorded; Stripe's own
// request validation that matters here is mirrored (discounts cannot be
// combined with allow_promotion_codes).
// ---------------------------------------------------------------------------
type FakeSubscription = {
  id: string;
  object: "subscription";
  customer: string;
  status: Stripe.Subscription.Status;
  cancel_at_period_end: boolean;
  cancel_at: number | null;
  metadata: Record<string, string>;
  discounts: string[];
  items: { data: Array<{ price: { id: string }; current_period_end: number }> };
};

const PRICES: Record<string, { unit_amount: number; currency: string; recurring: { interval: string; interval_count: number } }> = {
  [PRICE_MONTHLY]: { unit_amount: 599, currency: "usd", recurring: { interval: "month", interval_count: 1 } },
  [PRICE_ANNUAL]: { unit_amount: 3999, currency: "usd", recurring: { interval: "year", interval_count: 1 } },
};

const fake = {
  seq: 0,
  customers: new Map<string, { id: string; email?: string; metadata: Record<string, string> }>(),
  sessions: new Map<string, { id: string; status: "open" | "complete" | "expired"; params: Stripe.Checkout.SessionCreateParams }>(),
  subscriptions: new Map<string, FakeSubscription>(),
  portalSessions: [] as Array<{ customer: string; return_url: string }>,
  coupon: { id: COUPON_FOUNDING, amount_off: 1000, percent_off: null as number | null, currency: "usd", duration: "once", valid: true },
  annualPriceOverride: null as null | number,
  id(prefix: string) {
    this.seq += 1;
    return `${prefix}_e2e_${this.seq}`;
  },
};

const realStripe = new Stripe("sk_test_offline_signature_only", { apiVersion: "2026-08-26.dahlia" });

const fakeStripe = {
  webhooks: realStripe.webhooks,
  customers: {
    async create(params: { email?: string; metadata?: Record<string, string> }) {
      const customer = { id: fake.id("cus"), email: params.email, metadata: params.metadata ?? {} };
      fake.customers.set(customer.id, customer);
      return customer;
    },
  },
  prices: {
    async retrieve(id: string) {
      const price = PRICES[id];
      if (!price) throw new Error(`No such price: ${id}`);
      if (id === PRICE_ANNUAL && fake.annualPriceOverride != null) return { id, ...price, unit_amount: fake.annualPriceOverride };
      return { id, ...price };
    },
  },
  coupons: {
    async retrieve(id: string) {
      if (id !== fake.coupon.id) throw new Error(`No such coupon: ${id}`);
      return { ...fake.coupon };
    },
  },
  checkout: {
    sessions: {
      async list(params: { customer: string; status: string }) {
        const data = [...fake.sessions.values()]
          .filter((s) => s.params.customer === params.customer && s.status === params.status)
          .map((s) => ({ id: s.id }));
        return { data };
      },
      async expire(id: string) {
        const s = fake.sessions.get(id);
        if (!s || s.status !== "open") throw new Error(`Session ${id} is not open`);
        s.status = "expired";
        return { id, status: "expired" };
      },
      async create(params: Stripe.Checkout.SessionCreateParams) {
        if (params.discounts?.length && params.allow_promotion_codes) {
          throw new Error("You may only specify one of these parameters: allow_promotion_codes, discounts.");
        }
        const id = fake.id("cs");
        fake.sessions.set(id, { id, status: "open", params });
        return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
      },
    },
  },
  subscriptions: {
    async retrieve(id: string) {
      const sub = fake.subscriptions.get(id);
      if (!sub) throw new Error(`No such subscription: ${id}`);
      return structuredClone(sub);
    },
  },
  billingPortal: {
    sessions: {
      async create(params: { customer: string; return_url: string }) {
        fake.portalSessions.push(params);
        return { url: `https://billing.stripe.com/p/session/${fake.id("bps")}` };
      },
    },
  },
};

stripeClient.setStripeClientForTests(fakeStripe as unknown as Stripe);

/** The customer pays on the hosted Checkout page: Stripe creates the subscription and fires the webhook. */
function stripeCompletesCheckout(sessionId: string): Stripe.Event {
  const session = fake.sessions.get(sessionId)!;
  assert.equal(session.status, "open", "only an open Checkout Session can be paid");
  session.status = "complete";
  const params = session.params;
  const priceId = params.line_items![0]!.price!;
  const yearOrMonth = PRICES[priceId]!.recurring.interval === "year" ? 365 : 30;
  const sub: FakeSubscription = {
    id: fake.id("sub"),
    object: "subscription",
    customer: params.customer!,
    status: "active",
    cancel_at_period_end: false,
    cancel_at: null,
    metadata: { ...(params.subscription_data?.metadata as Record<string, string>) },
    discounts: (params.discounts ?? []).map((d) => d.coupon!).filter(Boolean),
    items: { data: [{ price: { id: priceId }, current_period_end: Math.floor(Date.now() / 1000) + yearOrMonth * 86400 }] },
  };
  fake.subscriptions.set(sub.id, sub);
  return event("checkout.session.completed", {
    id: sessionId,
    object: "checkout.session",
    mode: "subscription",
    client_reference_id: params.client_reference_id,
    customer: params.customer,
    subscription: sub.id,
    metadata: params.metadata,
  });
}

function event(type: string, object: unknown): Stripe.Event {
  return { id: fake.id("evt"), object: "event", type, data: { object } } as unknown as Stripe.Event;
}

// ---------------------------------------------------------------------------
// HTTP harness — the real billing routes behind cookie auth + CSRF.
// ---------------------------------------------------------------------------
await runPgMigrations();
await runDbMigrations();

const app = express();
app.use(express.json({ verify: (req, _res, buf) => ((req as unknown as { rawBody: Buffer }).rawBody = buf) }));
app.use(cookieParser());
app.use(attachAuthUser);
registerBillingRoutes(app);
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", () => resolve()));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const CSRF = "csrf-e2e-token";
async function signIn(label: string): Promise<{ userId: string; cookie: string }> {
  const { user } = await upsertEmailUser(`billing-e2e-${label}@test.invalid`);
  const { token } = await createAuthSession(user.user_id, true);
  return { userId: user.user_id, cookie: `${getAuthCookieName()}=${token}; csrf_token=${CSRF}` };
}

async function call<T = Record<string, unknown>>(
  who: { cookie: string },
  method: "GET" | "POST",
  route: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${base}${route}`, {
    method,
    headers: { cookie: who.cookie, "x-csrf-token": CSRF, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as T };
}

async function deliver(evt: Stripe.Event, opts: { secret?: string } = {}): Promise<{ status: number; body: Record<string, unknown> }> {
  const payload = JSON.stringify(evt);
  const signature = realStripe.webhooks.generateTestHeaderString({ payload, secret: opts.secret ?? WEBHOOK_SECRET });
  const res = await fetch(`${base}/api/billing/stripe-webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: payload,
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const me = async (who: { cookie: string }) => (await call<UserBillingState>(who, "GET", "/api/billing/me")).body;
const lastSession = () => [...fake.sessions.values()].at(-1)!;

try {
  console.log("Pure contracts");
  {
    assert.equal(stripeClient.EXPECTED_PRICE_SPECS.monthly.unitAmountCents, 599);
    assert.equal(stripeClient.EXPECTED_PRICE_SPECS.annual.unitAmountCents, 3999);
    ok("Stripe price contract is $5.99/month and $39.99/year");

    const good = { amount_off: 1000, percent_off: null, currency: "usd", duration: "once", valid: true };
    assert.equal(stripeClient.couponMatchesFoundingSpec(good).ok, true);
    assert.equal(stripeClient.couponMatchesFoundingSpec({ ...good, duration: "forever" }).ok, false, "forever would discount every renewal");
    assert.equal(stripeClient.couponMatchesFoundingSpec({ ...good, duration: "repeating" }).ok, false);
    assert.equal(stripeClient.couponMatchesFoundingSpec({ ...good, amount_off: 999 }).ok, false);
    assert.equal(stripeClient.couponMatchesFoundingSpec({ ...good, amount_off: null, percent_off: 25 }).ok, false);
    assert.equal(stripeClient.couponMatchesFoundingSpec({ ...good, currency: "cad" }).ok, false);
    assert.equal(stripeClient.couponMatchesFoundingSpec({ ...good, valid: false }).ok, false);
    ok("founding coupon contract: exactly $10.00 USD off, duration=once, still valid");

    assert.equal(foundingOfferApplies({ billingPeriod: "annual", offerEnabled: true, hadPaidSubscription: false }), true);
    assert.equal(foundingOfferApplies({ billingPeriod: "monthly", offerEnabled: true, hadPaidSubscription: false }), false);
    assert.equal(foundingOfferApplies({ billingPeriod: "annual", offerEnabled: false, hadPaidSubscription: false }), false);
    assert.equal(foundingOfferApplies({ billingPeriod: "annual", offerEnabled: true, hadPaidSubscription: true }), false);
    ok("founding offer applies to a first annual subscription only, while switched on");

    const base = { customerId: "cus_x", userId: "u", priceId: PRICE_ANNUAL, billingPeriod: "annual" as const, origin: "https://x" };
    const withCoupon = stripeClient.buildProCheckoutSessionParams({ ...base, foundingCouponId: COUPON_FOUNDING });
    const without = stripeClient.buildProCheckoutSessionParams({ ...base, foundingCouponId: null });
    for (const p of [withCoupon, without]) {
      assert.equal(p.mode, "subscription");
      assert.ok(!JSON.stringify(p).includes("trial"), "checkout must never request a Stripe trial");
    }
    assert.deepEqual(withCoupon.discounts, [{ coupon: COUPON_FOUNDING }]);
    assert.equal(withCoupon.allow_promotion_codes, undefined);
    assert.equal(without.discounts, undefined);
    assert.equal(without.allow_promotion_codes, true);
    ok("checkout params: never a Stripe trial; founding uses discounts, otherwise promo codes allowed");

    const subBase = { status: "active" as const, cancel_at_period_end: false, cancel_at: null, items: { data: [{ price: { id: "p" }, current_period_end: 1_900_000_000 }] } };
    assert.equal(stripeClient.stripeSubscriptionToRecord(subBase).cancelAtPeriodEnd, false);
    assert.equal(stripeClient.stripeSubscriptionToRecord({ ...subBase, cancel_at_period_end: true }).cancelAtPeriodEnd, true);
    assert.equal(stripeClient.stripeSubscriptionToRecord({ ...subBase, cancel_at: 1_900_000_000 }).cancelAtPeriodEnd, true);
    assert.equal(stripeClient.stripeSubscriptionToRecord(subBase).currentPeriodEnd, new Date(1_900_000_000_000).toISOString());
    assert.equal(stripeClient.stripeSubscriptionToRecord({ ...subBase, status: "unpaid" }).status, "cancelled");
    ok("subscription mapping: cancel_at_period_end or cancel_at both mean a scheduled cancellation");
  }

  console.log("Full lifecycle: Free → trial → expiry → checkout → Pro → cancel at period end → portal → cancelled");
  const ff = await signIn("lifecycle");

  // 1. Free
  let state = await me(ff);
  assert.equal(state.effective_plan_id, "personal");
  assert.equal(state.features.plan_ahead, false);
  assert.equal(state.pro_trial_eligible, true);
  assert.equal(state.founding_offer_eligible, true, "migration 0017 turns the founding offer on");
  ok("1. Free: no Pro features, trial and founding offer both available");

  // 2. Reverse trial (no card, no Stripe)
  const trialStart = await call<{ billing: UserBillingState }>(ff, "POST", "/api/billing/trial/start", { paywall_source: "e2e" });
  assert.equal(trialStart.status, 200);
  state = trialStart.body.billing;
  assert.equal(state.effective_plan_id, "firefighter_plus");
  assert.equal(state.pro_trial?.status, "active");
  assert.equal(state.pro_trial?.days_left, 14);
  assert.equal(state.features.plan_ahead, true);
  assert.equal(state.subscription, null, "the reverse trial never creates a subscription");
  assert.equal(fake.customers.size + fake.sessions.size, 0, "the reverse trial never touches Stripe");
  ok("2. Reverse trial: 14 days of Pro, no subscription, no Stripe calls");

  // Payments stay off: checkout is refused even mid-trial.
  const blocked = await call(ff, "POST", "/api/billing/checkout", { billing_period: "annual" });
  assert.equal(blocked.status, 503, "payments_enabled is off by default");
  assert.equal(fake.sessions.size, 0);
  ok("   payments_enabled off (default): checkout refused with 503, nothing sent to Stripe");

  // 3. Trial expiry (time travel: the trial started 15 days ago)
  await pg.query(
    `UPDATE personal_pro_trials SET trial_started_at = now() - interval '15 days', trial_expires_at = now() - interval '1 day' WHERE user_id = $1`,
    [ff.userId],
  );
  state = await me(ff);
  assert.equal(state.effective_plan_id, "personal");
  assert.equal(state.pro_trial?.status, "expired");
  assert.equal(state.pro_trial_eligible, false);
  assert.equal(state.features.plan_ahead, false);
  assert.equal(state.founding_offer_eligible, true, "an expired trial is not a paid subscription");
  const secondTrial = await call<{ code: string }>(ff, "POST", "/api/billing/trial/start", { paywall_source: "e2e" });
  assert.equal(secondTrial.status, 409);
  assert.equal(secondTrial.body.code, "trial_used");
  ok("3. Trial expiry: back to Free automatically, second trial refused, founding offer still available");

  // 4. Checkout (admin turns payments on — in this in-process database only)
  await adminSetGlobalFlag("payments_enabled", true);
  const firstTab = await call<{ url: string }>(ff, "POST", "/api/billing/checkout", { billing_period: "annual" });
  assert.equal(firstTab.status, 200);
  assert.ok(firstTab.body.url.startsWith("https://checkout.stripe.com/"));
  const firstSession = lastSession();
  const secondTab = await call<{ url: string }>(ff, "POST", "/api/billing/checkout", { billing_period: "annual" });
  assert.equal(secondTab.status, 200);
  assert.equal(firstSession.status, "expired", "opening checkout again expires the earlier open session");
  assert.equal(fake.customers.size, 1, "one Stripe customer is reused across checkout attempts");
  const session = lastSession();
  const p = session.params;
  assert.equal(p.mode, "subscription");
  assert.deepEqual(p.line_items, [{ price: PRICE_ANNUAL, quantity: 1 }]);
  assert.deepEqual(p.discounts, [{ coupon: COUPON_FOUNDING }], "first annual subscription gets the founding coupon");
  assert.equal(p.allow_promotion_codes, undefined);
  assert.equal(p.client_reference_id, ff.userId);
  assert.equal(p.subscription_data?.metadata?.user_id, ff.userId);
  assert.equal(p.subscription_data?.metadata?.founding_offer, "true");
  assert.ok(!JSON.stringify(p).includes("trial"), "no Stripe trial in the session");
  assert.equal(p.success_url, "https://e2e.firehallmeals.invalid/plans?checkout=success");
  ok("4. Checkout: $39.99/yr price + once-only $10 founding coupon, no Stripe trial, stale tab expired");

  // Not Pro until the webhook lands (returning to success_url alone grants nothing).
  assert.equal((await me(ff)).effective_plan_id, "personal");

  // 5. Active Pro via checkout.session.completed
  const completed = stripeCompletesCheckout(session.id);
  const tampered = await deliver(completed, { secret: "whsec_wrong" });
  assert.equal(tampered.status, 400, "a webhook signed with the wrong secret is rejected");
  assert.equal((await me(ff)).effective_plan_id, "personal");
  const delivered = await deliver(completed);
  assert.equal(delivered.status, 200);
  state = await me(ff);
  assert.equal(state.effective_plan_id, "firefighter_plus");
  assert.equal(state.subscription?.source, "stripe");
  assert.equal(state.subscription?.status, "active");
  assert.equal(state.subscription?.cancel_at_period_end, false);
  assert.ok(state.subscription?.current_period_end);
  assert.equal(state.manage_billing_available, true);
  assert.equal(state.features.plan_ahead, true);
  assert.equal(state.founding_offer_eligible, false, "the founding price is a one-time first subscription offer");
  const redelivered = await deliver(completed);
  assert.equal(redelivered.body.duplicate, true, "Stripe redelivery is idempotent");
  ok("5. Active Pro: signed webhook grants Pro + Manage Billing; bad signature and redelivery are safe");

  // Duplicate subscription prevention: a Pro subscriber goes to the Portal, not a second Checkout.
  const sessionsBefore = fake.sessions.size;
  const dup = await call<{ url: string; redirected_to_portal: boolean }>(ff, "POST", "/api/billing/checkout", { billing_period: "monthly" });
  assert.equal(dup.status, 200);
  assert.equal(dup.body.redirected_to_portal, true);
  assert.ok(dup.body.url.startsWith("https://billing.stripe.com/"));
  assert.equal(fake.sessions.size, sessionsBefore, "no new Checkout Session for an active subscriber");
  ok("   duplicate checkout by an active subscriber → Customer Portal, no second subscription");

  // 6. Cancel at period end (customer cancels in the Portal)
  const subId = [...fake.subscriptions.keys()][0]!;
  const sub = fake.subscriptions.get(subId)!;
  assert.deepEqual(sub.discounts, [COUPON_FOUNDING]);
  sub.cancel_at_period_end = true;
  assert.equal((await deliver(event("customer.subscription.updated", structuredClone(sub)))).status, 200);
  state = await me(ff);
  assert.equal(state.effective_plan_id, "firefighter_plus", "access continues until the paid period ends");
  assert.equal(state.subscription?.cancel_at_period_end, true);
  ok("6. Cancel at period end: still Pro, cancellation recorded");

  // 7. Portal still opens (invoices, resubscribe) while cancellation is pending
  const portal = await call<{ url: string }>(ff, "POST", "/api/billing/portal");
  assert.equal(portal.status, 200);
  assert.ok(portal.body.url.startsWith("https://billing.stripe.com/"));
  assert.equal(fake.portalSessions.at(-1)?.customer, sub.customer);
  assert.equal(fake.portalSessions.at(-1)?.return_url, "https://e2e.firehallmeals.invalid/account");
  ok("7. Portal: opens for the subscriber's own Stripe customer, returns to /account");

  // 8. Cancellation (the period ends; Stripe deletes the subscription)
  sub.status = "canceled";
  assert.equal((await deliver(event("customer.subscription.deleted", structuredClone(sub)))).status, 200);
  state = await me(ff);
  assert.equal(state.effective_plan_id, "personal");
  assert.equal(state.subscription?.status, "cancelled");
  assert.equal(state.features.plan_ahead, false);
  assert.equal(state.manage_billing_available, true, "past invoices stay reachable in the Portal");
  assert.equal(state.founding_offer_eligible, false);
  ok("8. Cancellation: back to Free, Pro features locked, Portal still available");

  // Resubscribing is allowed — at the standard price (founding was the first subscription only).
  const resub = await call(ff, "POST", "/api/billing/checkout", { billing_period: "annual" });
  assert.equal(resub.status, 200);
  assert.equal(lastSession().params.discounts, undefined, "returning subscriber pays the standard $39.99");
  assert.equal(lastSession().params.allow_promotion_codes, true);
  ok("   resubscribe after cancellation: allowed, standard annual price, no founding coupon");

  console.log("Checkout variants");
  {
    const monthly = await signIn("monthly");
    assert.equal((await call(monthly, "POST", "/api/billing/checkout", { billing_period: "monthly" })).status, 200);
    assert.deepEqual(lastSession().params.line_items, [{ price: PRICE_MONTHLY, quantity: 1 }]);
    assert.equal(lastSession().params.discounts, undefined, "the founding offer never applies to monthly");
    const done = stripeCompletesCheckout(lastSession().id);
    await deliver(done);
    const s = await me(monthly);
    assert.equal(s.effective_plan_id, "firefighter_plus");
    ok("monthly checkout: $5.99/month price, no coupon, Pro after webhook");

    // subscription.updated resolved by customer id alone (no metadata), e.g. a Portal plan change.
    const mSub = [...fake.subscriptions.values()].at(-1)!;
    mSub.metadata = {};
    mSub.status = "past_due";
    await deliver(event("customer.subscription.updated", structuredClone(mSub)));
    assert.equal((await me(monthly)).subscription?.status, "past_due");
    assert.equal((await me(monthly)).effective_plan_id, "firefighter_plus", "past_due keeps access during retries");
    mSub.status = "unpaid";
    await deliver(event("customer.subscription.updated", structuredClone(mSub)));
    assert.equal((await me(monthly)).effective_plan_id, "personal", "unpaid (retries exhausted) ends access");
    ok("subscription.updated maps by customer id: past_due keeps Pro, unpaid revokes it");

    await adminSetGlobalFlag("founding_offer_enabled", false);
    const late = await signIn("after-founding");
    assert.equal((await me(late)).founding_offer_eligible, false);
    assert.equal((await call(late, "POST", "/api/billing/checkout", { billing_period: "annual" })).status, 200);
    assert.equal(lastSession().params.discounts, undefined);
    await adminSetGlobalFlag("founding_offer_enabled", true);
    ok("founding offer switched off: new annual checkouts pay $39.99, UI eligibility false");

    const unlucky = await signIn("coupon-gone");
    fake.coupon.valid = false;
    const before = fake.sessions.size;
    const gone = await call(unlucky, "POST", "/api/billing/checkout", { billing_period: "annual" });
    assert.equal(gone.status, 503, "never charge $39.99 to someone shown $29.99");
    assert.equal(fake.sessions.size, before);
    fake.coupon.valid = true;
    ok("founding coupon no longer valid: fails closed (503), no Checkout Session");

    stripeClient.resetVerifiedPriceIdsForTests();
    fake.annualPriceOverride = 2999;
    const misconfigured = await signIn("bad-price");
    const bad = await call(misconfigured, "POST", "/api/billing/checkout", { billing_period: "annual" });
    assert.equal(bad.status, 500);
    fake.annualPriceOverride = null;
    stripeClient.resetVerifiedPriceIdsForTests();
    ok("misconfigured annual price ID (wrong amount): checkout refused before reaching Stripe Checkout");

    const config = (await call<{ founding_offer_enabled: boolean; payments_enabled: boolean }>(ff, "GET", "/api/billing/config")).body;
    assert.equal(config.founding_offer_enabled, true);
    const plans = (await call<{ plans: Array<{ plan_id: string; price_label: string }> }>(ff, "GET", "/api/billing/plans")).body;
    assert.equal(plans.plans.find((x) => x.plan_id === "firefighter_plus")?.price_label, "$5.99/mo · $39.99/yr");
    ok("public config exposes founding_offer_enabled; catalog price label is $5.99/mo · $39.99/yr");
  }

  await new Promise((resolve) => setTimeout(resolve, 200));
  console.log(`(outbound requests blocked during run: ${blockedRequests.length ? [...new Set(blockedRequests)].join(", ") : "none"})`);

  console.log(`\n${passed} passed — billing E2E OK`);
} finally {
  server.close();
  releaseSqliteTimersForTests();
  stripeClient.setStripeClientForTests(null);
  await pg.close();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
}
