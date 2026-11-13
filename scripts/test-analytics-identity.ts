/**
 * Unique-visitor identity rules and analytics ingest rate limits.
 * Run: npx tsx scripts/test-analytics-identity.ts
 */
import assert from "node:assert/strict";
import {
  aggregateEvents,
  computeRetention,
  type DashboardEventRow,
  type FirstSeenRow,
} from "../server/analytics/dashboard.js";
import {
  analyticsRateLimited,
  RATE_MAX_PER_IP,
  RATE_MAX_PER_VISITOR,
} from "../server/analytics/analytics-routes.js";

const DAY = 86_400_000;
const now = Date.parse("2026-11-10T12:00:00Z");
const pv = (visitor: string | null, user: string | null, at: number): DashboardEventRow => ({
  event_type: "page_view",
  visitor_id: visitor,
  user_id: user,
  session_id: null,
  route: "/",
  metadata: {},
  at,
});

// 1. One person, two browsers, signed in on both → counted once.
{
  const rows = [pv("v-phone", null, now - 3 * DAY), pv("v-phone", "alice", now - 2 * DAY), pv("v-laptop", "alice", now - DAY)];
  const links = new Map([["v-phone", "alice"], ["v-laptop", "alice"]]);
  const agg = aggregateEvents(rows, [], now - 7 * DAY, now, links);
  assert.equal(agg.audience.unique_visitors, 1, "same account on two browsers is one person");
}

// 2. Shared station browser (alice then bob) → link withheld; anonymous
//    history stays with the browser, signed-in rows stay with each account.
{
  const rows = [pv("v-station", null, now - 3 * DAY), pv("v-station", "alice", now - 2 * DAY), pv("v-station", "bob", now - DAY)];
  const firstSeen: FirstSeenRow[] = [
    { visitor_id: "v-station", user_id: null, at: now - 30 * DAY },
    { visitor_id: "v-station", user_id: "alice", at: now - 2 * DAY },
    { visitor_id: "v-station", user_id: "bob", at: now - DAY },
  ];
  const agg = aggregateEvents(rows, firstSeen, now - 7 * DAY, now, new Map());
  assert.equal(agg.audience.unique_visitors, 3, "browser + alice + bob, never merged into one");
  assert.equal(agg.audience.signed_in_visitors, 2);
  // Only the shared browser itself was seen before the period; bob must not inherit it.
  assert.equal(agg.audience.returning_visitors, 1, "new member does not inherit the browser's history");
}

// 3. Signed-in-only users get a first-seen date and enter retention cohorts.
{
  const first = now - 20 * DAY;
  const firstSeen: FirstSeenRow[] = [{ visitor_id: "v-shared", user_id: "carol", at: first }];
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const activity = [
    { visitor_id: "v-shared", user_id: "carol", day: day(first) },
    { visitor_id: "v-shared", user_id: "carol", day: day(first + 3 * DAY) },
  ];
  const r = computeRetention(activity, firstSeen, new Map(), now);
  assert.equal(r.d7.signed_in.cohort, 1, "signed-in-only user is in the 7-day cohort");
  assert.equal(r.d7.signed_in.retained, 1);
}

// 4. Feature usage counts people, not browsers.
{
  const gen = (visitor: string, user: string): DashboardEventRow => ({ ...pv(visitor, user, now - DAY), event_type: "meal_generated" });
  const agg = aggregateEvents([gen("v1", "dave"), gen("v2", "dave")], [], now - 7 * DAY, now, new Map());
  const generator = agg.engagement.feature_usage.find((f) => f.key === "generator");
  assert.equal(generator?.count, 1, "one person on two devices");
}

// 5. Rate limits: 30 people on one NAT, each well under their own cap, are not blocked.
{
  const t = now;
  let blocked = 0;
  for (let person = 0; person < 30; person++) {
    const vid = `00000000-0000-4000-8000-${String(person).padStart(12, "0")}`;
    for (let i = 0; i < 15; i++) if (analyticsRateLimited("203.0.113.7", vid, t)) blocked++;
  }
  assert.equal(blocked, 0, "450 requests/min from 30 browsers on one IP pass");

  const solo = "11111111-1111-4111-8111-111111111111";
  let soloBlocked = 0;
  for (let i = 0; i < RATE_MAX_PER_VISITOR + 5; i++) if (analyticsRateLimited("198.51.100.1", solo, t)) soloBlocked++;
  assert.equal(soloBlocked, 5, "one browser is capped at the per-visitor limit");

  let floodBlocked = 0;
  for (let i = 0; i < RATE_MAX_PER_IP + 10; i++) {
    const rotating = `22222222-2222-4222-8222-${String(i).padStart(12, "0")}`;
    if (analyticsRateLimited("192.0.2.9", rotating, t)) floodBlocked++;
  }
  assert.equal(floodBlocked, 10, "rotating visitor cookies cannot exceed the per-IP ceiling");

  let firstVisitBlocked = 0;
  for (let i = 0; i < 100; i++) if (analyticsRateLimited("192.0.2.50", undefined, t)) firstVisitBlocked++;
  assert.equal(firstVisitBlocked, 0, "cookieless first visits only count toward the IP ceiling");

  assert.equal(analyticsRateLimited("198.51.100.1", solo, t + 61_000), false, "window resets after a minute");
}

console.log("test-analytics-identity: all assertions passed");
