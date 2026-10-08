#!/usr/bin/env tsx
/**
 * Personal subscription entitlement — status + expires_at resolution used by
 * resolveUserBilling and the duplicate-checkout guard.
 *
 *   npx tsx scripts/test-billing-entitlement-expiry.ts
 */
import { subscriptionIsEntitled, type UserSubscription } from "../shared/billing/types.js";
import { userAlreadyHasProAccess } from "../server/billing/checkout-guard.js";

let failures = 0;
function check(name: string, ok: boolean): void {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`  FAIL ${name}`);
  }
}

const NOW = new Date("2026-10-07T12:00:00.000Z");
const PAST = "2026-10-01T00:00:00.000Z";
const FUTURE = "2026-11-07T00:00:00.000Z";

function sub(overrides: Partial<UserSubscription>): UserSubscription {
  return {
    user_id: "u1",
    plan_id: "firefighter_plus",
    status: "active",
    source: "stripe",
    selected_at: "2026-01-01T00:00:00.000Z",
    expires_at: null,
    ...overrides,
  };
}

const entitled = (s: UserSubscription) => subscriptionIsEntitled(s, NOW);

console.log("Stripe-sourced subscriptions");
check(
  "active subscription with a future period end is entitled",
  entitled(sub({ status: "active", current_period_end: FUTURE, cancel_at_period_end: false })),
);
check(
  "valid trialing subscription is entitled",
  entitled(sub({ status: "trialing", current_period_end: FUTURE })),
);
check(
  "past_due (dunning grace) stays entitled",
  entitled(sub({ status: "past_due", current_period_end: FUTURE })),
);
check(
  "stale expires_at from an earlier admin grant does not expire a live Stripe subscription",
  entitled(sub({ status: "active", expires_at: PAST, current_period_end: FUTURE })),
);
check(
  "cancel_at_period_end keeps access until Stripe reports cancellation",
  entitled(sub({ status: "active", cancel_at_period_end: true, current_period_end: FUTURE })),
);
check("cancelled subscription is not entitled", !entitled(sub({ status: "cancelled", current_period_end: PAST })));

console.log("Non-Stripe grants (admin_grant / self_select)");
check("admin grant with no expiry is entitled", entitled(sub({ source: "admin_grant", expires_at: null })));
check("admin grant with a future expiry is entitled", entitled(sub({ source: "admin_grant", expires_at: FUTURE })));
check(
  "valid trialing grant (future expiry) is entitled",
  entitled(sub({ source: "admin_grant", status: "trialing", expires_at: FUTURE })),
);
check(
  "expired trial is not entitled",
  !entitled(sub({ source: "admin_grant", status: "trialing", expires_at: PAST })),
);
check(
  "expired active entitlement is not entitled",
  !entitled(sub({ source: "admin_grant", status: "active", expires_at: PAST })),
);
check(
  "expired past_due grant is not entitled",
  !entitled(sub({ source: "self_select", status: "past_due", expires_at: PAST })),
);
check(
  "expiry exactly at now is not entitled",
  !entitled(sub({ source: "admin_grant", expires_at: NOW.toISOString() })),
);
check("unparseable expiry fails closed", !entitled(sub({ source: "admin_grant", expires_at: "not-a-date" })));
check(
  "cancelled grant with a future expiry is still not entitled",
  !entitled(sub({ source: "admin_grant", status: "cancelled", expires_at: FUTURE })),
);
check(
  "Postgres timestamptz text format is parsed",
  !entitled(sub({ source: "admin_grant", expires_at: "2026-10-01 00:00:00+00" })) &&
    entitled(sub({ source: "admin_grant", expires_at: "2026-11-07 00:00:00+00" })),
);
check(
  "rows without source/expires_at fall back to status only",
  subscriptionIsEntitled({ status: "active" }, NOW) && !subscriptionIsEntitled({ status: "cancelled" }, NOW),
);

console.log("Duplicate-checkout guard");
check("no subscription — checkout allowed", userAlreadyHasProAccess(null) === false);
check(
  "live Stripe Pro is blocked from a second checkout",
  userAlreadyHasProAccess(sub({ status: "active", current_period_end: FUTURE })) === true,
);
check(
  "expired admin-granted Pro may check out (no longer has access)",
  userAlreadyHasProAccess(sub({ source: "admin_grant", expires_at: PAST })) === false,
);
check(
  "open-ended admin-granted Pro is still blocked",
  userAlreadyHasProAccess(sub({ source: "admin_grant", expires_at: null })) === true,
);
check(
  "free plan never blocks checkout",
  userAlreadyHasProAccess(sub({ plan_id: "personal", source: "self_select" })) === false,
);

if (failures > 0) {
  console.error(`\n${failures} billing entitlement check(s) failed`);
  process.exit(1);
}
console.log("\nAll billing entitlement checks passed");
