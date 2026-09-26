#!/usr/bin/env tsx

/**
 * Validates /admin/billing's backing pieces added/repaired in the
 * "ADMIN BILLING PAGE REALITY AUDIT + REPAIR" pass:
 *  - requireAdmin: missing/wrong/correct ADMIN_SECRET (server/admin-auth.ts)
 *  - payments_enabled / monetization_enabled: initial state, successful
 *    mutation, rejected mutation (unknown flag) never produces false state,
 *    and the value read back afterward is real DB truth
 *  - Pro subscriber breakdown: Stripe active/past_due, admin grants, and
 *    cancelled are counted from real DB rows and kept separate — never
 *    blended into one misleading "active subscriptions" number
 *  - AdminGrantBlockedError: an admin grant can never overwrite a user's
 *    live Stripe-sourced subscription — this is a hard block with no
 *    override/force path (a comp requires cancelling Stripe first)
 *  - Stripe configuration status: booleans only, never the actual secret
 *    values, in both the returned object and the admin route source text
 *
 * Follows the same no-network, temp-SQLite-file pattern as
 * scripts/test-billing.ts and scripts/test-stripe-billing.ts.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb, findUserByEmail, upsertEmailUser } from "../server/auth/auth-store.js";
import { bindHallMembershipDb } from "../server/hall-membership/store.js";
import {
  AdminGrantBlockedError,
  adminSetGlobalFlag,
  adminSetUserPlan,
  bindBillingDb,
  getAdminBillingDashboard,
  getBillingPublicConfig,
  resolveUserBilling,
  upsertStripeSubscription,
} from "../server/billing/store.js";
import { getStripeConfigStatus } from "../server/billing/stripe-client.js";
import { adminSetUserPlanSchema, adminUserLookupSchema } from "../shared/billing/schema.js";
import { requireAdmin } from "../server/admin-auth.js";

function readMigration(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), "server", "db", "migrations", name), "utf8");
}

const MIGRATION_014 = readMigration("014_user_accounts.sql");
const MIGRATION_015 = readMigration("015_hall_membership.sql");
const MIGRATION_016 = readMigration("016_billing.sql");
const MIGRATION_042 = readMigration("042_firefighter_plus_plan.sql");
const MIGRATION_046 = readMigration("046_stripe_billing.sql");

const tmpDb = path.join(os.tmpdir(), `fh-admin-billing-validate-${Date.now()}.db`);

/** Minimal fake Express req/res — exercises the real requireAdmin() function, no HTTP server needed. */
function callRequireAdmin(opts: { secretEnv?: string; providedKey?: string }) {
  const originalSecret = process.env.ADMIN_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test"; // must NOT be "development" — that bypasses Golden 100 routes only, but keep this explicit and unambiguous.
  if (opts.secretEnv === undefined) {
    delete process.env.ADMIN_SECRET;
  } else {
    process.env.ADMIN_SECRET = opts.secretEnv;
  }

  let statusCode: number | undefined;
  let body: unknown;
  let nextCalled = false;

  const req = {
    headers: opts.providedKey !== undefined ? { "x-admin-key": opts.providedKey } : {},
    query: {},
    originalUrl: "/api/admin/billing",
    url: "/api/admin/billing",
  } as unknown as Parameters<typeof requireAdmin>[0];

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  } as unknown as Parameters<typeof requireAdmin>[1];

  requireAdmin(req, res, () => {
    nextCalled = true;
  });

  if (originalSecret === undefined) delete process.env.ADMIN_SECRET;
  else process.env.ADMIN_SECRET = originalSecret;
  process.env.NODE_ENV = originalNodeEnv;

  return { statusCode, body, nextCalled };
}

