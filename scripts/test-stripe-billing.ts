#!/usr/bin/env tsx
/**
 * Stripe billing test harness — Firehall Meals Pro (firefighter_plus).
 *
 * Rewritten for the current Postgres-backed async auth/billing store
 * (server/billing/store.ts, server/auth/auth-store.ts). The pre-migration
 * version of this script assumed synchronous SQLite storage and no longer
 * compiles/runs against reality — see git history for the old version.
 *
 * SAFETY MODEL (read before running):
 *   - Requires a DEDICATED `TEST_DATABASE_URL` env var. There is no fallback
 *     to `DATABASE_URL` — if `TEST_DATABASE_URL` is unset, the script exits
 *     1 immediately without touching any database.
 *   - If `TEST_DATABASE_URL` is byte-identical to whatever `DATABASE_URL`
 *     .env/the shell already has configured (the real app's database), the
 *     script refuses to run — that almost always means someone pointed the
 *     "test" var at the primary database by mistake.
 *   - Once validated, `process.env.DATABASE_URL` is OVERWRITTEN with
 *     `TEST_DATABASE_URL` for this process only, so every store call
 *     (server/db/pg-client.ts) talks exclusively to the test database.
 *   - All test rows are namespaced under a random per-run id and deleted in
 *     a `finally` block, including on failure.
 *   - Stripe Test Mode network calls (Tier 3 — scenarios A/D end-to-end)
 *     only run if STRIPE_SECRET_KEY is present AND starts with `sk_test_`.
 *     A live key (`sk_live_...`) is never used — that tier is skipped with
 *     a warning instead. No secret values are ever printed.
 *
 * Tiers:
 *   1  Pure/offline logic — price contract, status mapping, duplicate-
 *      checkout guard, Zod schemas. No DB, no network.
 *   1b Webhook signature verification (scenario H) — fully offline. Uses a
 *      locally-fabricated HMAC secret; never touches real Stripe.
 *   2  Postgres-backed store integration (scenarios B, C, D, E, F, G) —
 *      requires TEST_DATABASE_URL. Hall Pro (still SQLite) is bound to a
 *      throwaway temp file so resolveUserBilling() doesn't throw.
 *   3  Optional live Stripe Test Mode network calls (scenarios A, D) — only
 *      when real sk_test_ credentials are configured; otherwise skipped.
 *
 * Usage:
 *   $env:TEST_DATABASE_URL = "postgres://...disposable-test-db..."
 *   npm run test:stripe-billing
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { loadProjectEnv } from "../server/lib/load-project-env.js";
loadProjectEnv();

// ---------------------------------------------------------------------------
// SAFETY GATE — must run before any other import touches a database.
// ---------------------------------------------------------------------------
const ambientDatabaseUrl = process.env.DATABASE_URL?.trim() || "";
const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim() || "";

function maskConnectionString(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
  } catch {
    return "(unparseable connection string — not logging raw value)";
  }
}

if (!testDatabaseUrl) {
  console.error(
    "[test-stripe-billing] FAIL CLOSED: TEST_DATABASE_URL is not set.\n" +
      "  This harness never falls back to DATABASE_URL (the real app database).\n" +
      "  Set TEST_DATABASE_URL to a disposable/isolated test Postgres database and re-run, e.g.:\n" +
      '    $env:TEST_DATABASE_URL = "postgres://user:pass@host/fh_billing_test?sslmode=require"',
  );
  process.exit(1);
}

if (ambientDatabaseUrl && ambientDatabaseUrl === testDatabaseUrl) {
  console.error(
    "[test-stripe-billing] FAIL CLOSED: TEST_DATABASE_URL is identical to DATABASE_URL.\n" +
      "  That looks like the primary/production database, not a disposable test database.\n" +
      "  Point TEST_DATABASE_URL at a separate database and re-run.",
  );
  process.exit(1);
}

// From here on, every store call in this process talks ONLY to the explicit
// test database — never to whatever DATABASE_URL happened to be set to.
process.env.DATABASE_URL = testDatabaseUrl;

const rawStripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() || "";
const stripeTestModeConfigured = rawStripeSecretKey.startsWith("sk_test_");
if (rawStripeSecretKey && !stripeTestModeConfigured) {
  console.warn(
    "[test-stripe-billing] STRIPE_SECRET_KEY is set but is NOT a Test Mode key (sk_test_...). " +
      "Refusing to make any Stripe network calls with it — Tier 3 (live checkout/portal) will be skipped. " +
      "This harness never uses live Stripe keys.",
  );
  delete process.env.STRIPE_SECRET_KEY;
}

console.log("[test-stripe-billing] test database:", maskConnectionString(testDatabaseUrl));
console.log(
  "[test-stripe-billing] Stripe Test Mode credentials:",
  stripeTestModeConfigured ? "present (sk_test_...) — Tier 3 will run" : "absent — Tier 3 will be skipped",
);

// ---------------------------------------------------------------------------
// Remaining imports (safe — none of these read env vars at module load time,
// only inside functions called later in main()).
// ---------------------------------------------------------------------------
import Stripe from "stripe";

import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { closePgPool, getPgPool } from "../server/db/pg-client.js";
import { pgRun } from "../server/db/pg-sql.js";

import { initAuthStore, upsertEmailUser } from "../server/auth/auth-store.js";
import { bindHallMembershipDb } from "../server/hall-membership/store.js";
import {
  adminSetGlobalFlag,
  adminSetHallPlan,
  adminSetUserPlan,
  bindBillingDb,
  getBillingPublicConfig,
  getStripeCustomerIdForUser,
  getUserIdByStripeCustomerId,
  getUserIdByStripeSubscriptionId,
  hasWebhookEventBeenProcessed,
  linkStripeCustomer,
  markStripeSubscriptionCancelledBySubscriptionId,
  recordWebhookEvent,
  resolveUserBilling,
  selectUserPlan,
  upsertStripeSubscription,
  userHasStripeCustomer,
} from "../server/billing/store.js";
import {
  getVerifiedPriceIdForPeriod,
  mapStripeStatus,
  priceMatchesExpectedSpec,
  resetVerifiedPriceIdsForTests,
} from "../server/billing/stripe-client.js";
import { userAlreadyHasProAccess } from "../server/billing/checkout-guard.js";
import { adminSetGlobalFlagSchema, createCheckoutSessionSchema } from "../shared/billing/schema.js";
import { subscriptionGrantsAccess } from "../shared/billing/types.js";

// ---------------------------------------------------------------------------
// Reporting helpers
// ---------------------------------------------------------------------------
let passCount = 0;
let failCount = 0;
let skipCount = 0;

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function ok(msg: string): void {
  passCount++;
  console.log(`[ OK ] ${msg}`);
}

function skip(msg: string): void {
  skipCount++;
  console.log(`[SKIP] ${msg}`);
}

const RUN_ID = crypto.randomBytes(4).toString("hex");
const testEmail = (label: string) => `stripe-test-${RUN_ID}-${label}@test.invalid`;

// ---------------------------------------------------------------------------
// TIER 1 — pure/offline logic (no DB, no network)
// ---------------------------------------------------------------------------
function runPureLogicTests(): void {
  section("TIER 1: Pure offline logic (price contract, status mapping, duplicate guard, schemas)");

  assert.equal(subscriptionGrantsAccess("active"), true);
  assert.equal(subscriptionGrantsAccess("trialing"), true);
  assert.equal(subscriptionGrantsAccess("past_due"), true, "past_due is a grace period, not an immediate lockout");
  assert.equal(subscriptionGrantsAccess("cancelled"), false);
  ok("subscriptionGrantsAccess: active/trialing/past_due grant access, cancelled does not");

  assert.equal(mapStripeStatus("trialing"), "trialing");
  assert.equal(mapStripeStatus("active"), "active");
  assert.equal(mapStripeStatus("past_due"), "past_due");
  assert.equal(mapStripeStatus("incomplete"), "past_due");
  assert.equal(mapStripeStatus("unpaid"), "cancelled", "unpaid must NOT grant indefinite access");
  assert.equal(mapStripeStatus("canceled"), "cancelled");
  assert.equal(mapStripeStatus("incomplete_expired"), "cancelled");
  assert.equal(mapStripeStatus("paused"), "cancelled");
  ok("mapStripeStatus: Stripe statuses map onto internal SubscriptionStatus correctly");

  assert.equal(
    priceMatchesExpectedSpec(
      { unit_amount: 499, currency: "usd", recurring: { interval: "month", interval_count: 1 } },
      "monthly",
    ).ok,
    true,
  );
  assert.equal(
    priceMatchesExpectedSpec(
      { unit_amount: 3999, currency: "usd", recurring: { interval: "year", interval_count: 1 } },
      "annual",
    ).ok,
    true,
  );
  assert.equal(
    priceMatchesExpectedSpec(
      { unit_amount: 3999, currency: "usd", recurring: { interval: "year", interval_count: 1 } },
      "monthly",
    ).ok,
    false,
    "annual price id swapped into monthly slot must fail",
  );
  assert.equal(
    priceMatchesExpectedSpec(
      { unit_amount: 599, currency: "usd", recurring: { interval: "month", interval_count: 1 } },
      "monthly",
    ).ok,
    false,
    "wrong dollar amount must fail",
  );
  assert.equal(
    priceMatchesExpectedSpec({ unit_amount: 499, currency: "usd", recurring: null }, "monthly").ok,
    false,
    "a one-time (non-recurring) price must fail — Pro is subscription-only",
  );
  ok("priceMatchesExpectedSpec: catches wrong amount/currency/interval/swapped price ids");

  assert.equal(userAlreadyHasProAccess(null), false, "no subscription — checkout must be allowed");
  assert.equal(userAlreadyHasProAccess({ plan_id: "personal", status: "active" }), false);
  assert.equal(
    userAlreadyHasProAccess({ plan_id: "firefighter_plus", status: "active" }),
    true,
    "already-active Pro must be BLOCKED from a duplicate checkout",
  );
  assert.equal(
    userAlreadyHasProAccess({ plan_id: "firefighter_plus", status: "past_due" }),
    true,
    "past_due Pro (mid-retry, still entitled) must also be BLOCKED — routed to Manage Billing instead",
  );
  assert.equal(
    userAlreadyHasProAccess({ plan_id: "firefighter_plus", status: "cancelled" }),
    false,
    "fully lapsed Pro — resubscribing must be allowed",
  );
  ok("userAlreadyHasProAccess: duplicate-checkout guard is correct for every status");

  assert.equal(createCheckoutSessionSchema.safeParse({ billing_period: "personal" }).success, false);
  assert.equal(createCheckoutSessionSchema.safeParse({ billing_period: "monthly" }).success, true);
  assert.equal(createCheckoutSessionSchema.safeParse({ billing_period: "annual" }).success, true);
  assert.equal(adminSetGlobalFlagSchema.safeParse({ enabled: true }).success, true);
  assert.equal(adminSetGlobalFlagSchema.safeParse({ enabled: "true" }).success, false);
  ok("Zod request schemas accept/reject the right shapes");
}

// ---------------------------------------------------------------------------
// TIER 1b — webhook signature verification (scenario H), fully offline.
// stripe.webhooks.constructEvent() is local HMAC verification — it makes no
// network call regardless of what "secret key" the Stripe client was built
// with, so this exercises the EXACT call server/billing/routes.ts makes
// without touching real Stripe or requiring real credentials.
// ---------------------------------------------------------------------------
function signStripeTestPayload(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const signedPayload = `${timestamp}.${payload}`;
  const v1 = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

function runWebhookSignatureTests(): void {
  section("TIER 1b: [H] Invalid webhook signature — rejected safely (fully offline)");

  const stripe = new Stripe("sk_test_offline_signature_check_only_no_network_call", {
    apiVersion: "2026-08-26.dahlia",
  });
  const dummySecret = `whsec_offline_${RUN_ID}`;
  const payload = JSON.stringify({
    id: `evt_test_sig_${RUN_ID}`,
    object: "event",
    type: "checkout.session.completed",
    data: { object: {} },
  });

  const validHeader = signStripeTestPayload(payload, dummySecret);
  const event = stripe.webhooks.constructEvent(payload, validHeader, dummySecret);
  assert.equal(event.id, `evt_test_sig_${RUN_ID}`, "a correctly-signed payload must verify and parse");
  ok("valid Stripe-Signature header is accepted by stripe.webhooks.constructEvent");

  const tamperedHeader = validHeader.replace(/v1=[0-9a-f]/, (m) => `v1=${m.endsWith("0") ? "1" : "0"}`);
  assert.throws(
    () => stripe.webhooks.constructEvent(payload, tamperedHeader, dummySecret),
    "a tampered signature must be rejected",
  );
  ok("[H] tampered signature is REJECTED (matches routes.ts returning 400 Invalid signature)");

  const wrongSecretHeader = signStripeTestPayload(payload, `whsec_wrong_${RUN_ID}`);
  assert.throws(
    () => stripe.webhooks.constructEvent(payload, wrongSecretHeader, dummySecret),
    "a payload signed with the wrong secret must be rejected",
  );
  ok("[H] signature computed with the wrong webhook secret is REJECTED");

  const tamperedPayload = payload.replace("checkout.session.completed", "checkout.session.hacked");
  assert.throws(
    () => stripe.webhooks.constructEvent(tamperedPayload, validHeader, dummySecret),
    "a tampered payload body must invalidate the original signature",
  );
  ok("[H] tampered payload body invalidates the original signature");
}

function readSqliteMigration(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), "server", "db", "migrations", name), "utf8");
}

function readPgMigration(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), "server", "db", "pg-migrations", name), "utf8");
}

// ---------------------------------------------------------------------------
// TIER 2 — Postgres-backed store integration (scenarios B, C, D, E, F, G)
// ---------------------------------------------------------------------------
async function runStoreIntegrationTests(): Promise<void> {
  section("TIER 2: Postgres-backed store integration (scenarios B, C, D, E, F, G)");

  // Idempotent — safe to run against an already-migrated test database too
  // (CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING throughout).
  // NOTE: goes through the raw pool directly (no values array) so Postgres's
  // simple query protocol is used — required because this file contains
  // multiple ;-separated statements, which the parameterized/prepared path
  // pgRun() normally uses does not support.
  await getPgPool().query(readPgMigration("0001_init.sql"));
  ok("applied server/db/pg-migrations/0001_init.sql to the test database (idempotent)");

  // Hall Pro (hall_subscriptions/hall_memberships) intentionally stays on
  // SQLite — bind an isolated throwaway temp file so resolveUserBilling()'s
  // hall lookups don't throw. This never touches any real hall data; the
  // Postgres test database above is the only store actually under test here.
  const tmpDbPath = path.join(os.tmpdir(), `fh-stripe-billing-test-${RUN_ID}.db`);
  const hallDb = await openSqliteDatabase(tmpDbPath);
  hallDb.exec(readSqliteMigration("014_user_accounts.sql"));
  hallDb.exec(readSqliteMigration("015_hall_membership.sql"));
  hallDb.exec(readSqliteMigration("016_billing.sql"));
  bindHallMembershipDb(hallDb);
  // NOTE: deliberately NOT calling initBillingStore() here — it calls
  // getSharedLocalDb() as a side effect, which would open/create the real
  // local dev SQLite cache (data/cache.db). bindBillingDb() below rebinds
  // the module's hall-pro SQLite handle to our isolated temp file directly
  // and seeds plan_feature_flags against the (already-verified) TEST
  // Postgres pool — everything this harness needs, with zero local-file
  // side effects outside the temp db created above.
  bindBillingDb(hallDb);

  await initAuthStore(); // verifyPgConnection() against the TEST database only
  resetVerifiedPriceIdsForTests();

  const createdUserIds: string[] = [];
  const createdWebhookEventIds: string[] = [];

  try {
    // --- Fresh user: linkStripeCustomer alone must not grant Pro ---------
    const { user } = await upsertEmailUser(testEmail("checkout"));
    createdUserIds.push(user.user_id);
    const customerId = `cus_test_${RUN_ID}`;
    await linkStripeCustomer(user.user_id, customerId);
    const afterLink = await resolveUserBilling(user.user_id);
    assert.equal(afterLink.effective_plan_id, "personal", "linking a Stripe customer alone must not grant Pro");
    assert.equal(await userHasStripeCustomer(user.user_id), true);
    assert.equal(await getStripeCustomerIdForUser(user.user_id), customerId);
    assert.equal(await getUserIdByStripeCustomerId(customerId), user.user_id);
    assert.equal(afterLink.manage_billing_available, false, "no active Stripe subscription yet — no portal link");
    await assert.doesNotReject(() => linkStripeCustomer(user.user_id, customerId), "re-linking the same customer id (retried checkout) must not throw");
    ok("[A setup] free user + linked Stripe customer, no Pro access yet");

    // --- [B] checkout.session.completed equivalent -----------------------
    section("[B] Checkout success webhook — subscription associated with correct user, user becomes Pro");
    const subscriptionId = `sub_test_${RUN_ID}`;
    const trialing = await upsertStripeSubscription({
      userId: user.user_id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: "price_test_monthly",
      status: "trialing",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    });
    assert.equal(trialing.effective_plan_id, "firefighter_plus");
    assert.equal(trialing.subscription?.source, "stripe");
    assert.equal(trialing.subscription?.status, "trialing");
    assert.equal(await getUserIdByStripeSubscriptionId(subscriptionId), user.user_id);
    assert.equal(trialing.manage_billing_available, true, "an active Stripe subscription must show the portal link");
    assert.equal(trialing.features.advanced_search, true);
    assert.equal(trialing.features.nutrition, true);
    ok("[B] webhook-equivalent write correctly attaches the subscription and grants Pro features");

    // --- [C] Reload billing state — Pro persists from database -----------
    section("[C] Reload billing state — Pro persists from database");
    const reloaded = await resolveUserBilling(user.user_id);
    assert.equal(reloaded.effective_plan_id, "firefighter_plus", "Pro must persist across a fresh resolveUserBilling() call (simulated app reload)");
    assert.equal(reloaded.subscription?.status, "trialing", "the exact status written by the webhook must come back unchanged");
    assert.equal(reloaded.subscription?.current_period_end, "2027-01-01T00:00:00.000Z", "current_period_end must round-trip through the database");
    ok("[C] Pro persists from the database on a fresh reload");

    // --- [D] Existing Pro user starts checkout again ----------------------
    section("[D] Existing Pro user starts checkout — must redirect to Customer Portal, no duplicate subscription");
    assert.equal(
      userAlreadyHasProAccess(reloaded.subscription),
      true,
      "the exact guard /api/billing/checkout calls must now block a second checkout",
    );
    assert.equal(
      reloaded.manage_billing_available,
      true,
      "manage_billing_available drives the portal-redirect branch in routes.ts (not the hard 409)",
    );
    ok("[D] duplicate-checkout guard + portal eligibility are both correctly true post-subscribe");

    // --- [E] customer.subscription.updated: active -> past_due, then ------
    //         cancel_at_period_end scheduled (still entitled either way) ---
    section("[E] Subscription updated / cancel_at_period_end — DB reflects real Stripe state, entitlement stays correct");
    const active = await upsertStripeSubscription({
      userId: user.user_id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: "price_test_monthly",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-02-01T00:00:00.000Z",
    });
    assert.equal(active.subscription?.status, "active");

    const pastDue = await upsertStripeSubscription({
      userId: user.user_id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: "price_test_monthly",
      status: "past_due",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-02-01T00:00:00.000Z",
    });
    assert.equal(pastDue.effective_plan_id, "firefighter_plus", "past_due must not immediately downgrade the user");
    assert.equal(pastDue.features.advanced_search, true);

    const cancelScheduled = await upsertStripeSubscription({
      userId: user.user_id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: "price_test_monthly",
      status: "active",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2027-02-01T00:00:00.000Z",
    });
    assert.equal(cancelScheduled.subscription?.cancel_at_period_end, true);
    assert.equal(cancelScheduled.effective_plan_id, "firefighter_plus", "cancel_at_period_end alone must not revoke access early");
    ok("[E] past_due keeps access (grace period); cancel_at_period_end keeps access until the period actually ends");

    // --- [F] customer.subscription.deleted ---------------------------------
    section("[F] Subscription deleted — Pro access removed per existing entitlement logic");
    const cancelled = await markStripeSubscriptionCancelledBySubscriptionId(subscriptionId);
    assert.ok(cancelled);
    assert.equal(cancelled!.effective_plan_id, "personal", "a deleted Stripe subscription must fall back to free");
    assert.equal(cancelled!.subscription?.status, "cancelled");
    assert.equal(cancelled!.features.advanced_search, false);
    assert.equal(cancelled!.manage_billing_available, true, "Stripe customer id stays on file — Manage Billing remains available");
    assert.equal(
      await markStripeSubscriptionCancelledBySubscriptionId("sub_does_not_exist"),
      null,
      "unknown subscription id (webhook safety net) must not throw",
    );
    ok("[F] hard cancellation immediately revokes Pro access; customer id is preserved for Manage Billing");

    // --- [G] Duplicate webhook delivery ------------------------------------
    section("[G] Duplicate webhook delivery — idempotent, no duplicate records/state changes");
    const eventId = `evt_test_${RUN_ID}_checkout_completed`;
    createdWebhookEventIds.push(eventId);
    assert.equal(await hasWebhookEventBeenProcessed(eventId), false);
    await recordWebhookEvent(eventId, "checkout.session.completed");
    assert.equal(await hasWebhookEventBeenProcessed(eventId), true);
    await assert.doesNotReject(
      () => recordWebhookEvent(eventId, "checkout.session.completed"),
      "recording the same event id twice (Stripe redelivery) must not throw",
    );
    // Re-applying the identical subscription-updated payload twice must not
    // create a second row (user_subscriptions PK is user_id) or change state.
    const beforeRedelivery = await resolveUserBilling(user.user_id);
    await upsertStripeSubscription({
      userId: user.user_id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: "price_test_monthly",
      status: "cancelled",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });
    const afterRedelivery = await resolveUserBilling(user.user_id);
    assert.equal(afterRedelivery.effective_plan_id, beforeRedelivery.effective_plan_id, "redelivering the same terminal state must not change entitlement");
    ok("[G] webhook event ids are deduped; redelivering identical state is a safe no-op");

    // --- Admin-granted Pro regression (existing entitlement path) --------
    const { user: adminGrantedUser } = await upsertEmailUser(testEmail("admin-granted"));
    createdUserIds.push(adminGrantedUser.user_id);
    await adminSetUserPlan(adminGrantedUser.user_id, "firefighter_plus");
    const adminGranted = await resolveUserBilling(adminGrantedUser.user_id);
    assert.equal(adminGranted.effective_plan_id, "firefighter_plus");
    assert.equal(adminGranted.subscription?.source, "admin_grant");
    assert.equal(adminGranted.manage_billing_available, false, "admin grants have no Stripe customer — no portal link");
    assert.equal(
      userAlreadyHasProAccess(adminGranted.subscription),
      true,
      "an admin-granted Pro user must also be blocked from a redundant paid checkout",
    );
    ok("admin-granted Pro is unaffected by the Stripe-sourced entitlement path (regression check)");

    // --- Self-service plan selection is still restricted to the free plan -
    assert.equal(await selectUserPlan(adminGrantedUser.user_id, "firefighter_plus"), null, "real money only ever flows through Stripe checkout, never this endpoint");
    ok("selectUserPlan() cannot self-grant firefighter_plus");

    // --- Hall Pro untouched by any of the above ---------------------------
    const { user: hallUser } = await upsertEmailUser(testEmail("hall-owner"));
    createdUserIds.push(hallUser.user_id);
    const hallId = `hall-test-${RUN_ID}`;
    hallDb
      .prepare(`INSERT INTO halls (hall_id, name, created_by_user_id) VALUES (?, ?, ?)`)
      .run(hallId, "Test Hall", hallUser.user_id);
    const hallSub = adminSetHallPlan(hallId, "active", hallUser.user_id);
    assert.equal(hallSub.status, "active");
    assert.equal(hallSub.plan_id, "hall_pro");
    ok("Hall Pro (still SQLite) is untouched by the Stripe/Postgres personal-plan paths");

    // --- Admin global-flag kill switch (payments_enabled) -----------------
    const configBefore = await getBillingPublicConfig();
    const flagged = await adminSetGlobalFlag("payments_enabled", true);
    assert.ok(flagged);
    assert.equal(flagged!.enabled, true);
    assert.equal((await getBillingPublicConfig()).payments_enabled, true);
    // Restore whatever the flag was before this run touched it.
    await adminSetGlobalFlag("payments_enabled", configBefore.payments_enabled);
    assert.equal((await getBillingPublicConfig()).payments_enabled, configBefore.payments_enabled);
    assert.equal(await adminSetGlobalFlag("not_a_real_flag", true), null, "unknown flag keys must be rejected, not silently created");
    ok("admin payments_enabled kill switch flips correctly and is restored to its prior value");
  } finally {
    // --- Cleanup: delete only rows this run created -----------------------
    for (const uid of createdUserIds) {
      try {
        await pgRun(`DELETE FROM users WHERE user_id = $1`, [uid]);
      } catch (err) {
        console.warn(`[test-stripe-billing] cleanup warning: failed to delete test user ${uid}:`, err);
      }
    }
    for (const eid of createdWebhookEventIds) {
      try {
        await pgRun(`DELETE FROM stripe_webhook_events WHERE event_id = $1`, [eid]);
      } catch (err) {
        console.warn(`[test-stripe-billing] cleanup warning: failed to delete webhook event ${eid}:`, err);
      }
    }
    try {
      fs.unlinkSync(tmpDbPath);
    } catch {
      /* ignore */
    }
    releaseSqliteTimersForTests();
    if (createdUserIds.length > 0 || createdWebhookEventIds.length > 0) {
      console.log(
        `[test-stripe-billing] cleaned up ${createdUserIds.length} test user(s) and ${createdWebhookEventIds.length} webhook event record(s) from the test database`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// TIER 3 — optional live Stripe Test Mode network calls (scenarios A, D)
// ---------------------------------------------------------------------------
async function runLiveStripeTests(): Promise<void> {
  section("TIER 3: Live Stripe Test Mode network calls (scenarios A, D end-to-end)");

  if (!stripeTestModeConfigured) {
    skip("STRIPE_SECRET_KEY (sk_test_...) not configured — skipping live Checkout/Portal session creation. See MANUAL TEST STEPS to verify this by hand.");
    return;
  }
  const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY?.trim();
  if (!monthlyPriceId) {
    skip("STRIPE_PRICE_ID_MONTHLY not configured — skipping live Checkout session creation.");
    return;
  }

  const stripe = new Stripe(rawStripeSecretKey, { apiVersion: "2026-08-26.dahlia" });
  let customerId: string | null = null;
  let checkoutSessionId: string | null = null;

  try {
    const customer = await stripe.customers.create({
      email: testEmail("live-stripe").replace("@test.invalid", "@example.com"),
      metadata: { test_run: RUN_ID, purpose: "test-stripe-billing.ts harness — safe to delete" },
    });
    customerId = customer.id;
    ok("created a throwaway Stripe Test Mode customer");

    // --- [A] Free user starts Pro checkout — valid hosted Checkout URL ---
    const verifiedPriceId = await getVerifiedPriceIdForPeriod("monthly");
    assert.equal(verifiedPriceId, monthlyPriceId, "verified price id must match the configured monthly price");
    ok("[A] STRIPE_PRICE_ID_MONTHLY matches the expected $4.99/mo product contract (live Stripe cross-check)");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: `test-${RUN_ID}`,
      line_items: [{ price: verifiedPriceId, quantity: 1 }],
      subscription_data: { metadata: { user_id: `test-${RUN_ID}` } },
      metadata: { user_id: `test-${RUN_ID}`, billing_period: "monthly", test_run: RUN_ID },
      success_url: "https://example.invalid/plans?checkout=success",
      cancel_url: "https://example.invalid/plans?checkout=cancelled",
      allow_promotion_codes: true,
    });
    checkoutSessionId = session.id;
    assert.ok(session.url?.startsWith("https://checkout.stripe.com/"), "Checkout session must return a hosted checkout.stripe.com URL");
    ok("[A] valid hosted Checkout URL returned from Stripe Test Mode — " + session.url!.slice(0, 40) + "…");

    // --- [D] Portal session creation (same call the duplicate-checkout ---
    //         redirect path and /api/billing/portal both make) -----------
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: "https://example.invalid/account",
      });
      assert.ok(portalSession.url?.startsWith("https://billing.stripe.com/"), "Portal session must return a hosted billing.stripe.com URL");
      ok("[D] Customer Portal session created successfully against Stripe Test Mode");
    } catch (err) {
      skip(
        "Customer Portal session creation failed — this is usually a Stripe Dashboard setup step (Test Mode portal " +
          "configuration), not a code bug. Configure it at https://dashboard.stripe.com/test/settings/billing/portal " +
          `and re-run. Raw error: ${err instanceof Error ? err.message : err}`,
      );
    }
  } finally {
    if (checkoutSessionId) {
      try {
        await stripe.checkout.sessions.expire(checkoutSessionId);
      } catch {
        /* best-effort — session may already be expired/completed */
      }
    }
    if (customerId) {
      try {
        await stripe.customers.del(customerId);
        console.log(`[test-stripe-billing] cleaned up throwaway Stripe Test Mode customer ${customerId}`);
      } catch (err) {
        console.warn(`[test-stripe-billing] cleanup warning: failed to delete Stripe test customer ${customerId}:`, err);
      }
    }
  }
}

// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  runPureLogicTests();
  runWebhookSignatureTests();
  await runStoreIntegrationTests();
  await runLiveStripeTests();

  console.log("\n----------------------------------------");
  console.log(`[test-stripe-billing] ${passCount} passed, ${skipCount} skipped, ${failCount} failed.`);
  console.log(failCount === 0 ? "Result: PASS" : "Result: FAIL");
  process.exitCode = failCount === 0 ? 0 : 1;
}

main()
  .catch((err) => {
    const detail = err instanceof Error ? err.stack || err.message || String(err) : String(err);
    console.error("[test-stripe-billing] FAILED:", detail);
    process.exitCode = 1;
  })
  .finally(() => {
    void closePgPool();
  });
