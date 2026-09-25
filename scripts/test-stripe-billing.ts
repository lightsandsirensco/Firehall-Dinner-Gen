#!/usr/bin/env tsx

/**
 * Validates the Stripe billing plumbing for Firehall Meals Pro (firefighter_plus):
 * migration 045 (rebuild + data preservation), store read/write paths used by
 * the checkout/portal/webhook routes, status mapping, entitlement fallback
 * (subscriptionGrantsAccess), webhook idempotency, and the admin global-flag
 * kill switch. No network calls and no real Stripe keys are used — this
 * exercises the store/mapping logic the HTTP routes call into, the same way
 * scripts/test-billing.ts validates the pre-existing plan/feature store.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb, upsertEmailUser } from "../server/auth/auth-store.js";
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
import { mapStripeStatus, priceMatchesExpectedSpec } from "../server/billing/stripe-client.js";
import { userAlreadyHasProAccess } from "../server/billing/checkout-guard.js";
import {
  adminSetGlobalFlagSchema,
  createCheckoutSessionSchema,
} from "../shared/billing/schema.js";
import { subscriptionGrantsAccess } from "../shared/billing/types.js";

function readMigration(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), "server", "db", "migrations", name), "utf8");
}

const MIGRATION_014 = readMigration("014_user_accounts.sql");
const MIGRATION_015 = readMigration("015_hall_membership.sql");
const MIGRATION_016 = readMigration("016_billing.sql");
const MIGRATION_042 = readMigration("042_firefighter_plus_plan.sql");
const MIGRATION_046 = readMigration("046_stripe_billing.sql");

const tmpDb = path.join(os.tmpdir(), `fh-stripe-billing-validate-${Date.now()}.db`);

async function main(): Promise<void> {
  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_014);
  db.exec(MIGRATION_015);
  db.exec(MIGRATION_016);
  db.exec(MIGRATION_042);

  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);

  const { user: proseUser } = upsertEmailUser("pre-migration@test.firehall");
  // Pre-045 row, written the "old" way (admin grant, no Stripe columns) —
  // proves migration 045's table rebuild preserves existing subscriptions.
  adminSetUserPlan(proseUser.user_id, "firefighter_plus", "active");
  const beforeMigration = resolveUserBilling(proseUser.user_id);
  assert.equal(beforeMigration.effective_plan_id, "firefighter_plus");

  // --- Apply migration 045 ---
  db.exec(MIGRATION_046);

  const afterMigration = resolveUserBilling(proseUser.user_id);
  assert.equal(afterMigration.effective_plan_id, "firefighter_plus", "pre-045 admin grant must survive the rebuild");
  assert.equal(afterMigration.subscription?.source, "admin_grant");
  assert.equal(afterMigration.manage_billing_available, false, "admin grants never show a Stripe portal link");

  // --- CHECK constraints widened correctly ---
  assert.throws(() => {
    db.prepare(
      `UPDATE user_subscriptions SET status = 'bogus_status' WHERE user_id = ?`,
    ).run(proseUser.user_id);
  }, /CHECK constraint failed/, "status CHECK must still reject unknown values");

  assert.throws(() => {
    db.prepare(
      `UPDATE user_subscriptions SET source = 'bogus_source' WHERE user_id = ?`,
    ).run(proseUser.user_id);
  }, /CHECK constraint failed/, "source CHECK must still reject unknown values");

  db.prepare(`UPDATE user_subscriptions SET status = 'past_due' WHERE user_id = ?`).run(proseUser.user_id);
  assert.doesNotThrow(() => {
    db.prepare(`UPDATE user_subscriptions SET source = 'stripe' WHERE user_id = ?`).run(proseUser.user_id);
  }, "'past_due' status and 'stripe' source must now be valid");
  // Restore for the rest of the suite.
  db.prepare(`UPDATE user_subscriptions SET status = 'active', source = 'admin_grant' WHERE user_id = ?`).run(
    proseUser.user_id,
  );

  // --- subscriptionGrantsAccess ---
  assert.equal(subscriptionGrantsAccess("active"), true);
  assert.equal(subscriptionGrantsAccess("trialing"), true);
  assert.equal(subscriptionGrantsAccess("past_due"), true, "past_due is a grace period, not an immediate lockout");
  assert.equal(subscriptionGrantsAccess("cancelled"), false);

  // --- mapStripeStatus ---
  assert.equal(mapStripeStatus("trialing"), "trialing");
  assert.equal(mapStripeStatus("active"), "active");
  assert.equal(mapStripeStatus("past_due"), "past_due", "past_due = active retry window, still entitled");
  // "unpaid" is Stripe's TERMINAL dunning-exhausted state (no further Stripe
  // retries will occur) when the account's failed-payment setting is "mark
  // unpaid" rather than "cancel" — mapping it to past_due would let Pro
  // access continue indefinitely with no event ever arriving to revoke it
  // (Stripe QA test-mode integration finding — see stripe-client.ts).
  assert.equal(mapStripeStatus("unpaid"), "cancelled", "unpaid must NOT grant indefinite access");
  assert.equal(mapStripeStatus("incomplete"), "past_due");
  assert.equal(mapStripeStatus("canceled"), "cancelled");
  assert.equal(mapStripeStatus("incomplete_expired"), "cancelled");
  assert.equal(mapStripeStatus("paused"), "cancelled");
  assert.equal(subscriptionGrantsAccess(mapStripeStatus("unpaid")), false);

  // --- priceMatchesExpectedSpec (price-contract cross-check) ---
  assert.equal(
    priceMatchesExpectedSpec(
      { unit_amount: 499, currency: "usd", recurring: { interval: "month", interval_count: 1 } },
      "monthly",
    ).ok,
    true,
    "correct monthly price ($4.99/mo) must pass",
  );
  assert.equal(
    priceMatchesExpectedSpec(
      { unit_amount: 3999, currency: "usd", recurring: { interval: "year", interval_count: 1 } },
      "annual",
    ).ok,
    true,
    "correct annual price ($39.99/yr) must pass",
  );
  assert.equal(
    priceMatchesExpectedSpec(
      { unit_amount: 3999, currency: "usd", recurring: { interval: "year", interval_count: 1 } },
      "monthly",
    ).ok,
    false,
    "annual price id accidentally configured as monthly must fail (catches an env-var swap)",
  );
  assert.equal(
    priceMatchesExpectedSpec(
      { unit_amount: 499, currency: "usd", recurring: { interval: "month", interval_count: 1 } },
      "annual",
    ).ok,
    false,
    "monthly price id accidentally configured as annual must fail (catches an env-var swap)",
  );
  assert.equal(
    priceMatchesExpectedSpec(
      { unit_amount: 599, currency: "usd", recurring: { interval: "month", interval_count: 1 } },
      "monthly",
    ).ok,
    false,
    "wrong dollar amount must fail even with the right interval",
  );
  assert.equal(
    priceMatchesExpectedSpec(
      { unit_amount: 499, currency: "cad", recurring: { interval: "month", interval_count: 1 } },
      "monthly",
    ).ok,
    false,
    "wrong currency must fail",
  );
  assert.equal(
    priceMatchesExpectedSpec({ unit_amount: 499, currency: "usd", recurring: null }, "monthly").ok,
    false,
    "a one-time (non-recurring) price must fail — Pro is subscription-only",
  );

  // --- userAlreadyHasProAccess (duplicate-subscription checkout guard) ---
  assert.equal(userAlreadyHasProAccess(null), false, "no subscription at all — checkout must be allowed");
  assert.equal(
    userAlreadyHasProAccess({ plan_id: "personal", status: "active" }),
    false,
    "free/personal plan — checkout must be allowed",
  );
  assert.equal(
    userAlreadyHasProAccess({ plan_id: "firefighter_plus", status: "active" }),
    true,
    "already-active Pro (any source) — checkout must be BLOCKED",
  );
  assert.equal(
    userAlreadyHasProAccess({ plan_id: "firefighter_plus", status: "trialing" }),
    true,
    "already-trialing Pro — checkout must be BLOCKED",
  );
  assert.equal(
    userAlreadyHasProAccess({ plan_id: "firefighter_plus", status: "past_due" }),
    true,
    "past_due Pro (still entitled, mid-retry) — checkout must be BLOCKED, should use Manage Billing instead",
  );
  assert.equal(
    userAlreadyHasProAccess({ plan_id: "firefighter_plus", status: "cancelled" }),
    false,
    "fully lapsed/cancelled Pro — resubscribing via checkout must be allowed",
  );

  // --- Fresh user: linkStripeCustomer must not grant any paid plan ---
  const { user } = upsertEmailUser("stripe-checkout@test.firehall");
  linkStripeCustomer(user.user_id, "cus_test_123");
  const afterLink = resolveUserBilling(user.user_id);
  assert.equal(afterLink.effective_plan_id, "personal", "linking a Stripe customer alone must not grant Pro");
  assert.equal(userHasStripeCustomer(user.user_id), true);
  assert.equal(getStripeCustomerIdForUser(user.user_id), "cus_test_123");
  assert.equal(getUserIdByStripeCustomerId("cus_test_123"), user.user_id);
  assert.equal(afterLink.manage_billing_available, false, "no active Stripe subscription yet — no portal link");

  // Re-linking the same customer (checkout retried) must not throw (upsert, not insert).
  assert.doesNotThrow(() => linkStripeCustomer(user.user_id, "cus_test_123"));

  // --- checkout.session.completed equivalent: upsertStripeSubscription ---
  const trialing = upsertStripeSubscription({
    userId: user.user_id,
    stripeCustomerId: "cus_test_123",
    stripeSubscriptionId: "sub_test_abc",
    stripePriceId: "price_test_monthly",
    status: "trialing",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: "2027-01-01T00:00:00.000Z",
  });
  assert.equal(trialing.effective_plan_id, "firefighter_plus");
  assert.equal(trialing.subscription?.source, "stripe");
  assert.equal(trialing.subscription?.status, "trialing");
  assert.equal(trialing.subscription?.current_period_end, "2027-01-01T00:00:00.000Z");
  assert.equal(trialing.manage_billing_available, true, "an active Stripe subscription must show the portal link");
  assert.equal(getUserIdByStripeSubscriptionId("sub_test_abc"), user.user_id);
  // Pro feature entitlement flows through exactly like an admin grant.
  assert.equal(trialing.features.advanced_search, true);
  assert.equal(trialing.features.nutrition, true);

  // --- customer.subscription.updated: trial converts to active ---
  const active = upsertStripeSubscription({
    userId: user.user_id,
    stripeCustomerId: "cus_test_123",
    stripeSubscriptionId: "sub_test_abc",
    stripePriceId: "price_test_monthly",
    status: "active",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: "2027-02-01T00:00:00.000Z",
  });
  assert.equal(active.effective_plan_id, "firefighter_plus");
  assert.equal(active.subscription?.status, "active");

  // --- Payment failure: past_due keeps access (grace period), not a lockout ---
  const pastDue = upsertStripeSubscription({
    userId: user.user_id,
    stripeCustomerId: "cus_test_123",
    stripeSubscriptionId: "sub_test_abc",
    stripePriceId: "price_test_monthly",
    status: "past_due",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: "2027-02-01T00:00:00.000Z",
  });
  assert.equal(pastDue.effective_plan_id, "firefighter_plus", "past_due must not immediately downgrade the user");
  assert.equal(pastDue.features.advanced_search, true);

  // --- Cancel at period end (still entitled until the period actually ends) ---
  const cancelScheduled = upsertStripeSubscription({
    userId: user.user_id,
    stripeCustomerId: "cus_test_123",
    stripeSubscriptionId: "sub_test_abc",
    stripePriceId: "price_test_monthly",
    status: "active",
    cancelAtPeriodEnd: true,
    currentPeriodEnd: "2027-02-01T00:00:00.000Z",
  });
  assert.equal(cancelScheduled.subscription?.cancel_at_period_end, true);
  assert.equal(cancelScheduled.effective_plan_id, "firefighter_plus");

  // --- customer.subscription.deleted: hard cancellation downgrades immediately ---
  const cancelled = markStripeSubscriptionCancelledBySubscriptionId("sub_test_abc");
  assert.ok(cancelled);
  assert.equal(cancelled!.effective_plan_id, "personal", "a deleted Stripe subscription must fall back to free");
  assert.equal(cancelled!.subscription?.status, "cancelled");
  assert.equal(cancelled!.features.advanced_search, false);
  // A cancelled subscription still keeps its Stripe customer id on file, so
  // "Manage billing" remains available (view invoices / resubscribe) even
  // though the plan itself has fallen back to free.
  assert.equal(cancelled!.manage_billing_available, true);

  // Unknown subscription id — webhook safety net, must not throw.
  assert.equal(markStripeSubscriptionCancelledBySubscriptionId("sub_does_not_exist"), null);

  // --- Webhook idempotency ---
  assert.equal(hasWebhookEventBeenProcessed("evt_test_1"), false);
  recordWebhookEvent("evt_test_1", "checkout.session.completed");
  assert.equal(hasWebhookEventBeenProcessed("evt_test_1"), true);
  // Recording the same event id twice (Stripe redelivery) must not throw.
  assert.doesNotThrow(() => recordWebhookEvent("evt_test_1", "checkout.session.completed"));

  // --- Admin-granted Pro users remain unaffected (regression: existing entitlement path) ---
  const { user: adminGrantedUser } = upsertEmailUser("admin-granted@test.firehall");
  adminSetUserPlan(adminGrantedUser.user_id, "firefighter_plus");
  const adminGranted = resolveUserBilling(adminGrantedUser.user_id);
  assert.equal(adminGranted.effective_plan_id, "firefighter_plus");
  assert.equal(adminGranted.subscription?.source, "admin_grant");
  assert.equal(adminGranted.manage_billing_available, false, "admin grants have no Stripe customer — no portal link");
  assert.equal(
    userAlreadyHasProAccess(adminGranted.subscription),
    true,
    "an admin-granted Pro user must also be blocked from starting a redundant paid checkout",
  );

  // --- Self-service plan selection is still restricted to the free plan ---
  // (real money only ever flows through Stripe checkout, never this endpoint).
  assert.equal(selectUserPlan(adminGrantedUser.user_id, "firefighter_plus"), null);
  assert.equal(createCheckoutSessionSchema.safeParse({ billing_period: "personal" }).success, false);
  assert.equal(createCheckoutSessionSchema.safeParse({ billing_period: "monthly" }).success, true);
  assert.equal(createCheckoutSessionSchema.safeParse({ billing_period: "annual" }).success, true);
  assert.equal(
    createCheckoutSessionSchema.safeParse({ billing_period: "monthly", feature: "nutrition_targets" }).success,
    true,
  );

  // --- Hall Pro untouched by the Stripe migration/columns ---
  const { user: hallUser } = upsertEmailUser("hall-owner@test.firehall");
  db.prepare(`INSERT INTO halls (hall_id, name, created_by_user_id) VALUES ('hall-1', 'Test Hall', ?)`).run(
    hallUser.user_id,
  );
  const hallSub = adminSetHallPlan("hall-1", "active", hallUser.user_id);
  assert.equal(hallSub.status, "active");
  assert.equal(hallSub.plan_id, "hall_pro");

  // --- Admin global-flag kill switch ---
  const configBefore = getBillingPublicConfig();
  assert.equal(configBefore.payments_enabled, false, "payments_enabled must default to off");

  const flagged = adminSetGlobalFlag("payments_enabled", true);
  assert.ok(flagged);
  assert.equal(flagged!.enabled, true);
  assert.equal(getBillingPublicConfig().payments_enabled, true);

  // Flip back off — the rest of the suite (and any other test run against
  // this same process) should never observe payments left enabled.
  adminSetGlobalFlag("payments_enabled", false);
  assert.equal(getBillingPublicConfig().payments_enabled, false);

  assert.equal(adminSetGlobalFlag("not_a_real_flag", true), null, "unknown flag keys must be rejected, not silently created");

  assert.equal(adminSetGlobalFlagSchema.safeParse({ enabled: true }).success, true);
  assert.equal(adminSetGlobalFlagSchema.safeParse({ enabled: "true" }).success, false);
  assert.equal(adminSetGlobalFlagSchema.safeParse({}).success, false);

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[test-stripe-billing] OK");
}

main().catch((err) => {
  console.error("[test-stripe-billing] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
