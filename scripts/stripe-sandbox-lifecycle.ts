#!/usr/bin/env tsx
/**
 * Firehall Meals Pro subscription lifecycle against REAL Stripe test mode,
 * reconciled through the REAL webhook route into an in-process PGlite app
 * database (never DATABASE_URL). Each scenario drives a real subscription on a
 * Stripe test clock, then delivers a signed webhook so the route re-fetches
 * the subscription from Stripe exactly as production does.
 *
 *   $env:STRIPE_TEST_SECRET_KEY = "sk_test_..."   (or set it in the private prod.env)
 *   npx tsx scripts/stripe-sandbox-lifecycle.ts
 *
 * Refuses any key that is not sk_test_. Test clocks (and their customers) and
 * customers created by Checkout are deleted afterwards.
 */
import "./lib/pglite-test-db.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import Stripe from "stripe";
import { testPg } from "./lib/pglite-test-db.js";

function readTestKey(): string {
  const fromEnv = process.env.STRIPE_TEST_SECRET_KEY?.trim();
  if (fromEnv) return fromEnv;
  const file = path.join(os.homedir(), "AppData", "Local", "FirehallMeals", "secrets", "prod.env");
  if (!fs.existsSync(file)) return "";
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith("STRIPE_TEST_SECRET_KEY="));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : "";
}

const testKey = readTestKey();
if (!testKey.startsWith("sk_test_")) {
  console.error("[stripe-sandbox-lifecycle] Refusing to run: STRIPE_TEST_SECRET_KEY must be a sk_test_ key.");
  process.exit(1);
}
const WEBHOOK_SECRET = "whsec_sandbox_lifecycle_local";
process.env.STRIPE_SECRET_KEY = testKey;
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.PUBLIC_SITE_URL = "https://sandbox.firehallmeals.invalid";

const stripe = new Stripe(testKey, { apiVersion: "2026-08-26.dahlia" });
const account = await stripe.accounts.retrieve();
console.log(`[stripe-sandbox-lifecycle] Stripe test account ${account.id} (${account.settings?.dashboard?.display_name ?? "?"})`);

// Configured Pro prices in this sandbox: $4.99/month and $39.99/year USD.
const prices = await stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] });
const findPrice = (amount: number, interval: "month" | "year") =>
  prices.data.find(
    (p) =>
      p.unit_amount === amount &&
      p.currency === "usd" &&
      p.recurring?.interval === interval &&
      p.recurring.interval_count === 1 &&
      typeof p.product === "object" &&
      "name" in p.product &&
      /firehall/i.test(p.product.name),
  );
const monthlyPrice = findPrice(499, "month");
const annualPrice = findPrice(3999, "year");
assert.ok(monthlyPrice && annualPrice, "sandbox must have Firehall Meals Pro $4.99/month and $39.99/year USD prices");
process.env.STRIPE_PRICE_ID_MONTHLY = monthlyPrice.id;
process.env.STRIPE_PRICE_ID_ANNUAL = annualPrice.id;

const express = (await import("express")).default;
const cookieParser = (await import("cookie-parser")).default;
const { createAuthSession, getAuthCookieName, upsertEmailUser } = await import("../server/auth/auth-store.js");
const { attachAuthUser } = await import("../server/auth/auth-middleware.js");
const { registerBillingRoutes } = await import("../server/billing/routes.js");
const { adminSetGlobalFlag, linkStripeCustomer } = await import("../server/billing/store.js");
const { ensureStripeSubscriptionCancelledForDeletion } = await import("../server/billing/account-deletion-guard.js");
type UserBillingState = import("../shared/billing/types.js").UserBillingState;

const app = express();
app.use(express.json({ verify: (req, _res, buf) => ((req as unknown as { rawBody: Buffer }).rawBody = buf) }));
app.use(cookieParser());
app.use(attachAuthUser);
registerBillingRoutes(app);
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", () => resolve()));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const RUN = `fh-sbx-${Date.now()}`;
const CSRF = "csrf-sandbox-token";
const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
const clocks: string[] = [];
const looseCustomers: string[] = [];
let eventSeq = 0;