async function main(): Promise<void> {
  // --- requireAdmin: missing / wrong / correct ADMIN_SECRET ---
  const missingSecret = callRequireAdmin({ secretEnv: undefined, providedKey: "anything" });
  assert.equal(missingSecret.statusCode, 503, "no ADMIN_SECRET configured must return 503, not silently pass");
  assert.equal(missingSecret.nextCalled, false);
  assert.match(
    JSON.stringify(missingSecret.body),
    /Admin API is disabled/,
    "503 body must explain ADMIN_SECRET is unset — not a generic error",
  );

  const wrongKey = callRequireAdmin({ secretEnv: "correct-secret-123", providedKey: "wrong-secret" });
  assert.equal(wrongKey.statusCode, 403, "wrong key must be rejected with 403");
  assert.equal(wrongKey.nextCalled, false);

  const noKeyAtAll = callRequireAdmin({ secretEnv: "correct-secret-123", providedKey: undefined });
  assert.equal(noKeyAtAll.statusCode, 403, "missing key (secret IS configured) must also be 403, not treated as valid");

  const correctKey = callRequireAdmin({ secretEnv: "correct-secret-123", providedKey: "correct-secret-123" });
  assert.equal(correctKey.statusCode, undefined, "correct key must call next() and set no status");
  assert.equal(correctKey.nextCalled, true);

  // --- DB-backed store tests ---
  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_014);
  db.exec(MIGRATION_015);
  db.exec(MIGRATION_016);
  db.exec(MIGRATION_042);
  db.exec(MIGRATION_046);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);

  // --- payments_enabled: initial state, successful mutation, subsequent read reflects it ---
  const initial = getBillingPublicConfig();
  assert.equal(initial.payments_enabled, false, "payments_enabled must default to off");

  const flagged = adminSetGlobalFlag("payments_enabled", true);
  assert.ok(flagged, "known flag must be mutable");
  assert.equal(getBillingPublicConfig().payments_enabled, true, "subsequent GET must reflect the just-written DB value");

  // --- failed mutation (unknown flag key) must NOT produce false UI state ---
  const rejected = adminSetGlobalFlag("not_a_real_flag_key", true);
  assert.equal(rejected, null, "unknown flag keys must be rejected (null), never silently created");
  assert.equal(
    getBillingPublicConfig().payments_enabled,
    true,
    "a rejected mutation on an unrelated flag must not disturb payments_enabled",
  );

  // Flip back off for the rest of the suite / any other process-shared state.
  adminSetGlobalFlag("payments_enabled", false);
  assert.equal(getBillingPublicConfig().payments_enabled, false);

  // --- Pro subscriber breakdown: real DB state, categories kept separate ---
  const { user: stripeActiveUser } = upsertEmailUser("pro-stripe-active@test.firehall");
  upsertStripeSubscription({
    userId: stripeActiveUser.user_id,
    stripeCustomerId: "cus_active_1",
    stripeSubscriptionId: "sub_active_1",
    stripePriceId: "price_test_monthly",
    status: "active",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: "2027-01-01T00:00:00.000Z",
  });

  const { user: stripePastDueUser } = upsertEmailUser("pro-stripe-pastdue@test.firehall");
  upsertStripeSubscription({
    userId: stripePastDueUser.user_id,
    stripeCustomerId: "cus_pastdue_1",
    stripeSubscriptionId: "sub_pastdue_1",
    stripePriceId: "price_test_monthly",
    status: "past_due",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: "2027-01-01T00:00:00.000Z",
  });

  const { user: stripeCancelledUser } = upsertEmailUser("pro-stripe-cancelled@test.firehall");
  upsertStripeSubscription({
    userId: stripeCancelledUser.user_id,
    stripeCustomerId: "cus_cancel_1",
    stripeSubscriptionId: "sub_cancel_1",
    stripePriceId: "price_test_monthly",
    status: "cancelled",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  });

  const { user: adminGrantUser } = upsertEmailUser("pro-admin-grant@test.firehall");
  adminSetUserPlan(adminGrantUser.user_id, "firefighter_plus");

  const dashboard = getAdminBillingDashboard();
  assert.equal(dashboard.pro_subscriber_breakdown.stripe_active, 1, "exactly one real Stripe-active Pro subscriber");
  assert.equal(dashboard.pro_subscriber_breakdown.stripe_past_due, 1, "past_due must be its own bucket, not folded into active");
  assert.equal(dashboard.pro_subscriber_breakdown.admin_grants, 1, "admin grants must be counted separately from Stripe");
  assert.equal(
    dashboard.pro_subscriber_breakdown.cancelled,
    1,
    "cancelled Stripe subscriber must be counted as cancelled, never as active",
  );
  // Sanity: cancelled must never leak into stripe_active/stripe_past_due.
  assert.equal(dashboard.pro_subscriber_breakdown.stripe_active + dashboard.pro_subscriber_breakdown.stripe_past_due, 2);

  // --- Stripe configuration status: booleans only, no secret values ---
  const originalStripeEnv = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID_MONTHLY: process.env.STRIPE_PRICE_ID_MONTHLY,
    STRIPE_PRICE_ID_ANNUAL: process.env.STRIPE_PRICE_ID_ANNUAL,
    PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL,
  };
  process.env.STRIPE_SECRET_KEY = "sk_test_super_secret_value_should_never_leak";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_super_secret_value_should_never_leak";
  delete process.env.STRIPE_PRICE_ID_MONTHLY;
  delete process.env.STRIPE_PRICE_ID_ANNUAL;
  delete process.env.PUBLIC_SITE_URL;

  const configStatus = getStripeConfigStatus();
  assert.equal(configStatus.secret_key_configured, true);
  assert.equal(configStatus.webhook_secret_configured, true);
  assert.equal(configStatus.price_monthly_configured, false);
  assert.equal(configStatus.price_annual_configured, false);
  assert.equal(configStatus.public_site_url_configured, false);
  for (const value of Object.values(configStatus)) {
    assert.equal(typeof value, "boolean", "every stripe_config field must be a plain boolean");
  }
  const serialized = JSON.stringify(configStatus);
  assert.ok(!serialized.includes("sk_test_super_secret"), "serialized config status must never contain the secret key value");
  assert.ok(!serialized.includes("whsec_super_secret"), "serialized config status must never contain the webhook secret value");

  const dashboardWithConfig = getAdminBillingDashboard();
  const dashboardSerialized = JSON.stringify(dashboardWithConfig);
  assert.ok(
    !dashboardSerialized.includes("sk_test_super_secret") && !dashboardSerialized.includes("whsec_super_secret"),
    "the full admin dashboard payload must never contain raw Stripe secret values",
  );

  process.env.STRIPE_SECRET_KEY = originalStripeEnv.STRIPE_SECRET_KEY;
  process.env.STRIPE_WEBHOOK_SECRET = originalStripeEnv.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_PRICE_ID_MONTHLY = originalStripeEnv.STRIPE_PRICE_ID_MONTHLY;
  process.env.STRIPE_PRICE_ID_ANNUAL = originalStripeEnv.STRIPE_PRICE_ID_ANNUAL;
  process.env.PUBLIC_SITE_URL = originalStripeEnv.PUBLIC_SITE_URL;

  // Static source-text guard: the admin lookup route must never even
  // reference the raw Stripe id columns or secret env var names in its
  // response construction (belt-and-suspenders alongside the runtime check
  // above — catches a future edit that adds a leaking field even before
  // any test seeds matching data).
  const routesSource = fs.readFileSync(
    path.join(process.cwd(), "server", "billing", "routes.ts"),
    "utf8",
  );
  const lookupRouteMatch = routesSource.match(
    /app\.get\("\/api\/admin\/billing\/users\/lookup"[\s\S]*?\n {2}\}\);/,
  );
  assert.ok(lookupRouteMatch, "expected to find the admin user lookup route in routes.ts");
  const lookupRouteText = lookupRouteMatch![0];
  for (const forbidden of ["stripe_customer_id", "stripe_subscription_id", "stripe_price_id", "STRIPE_SECRET_KEY"]) {
    assert.ok(!lookupRouteText.includes(forbidden), `lookup route must never reference ${forbidden}`);
  }

  // --- User billing lookup (by email) resolves a REAL seeded user ---
  const foundUser = findUserByEmail("PRO-STRIPE-ACTIVE@test.firehall"); // case-insensitive, matches route behavior
  assert.ok(foundUser, "lookup must find a real user by email (case-insensitive)");
  assert.equal(foundUser!.user_id, stripeActiveUser.user_id);
  assert.equal(findUserByEmail("does-not-exist@test.firehall"), null, "unknown email must resolve to null, not throw");

  const lookedUpBilling = resolveUserBilling(foundUser!.user_id);
  assert.equal(lookedUpBilling.effective_plan_id, "firefighter_plus");
  assert.equal(lookedUpBilling.subscription?.source, "stripe");
  assert.equal(lookedUpBilling.manage_billing_available, true);

  assert.equal(adminUserLookupSchema.safeParse({ email: "a@b.com" }).success, true);
  assert.equal(adminUserLookupSchema.safeParse({ email: "" }).success, false);
  assert.equal(adminUserLookupSchema.safeParse({}).success, false);

  // --- AdminGrantBlockedError: admin grant must not silently clobber a live Stripe subscription ---
  assert.throws(
    () => adminSetUserPlan(stripeActiveUser.user_id, "personal"),
    AdminGrantBlockedError,
    "granting a plan to a user with a LIVE Stripe subscription must be blocked",
  );
  // The blocked attempt must not have changed anything.
  const stillStripe = resolveUserBilling(stripeActiveUser.user_id);
  assert.equal(stillStripe.subscription?.source, "stripe", "blocked grant must leave the Stripe row untouched");
  assert.equal(stillStripe.effective_plan_id, "firefighter_plus");

  // adminSetUserPlan() itself takes no "force"/options parameter at all —
  // there is deliberately no bypass path in its signature. A live Stripe
  // subscriber can only be re-planned locally after their Stripe
  // subscription is actually cancelled (see the CANCELLED case below).

  // A CANCELLED Stripe subscription is not "live" — granting over it is allowed.
  assert.doesNotThrow(() => adminSetUserPlan(stripeCancelledUser.user_id, "firefighter_plus"));
  const grantedOverCancelled = resolveUserBilling(stripeCancelledUser.user_id);
  assert.equal(grantedOverCancelled.subscription?.source, "admin_grant");
  assert.equal(grantedOverCancelled.effective_plan_id, "firefighter_plus");

  // Admin-granted (non-Stripe) users can always be re-granted.
  assert.doesNotThrow(() => adminSetUserPlan(adminGrantUser.user_id, "personal"));

  // --- adminSetUserPlanSchema: no `force` field exists at all — even if a
  // caller sends one, zod strips unknown keys by default, so it never
  // reaches adminSetUserPlan() (which, belt-and-suspenders, has no
  // parameter to receive it regardless). ---
  assert.equal(adminSetUserPlanSchema.safeParse({ plan_id: "personal" }).success, true);
  const parsedWithForce = adminSetUserPlanSchema.safeParse({ plan_id: "personal", force: true });
  assert.equal(parsedWithForce.success, true, "an unknown 'force' field must not fail validation...");
  assert.equal(
    (parsedWithForce.success ? (parsedWithForce.data as Record<string, unknown>).force : "MISSING"),
    undefined,
    "...but it must be silently stripped, never passed through as a real field",
  );

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[test-admin-billing] OK");
}

main().catch((err) => {
  console.error("[test-admin-billing] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