type Who = { userId: string; cookie: string };
async function signIn(label: string): Promise<Who> {
  const { user } = await upsertEmailUser(`${RUN}-${label}@test.invalid`);
  const { token } = await createAuthSession(user.user_id, true);
  return { userId: user.user_id, cookie: `${getAuthCookieName()}=${token}; csrf_token=${CSRF}` };
}
async function call<T = Record<string, unknown>>(who: Who, method: "GET" | "POST", route: string, body?: unknown) {
  const res = await fetch(`${base}${route}`, {
    method,
    headers: { cookie: who.cookie, "x-csrf-token": CSRF, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as T };
}
const me = async (who: Who) => (await call<UserBillingState>(who, "GET", "/api/billing/me")).body;
const isPro = async (who: Who) => (await me(who)).features.plan_ahead === true;
async function row(who: Who) {
  const r = await testPg.query<{
    status: string;
    stripe_price_id: string | null;
    cancel_at_period_end: number | boolean | null;
    current_period_end: string | null;
  }>("SELECT status, stripe_price_id, cancel_at_period_end, current_period_end FROM user_subscriptions WHERE user_id = $1", [
    who.userId,
  ]);
  return r.rows[0] ?? null;
}

async function deliver(type: string, object: unknown, id = `evt_${RUN}_${++eventSeq}`) {
  const payload = JSON.stringify({ id, object: "event", type, livemode: false, data: { object } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  const res = await fetch(`${base}/api/billing/stripe-webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: payload,
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, id };
}
const fetchSub = (id: string) => stripe.subscriptions.retrieve(id, { expand: ["latest_invoice"] });
const syncSub = async (id: string, type = "customer.subscription.updated") => deliver(type, await fetchSub(id));

async function newClock(label: string): Promise<Stripe.TestHelpers.TestClock> {
  const clock = await stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(Date.now() / 1000), name: `${RUN}-${label}` });
  clocks.push(clock.id);
  return clock;
}
async function advance(clockId: string, days: number): Promise<void> {
  const clock = await stripe.testHelpers.testClocks.retrieve(clockId);
  await stripe.testHelpers.testClocks.advance(clockId, { frozen_time: clock.frozen_time + Math.round(days * 86400) });
  for (let i = 0; i < 120; i++) {
    const c = await stripe.testHelpers.testClocks.retrieve(clockId);
    if (c.status === "ready") return;
    if (c.status === "internal_failure") throw new Error(`test clock ${clockId} failed`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`test clock ${clockId} did not finish advancing`);
}
/** A customer exactly as /api/billing/checkout links it, but on a test clock with a test card. */
async function clockedCustomer(who: Who, clockId: string, card: string): Promise<string> {
  const customer = await stripe.customers.create({
    email: `${RUN}@test.invalid`,
    metadata: { user_id: who.userId },
    test_clock: clockId,
    payment_method: card,
    invoice_settings: { default_payment_method: card },
  });
  await linkStripeCustomer(who.userId, customer.id);
  return customer.id;
}
async function setDefaultCard(customerId: string, card: string): Promise<string> {
  const pm = await stripe.paymentMethods.attach(card, { customer: customerId });
  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm.id } });
  return pm.id;
}
const createSub = (customer: string, price: string, who: Who) =>
  stripe.subscriptions.create({
    customer,
    items: [{ price }],
    payment_behavior: "allow_incomplete",
    metadata: { user_id: who.userId },
    expand: ["latest_invoice"],
  });

async function scenario(name: string, fn: () => Promise<string | void>): Promise<void> {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail ?? undefined });
    console.log(`  PASS ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (err) {
    results.push({ name, ok: false, detail: (err as Error).message });
    console.log(`  FAIL ${name} — ${(err as Error).message}`);
  }
}

try {
  await adminSetGlobalFlag("monetization_enabled", true);

  await scenario("checkout refused while payments_enabled is off (production default)", async () => {
    const who = await signIn("flag-off");
    await adminSetGlobalFlag("payments_enabled", false);
    const r = await call(who, "POST", "/api/billing/checkout", { billing_period: "monthly" });
    assert.equal(r.status, 503);
  });
  await adminSetGlobalFlag("payments_enabled", true);

  await scenario("monthly + annual Checkout Sessions accepted by real Stripe; success page grants nothing; abandoned tab expired", async () => {
    const who = await signIn("checkout");
    const monthly = await call<{ url?: string }>(who, "POST", "/api/billing/checkout", { billing_period: "monthly" });
    assert.equal(monthly.status, 200, JSON.stringify(monthly.body));
    assert.ok(monthly.body.url?.startsWith("https://checkout.stripe.com/"));
    const customerId = (await testPg.query<{ stripe_customer_id: string }>(
      "SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = $1",
      [who.userId],
    )).rows[0]?.stripe_customer_id;
    assert.ok(customerId, "checkout links a Stripe customer");
    looseCustomers.push(customerId);
    const first = (await stripe.checkout.sessions.list({ customer: customerId, limit: 5 })).data[0]!;
    assert.equal(first.amount_total ?? first.amount_subtotal, 499);
    assert.equal(first.currency, "usd");
    assert.equal(first.mode, "subscription");
    assert.equal(await isPro(who), false, "an open/abandoned checkout must not grant Pro");

    const annual = await call<{ url?: string }>(who, "POST", "/api/billing/checkout", { billing_period: "annual" });
    assert.equal(annual.status, 200);
    const sessions = (await stripe.checkout.sessions.list({ customer: customerId, limit: 5 })).data;
    const expired = sessions.find((s) => s.id === first.id)!;
    assert.equal(expired.status, "expired", "previous open session is expired so two tabs cannot both subscribe");
    const open = sessions.find((s) => s.status === "open")!;
    assert.equal(open.amount_subtotal, 3999);
    const success = await fetch(`${base}/plans?checkout=success`, { headers: { cookie: who.cookie } });
    assert.notEqual(success.status, 500);
    assert.equal(await isPro(who), false, "reaching /plans?checkout=success must not grant Pro");
    return `tax=${open.automatic_tax?.enabled ? "automatic" : "off"}`;
  });

  // Monthly: activation → renewal → upgrade to annual → cancel at period end → expiry.
  const clockA = await newClock("monthly");
  const userA = await signIn("monthly");
  let subA = "";
  await scenario("new monthly subscription: paid $4.99 → Pro immediately via webhook", async () => {
    const cus = await clockedCustomer(userA, clockA.id, "pm_card_visa");
    const sub = await createSub(cus, monthlyPrice.id, userA);
    subA = sub.id;
    assert.equal(sub.status, "active");
    const inv = sub.latest_invoice as Stripe.Invoice;
    assert.equal(inv.amount_paid, 499);
    assert.equal(await isPro(userA), false, "nothing granted before Stripe reports it");
    const r = await syncSub(sub.id, "customer.subscription.created");
    assert.equal(r.status, 200);
    assert.equal(await isPro(userA), true);
    assert.equal((await row(userA))?.stripe_price_id, monthlyPrice.id);
  });
  await scenario("webhook redelivery (same event id) is a no-op; bad signature rejected", async () => {
    const sub = await fetchSub(subA);
    const id = `evt_${RUN}_dup`;
    assert.equal((await deliver("customer.subscription.updated", sub, id)).status, 200);
    const again = await deliver("customer.subscription.updated", sub, id);
    assert.equal(again.body.duplicate, true);
    const payload = JSON.stringify({ id: `evt_${RUN}_bad`, type: "customer.subscription.deleted", data: { object: sub } });
    const bad = await fetch(`${base}/api/billing/stripe-webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_wrong" }),
      },
      body: payload,
    });
    assert.equal(bad.status, 400);
    assert.equal(await isPro(userA), true);
  });
  await scenario("duplicate checkout by an active subscriber → real Customer Portal, no second subscription", async () => {
    const r = await call<{ url?: string; redirected_to_portal?: boolean }>(userA, "POST", "/api/billing/checkout", {
      billing_period: "annual",
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.redirected_to_portal, true);
    assert.ok(r.body.url?.startsWith("https://billing.stripe.com/"));
    const subs = await stripe.subscriptions.list({ customer: (await fetchSub(subA)).customer as string, status: "all" });
    assert.equal(subs.data.length, 1);
  });
  await scenario("Customer Portal opens for the subscriber's own customer", async () => {
    const r = await call<{ url?: string }>(userA, "POST", "/api/billing/portal");
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.url?.startsWith("https://billing.stripe.com/"));
    const stranger = await signIn("no-customer");
    assert.equal((await call(stranger, "POST", "/api/billing/portal")).status, 404);
  });
  await scenario("monthly renewal: second $4.99 invoice paid, period end advances", async () => {
    const before = (await row(userA))!.current_period_end!;
    await advance(clockA.id, 32);
    const sub = await fetchSub(subA);
    assert.equal(sub.status, "active");
    const invoices = await stripe.invoices.list({ subscription: subA, limit: 5 });
    assert.equal(invoices.data.filter((i) => i.status === "paid" && i.amount_paid === 499).length, 2);
    await syncSub(subA);
    const after = (await row(userA))!.current_period_end!;
    assert.ok(new Date(after) > new Date(before), `${after} > ${before}`);
    assert.equal(await isPro(userA), true);
  });
  await scenario("monthly → annual change: prorated, app records the annual price, still Pro", async () => {
    const sub = await fetchSub(subA);
    await stripe.subscriptions.update(subA, {
      items: [{ id: sub.items.data[0]!.id, price: annualPrice.id }],
      proration_behavior: "always_invoice",
    });
    const updated = await fetchSub(subA);
    assert.equal(updated.status, "active");
    const inv = updated.latest_invoice as Stripe.Invoice;
    assert.equal(inv.status, "paid");
    assert.ok(inv.amount_paid > 0 && inv.amount_paid < 3999, `prorated charge ${inv.amount_paid}`);
    await syncSub(subA);
    assert.equal((await row(userA))?.stripe_price_id, annualPrice.id);
    assert.equal(await isPro(userA), true);
    return `proration invoice $${(inv.amount_paid / 100).toFixed(2)}`;
  });
  await scenario("cancel at period end: Pro until the paid-through date, then Free at expiry", async () => {
    await stripe.subscriptions.update(subA, { cancel_at_period_end: true });
    await syncSub(subA);
    const r = await row(userA);
    assert.ok(r?.cancel_at_period_end === true || r?.cancel_at_period_end === 1);
    assert.equal(await isPro(userA), true);
    await advance(clockA.id, 367);
    const sub = await fetchSub(subA);
    assert.equal(sub.status, "canceled");
    await deliver("customer.subscription.deleted", sub);
    assert.equal(await isPro(userA), false);
    const stale = { ...sub, status: "active", cancel_at_period_end: false };
    await deliver("customer.subscription.updated", stale);
    assert.equal(await isPro(userA), false, "a late, stale 'active' event cannot resurrect Pro");
  });

  // Annual: activation → refund → immediate cancellation.
  const clockB = await newClock("annual");
  const userB = await signIn("annual");
  let subB = "";
  await scenario("new annual subscription: paid $39.99 → Pro", async () => {
    const cus = await clockedCustomer(userB, clockB.id, "pm_card_visa");
    const sub = await createSub(cus, annualPrice.id, userB);
    subB = sub.id;
    assert.equal((sub.latest_invoice as Stripe.Invoice).amount_paid, 3999);
    await syncSub(sub.id, "customer.subscription.created");
    assert.equal(await isPro(userB), true);
  });
  await scenario("refund alone does not cancel; refund + cancel now revokes Pro", async () => {
    const cus = (await fetchSub(subB)).customer as string;
    const charge = (await stripe.charges.list({ customer: cus, limit: 1 })).data[0]!;
    const refund = await stripe.refunds.create({ charge: charge.id });
    assert.equal(refund.status, "succeeded");
    await syncSub(subB);
    assert.equal((await fetchSub(subB)).status, "active");
    assert.equal(await isPro(userB), true, "Stripe keeps the subscription active after a refund");
    await stripe.subscriptions.cancel(subB);
    await deliver("customer.subscription.deleted", await fetchSub(subB));
    assert.equal(await isPro(userB), false);
  });

  // Failed first payment, later fixed.
  const clockC = await newClock("declined");
  const userC = await signIn("declined");
  await scenario("failed initial payment: incomplete, no Pro; paying the invoice later activates Pro", async () => {
    const cus = await clockedCustomer(userC, clockC.id, "pm_card_chargeCustomerFail");
    const sub = await createSub(cus, monthlyPrice.id, userC);
    assert.equal(sub.status, "incomplete");
    await syncSub(sub.id, "customer.subscription.created");
    assert.equal(await isPro(userC), false);
    const pm = await setDefaultCard(cus, "pm_card_visa");
    await stripe.invoices.pay((sub.latest_invoice as Stripe.Invoice).id!, { payment_method: pm });
    assert.equal((await fetchSub(sub.id)).status, "active");
    await syncSub(sub.id);
    assert.equal(await isPro(userC), true);
  });

  // 3-D Secure required, never completed.
  const clockD = await newClock("3ds");
  const userD = await signIn("3ds");
  await scenario("payment requiring authentication: incomplete → no Pro; expires after 23h → still no Pro", async () => {
    const cus = await clockedCustomer(userD, clockD.id, "pm_card_authenticationRequired");
    const sub = await createSub(cus, monthlyPrice.id, userD);
    assert.equal(sub.status, "incomplete");
    await syncSub(sub.id, "customer.subscription.created");
    assert.equal(await isPro(userD), false);
    await advance(clockD.id, 1.1);
    assert.equal((await fetchSub(sub.id)).status, "incomplete_expired");
    await syncSub(sub.id);
    assert.equal(await isPro(userD), false);
  });

  // Renewal fails, card updated, recovered; then account deletion.
  const clockE = await newClock("dunning");
  const userE = await signIn("dunning");
  let subE = "";
  await scenario("failed renewal: past_due keeps Pro during grace; new card + payment → active", async () => {
    const cus = await clockedCustomer(userE, clockE.id, "pm_card_visa");
    const sub = await createSub(cus, monthlyPrice.id, userE);
    subE = sub.id;
    await syncSub(sub.id, "customer.subscription.created");
    assert.equal(await isPro(userE), true);
    await setDefaultCard(cus, "pm_card_chargeCustomerFail");
    await advance(clockE.id, 32);
    const pastDue = await fetchSub(sub.id);
    assert.equal(pastDue.status, "past_due");
    await syncSub(sub.id);
    assert.equal((await row(userE))?.status, "past_due");
    assert.equal(await isPro(userE), true, "inside the 7-day grace window");
    const pm = await setDefaultCard(cus, "pm_card_visa");
    const open = (await stripe.invoices.list({ subscription: sub.id, status: "open", limit: 1 })).data[0]!;
    await stripe.invoices.pay(open.id!, { payment_method: pm });
    assert.equal((await fetchSub(sub.id)).status, "active");
    await syncSub(sub.id);
    assert.equal((await row(userE))?.status, "active");
    assert.equal(await isPro(userE), true);
  });
  await scenario("account deletion cancels the live Stripe subscription first", async () => {
    const result = await ensureStripeSubscriptionCancelledForDeletion(userE.userId);
    assert.deepEqual(result, { ok: true, action: "cancelled" });
    assert.equal((await fetchSub(subE)).status, "canceled");
  });

  await scenario("subscription on an unlinked customer naming a user in metadata never grants Pro", async () => {
    const victim = await signIn("victim");
    const clockF = await newClock("unlinked");
    const cus = await stripe.customers.create({
      test_clock: clockF.id,
      payment_method: "pm_card_visa",
      invoice_settings: { default_payment_method: "pm_card_visa" },
    });
    const sub = await createSub(cus.id, monthlyPrice.id, victim);
    assert.equal(sub.status, "active");
    await syncSub(sub.id, "customer.subscription.created");
    assert.equal(await isPro(victim), false);
  });
} finally {
  server.close();
  for (const id of clocks) await stripe.testHelpers.testClocks.del(id).catch(() => undefined);
  for (const id of looseCustomers) await stripe.customers.del(id).catch(() => undefined);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n[stripe-sandbox-lifecycle] ${results.length - failed.length}/${results.length} scenarios passed`);
process.exit(failed.length ? 1 : 0);
