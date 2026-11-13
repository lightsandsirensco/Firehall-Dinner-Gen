#!/usr/bin/env tsx
/**
 * Admin analytics dashboard — end-to-end accuracy test, fully isolated:
 * the real Express app (registerRoutes) against in-process PGlite (every
 * Postgres migration, never DATABASE_URL), a temp SQLite file, a stand-in
 * Klaviyo (fetch stub) and a stand-in Stripe client. No outbound network.
 *
 *   1. Submit an email through the real homepage subscribe endpoint
 *   2. Verify it is stored (Postgres consent row) — once, even on resubmit
 *   3. Verify it appears in the dashboard's newsletter metrics
 *   4–5. Generator events → exactly one completed meal generation
 *   6. Page views across pages → visitors / sessions / pages / sources
 *   7. Dashboard totals == direct database counts
 *   8. Revenue comes only from Stripe subscription records
 *
 * Run: npx tsx scripts/test-analytics-dashboard-e2e.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { loadProjectEnv } from "../server/lib/load-project-env.js";

loadProjectEnv();
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "fh-analytics-e2e-"));
const ADMIN_KEY = "e2e-admin-key";
process.env.LOCAL_SQLITE_DB_PATH = path.join(TMP_DIR, "cache.db");
process.env.DATABASE_URL = "postgres://pglite.invalid/never-connect";
process.env.ANALYTICS_PG_MIRROR = "1";
process.env.ADMIN_SECRET = ADMIN_KEY;
process.env.NODE_ENV = "test";
process.env.KLAVIYO_API_KEY = "pk_e2e_stub_never_sent";
process.env.STRIPE_SECRET_KEY = "sk_test_e2e_stub_no_network";
process.env.GOOGLE_CLIENT_ID = "e2e-client.apps.googleusercontent.com";
delete process.env.OPENAI_API_KEY;

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";

// --- Network: only 127.0.0.1 + a stand-in Klaviyo ---------------------------
let klaviyoListMembers = 0;
const klaviyoSubscribeBodies: any[] = [];
let klaviyoRelationshipCalls = 0;
let klaviyoFailNext = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname === "127.0.0.1") return realFetch(input, init);
  if (url.hostname === "a.klaviyo.com") {
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.pathname === "/api/lists/" && method === "GET") return json({ data: [{ id: "LIST_E2E" }] });
    if (url.pathname === "/api/lists/LIST_E2E/" && method === "GET")
      return json({ data: { id: "LIST_E2E", attributes: { profile_count: klaviyoListMembers } } });
    if (url.pathname === "/api/profile-import/") return json({ data: { id: "PROFILE_E2E" } });
    if (url.pathname.endsWith("/relationships/profiles/")) {
      klaviyoRelationshipCalls += 1;
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/api/profile-subscription-bulk-create-jobs/" && method === "POST") {
      if (klaviyoFailNext > 0) {
        klaviyoFailNext -= 1;
        return json({ errors: [{ title: "Service Unavailable", detail: "stub outage" }] }, 503);
      }
      klaviyoSubscribeBodies.push(JSON.parse(String(init?.body)));
      klaviyoListMembers = 1;
      return new Response(null, { status: 202 });
    }
    if (url.pathname === "/api/events/") return new Response(null, { status: 202 });
    return json({ errors: [{ title: "stub", detail: url.pathname }] }, 404);
  }
  if (url.hostname === "oauth2.googleapis.com" && url.pathname === "/tokeninfo") {
    // Stand-in tokeninfo: the "token" is base64 JSON claims.
    const claims = JSON.parse(Buffer.from(url.searchParams.get("id_token") ?? "", "base64url").toString());
    return new Response(JSON.stringify(claims), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  throw new Error(`analytics e2e: outbound request to ${url.hostname} blocked`);
}) as typeof fetch;

// --- PGlite ------------------------------------------------------------------
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

// --- Stand-in Stripe ---------------------------------------------------------
const nowSec = Math.floor(Date.now() / 1000);
const monthlyPrice = { unit_amount: 499, recurring: { interval: "month", interval_count: 1 } };
const annualPrice = { unit_amount: 3999, recurring: { interval: "year", interval_count: 1 } };
const fakeSubscriptions = [
  { status: "active", start_date: nowSec - 2 * 86400, canceled_at: null, currency: "usd", items: { data: [{ quantity: 1, price: monthlyPrice }] } },
  { status: "active", start_date: nowSec - 200 * 86400, canceled_at: null, currency: "usd", items: { data: [{ quantity: 1, price: annualPrice }] } },
  { status: "trialing", start_date: nowSec - 86400, canceled_at: null, currency: "usd", items: { data: [{ quantity: 1, price: monthlyPrice }] } },
  { status: "canceled", start_date: nowSec - 60 * 86400, canceled_at: nowSec - 3 * 86400, currency: "usd", items: { data: [{ quantity: 1, price: monthlyPrice }] } },
];
const fakeInvoices = [
  { amount_paid: 499, currency: "usd", created: nowSec - 2 * 86400 },
  { amount_paid: 3999, currency: "usd", created: nowSec - 200 * 86400 },
];
const stripeCalls: string[] = [];
const fakeStripe = {
  subscriptions: {
    list(params: Record<string, unknown>) {
      stripeCalls.push(`subscriptions.list:${JSON.stringify(params)}`);
      return { autoPagingToArray: async () => fakeSubscriptions };
    },
  },
  invoices: {
    list(params: { created?: { gte: number } }) {
      stripeCalls.push(`invoices.list:${JSON.stringify(params)}`);
      const gte = params.created?.gte ?? 0;
      return { autoPagingToArray: async () => fakeInvoices.filter((i) => i.created >= gte) };
    },
  },
};
const stripeClient = await import("../server/billing/stripe-client.js");
stripeClient.setStripeClientForTests(fakeStripe as never);

// --- Boot the real server entry point on a free port -------------------------
const { runPgMigrations } = await import("../server/db/pg-migrate.js");
const { pgAll, pgOne, pgRun } = await import("../server/db/pg-sql.js");
await runPgMigrations();

const port = await new Promise<number>((resolve) => {
  const probe = http.createServer().listen(0, "127.0.0.1", () => {
    const p = (probe.address() as AddressInfo).port;
    probe.close(() => resolve(p));
  });
});
process.env.PORT = String(port);
await import("../server/index.js");
const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 120; i++) {
  try {
    const res = await fetch(`${base}/api/csrf-token`, { headers: { "User-Agent": UA } });
    if (res.ok) break;
  } catch {
    /* booting */
  }
  await new Promise((r) => setTimeout(r, 500));
}

let passed = 0;
function ok(name: string): void {
  passed += 1;
  console.log(`  ✓ ${name}`);
}

// Minimal browser: cookies + CSRF.
const jar = new Map<string, string>();
function cookieHeader(): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function absorb(res: Response): void {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const i = pair.indexOf("=");
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
}
async function browser(pathname: string, init: RequestInit = {}, ua = UA): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("User-Agent", ua);
  headers.set("cookie", cookieHeader());
  if (init.method && init.method !== "GET") {
    headers.set("Content-Type", "application/json");
    headers.set("X-CSRF-Token", decodeURIComponent(jar.get("csrf_token") ?? ""));
  }
  const res = await fetch(`${base}${pathname}`, { ...init, headers });
  absorb(res);
  return res;
}
async function dashboard(period = "7d") {
  const res = await fetch(`${base}/api/admin/analytics/dashboard?period=${period}`, {
    headers: { "x-admin-key": ADMIN_KEY, "User-Agent": UA },
  });
  assert.equal(res.status, 200, `dashboard ${res.status}`);
  return (await res.json()) as import("../shared/analytics/events.js").AnalyticsDashboardPayload;
}
async function sendEvents(events: unknown[], ua = UA) {
  const res = await browser("/api/analytics/events", { method: "POST", body: JSON.stringify({ events }) }, ua);
  assert.equal(res.status, 200, `events ${res.status}`);
  return (await res.json()) as { inserted: number };
}
const flushMirror = () => new Promise((r) => setTimeout(r, 150));

try {
  console.log("Analytics dashboard E2E (isolated PGlite + temp SQLite)");
  absorb(await fetch(`${base}/api/csrf-token`, { headers: { "User-Agent": UA } }));
  await browser("/api/csrf-token");
  assert.ok(jar.get("csrf_token"), "csrf cookie");

  // Security: dashboard is admin-only.
  const anon = await fetch(`${base}/api/admin/analytics/dashboard`, { headers: { "User-Agent": UA } });
  assert.equal(anon.status, 403);
  const testSeed = await fetch(`${base}/api/admin/analytics/test-events`, {
    method: "POST",
    headers: { "x-admin-key": ADMIN_KEY, "User-Agent": UA },
  });
  assert.equal(testSeed.status === 404 || testSeed.status === 200, true);
  assert.notEqual((await testSeed.text()).includes("inserted"), true, "test-event seeding endpoint removed");
  ok("dashboard rejects requests without the admin key; fake-event seeding endpoint is gone");

  // Pre-existing data the dashboard must show/exclude correctly.
  await pgRun(
    `INSERT INTO users (user_id, email, auth_provider, is_guest, created_at) VALUES
       ('u_real', 'crew.captain@firehouse-crew.org', 'email', 0, now() - interval '40 days'),
       ('u_test', 'qa@example.com', 'email', 0, now())`,
  );
  await pgRun(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, source) VALUES ('u_real', 'firefighter_plus', 'active', 'admin_grant')`,
  );
  const before = await dashboard("7d");
  assert.equal(before.growth.registered_users_total, 1, "test-domain account excluded");
  assert.equal(before.growth.test_accounts_excluded, 1);
  assert.equal(before.growth.registered_users_new, 0, "40-day-old account is not new in 7d");
  assert.equal(before.growth.newsletter_subscribers_total, 0);
  ok("existing accounts counted; reserved test-domain accounts excluded and disclosed");

  // 1–3. Email signup through the real endpoint.
  const email = `e2e.analytics.${Date.now()}@firehouse-crew.org`;
  const bad = await browser("/api/homepage-subscribe", { method: "POST", body: JSON.stringify({ email: "not-an-email" }) });
  assert.equal(bad.status, 400, "invalid email rejected");
  const sub = await browser("/api/homepage-subscribe", { method: "POST", body: JSON.stringify({ email }) });
  assert.equal(sub.status, 200, `subscribe ${sub.status}`);
  await flushMirror();
  const row = await pgOne<{ marketing_consent: number; consent_source: string; consent_captured_at: string }>(
    `SELECT marketing_consent, consent_source, consent_captured_at FROM user_marketing_consent WHERE email = $1`,
    [email],
  );
  assert.ok(row, "consent row stored");
  assert.equal(Number(row.marketing_consent), 1);
  assert.equal(row.consent_source, "homepage");
  ok("homepage signup stored in Postgres with date + source; invalid submission not stored");

  await new Promise((r) => setTimeout(r, 30));
  const again = await browser("/api/homepage-subscribe", { method: "POST", body: JSON.stringify({ email: email.toUpperCase() }) });
  assert.equal(again.status, 200);
  await flushMirror();
  const rows = await pgAll<{ consent_captured_at: string }>(
    `SELECT consent_captured_at FROM user_marketing_consent WHERE lower(email) = lower($1)`,
    [email],
  );
  assert.equal(rows.length, 1, "duplicate email → still one record");
  assert.equal(new Date(rows[0].consent_captured_at).getTime(), new Date(row.consent_captured_at).getTime(), "original signup date kept");
  ok("duplicate (case-insensitive) resubmission keeps one record and the original signup date");

  const afterSignup = await dashboard("7d");
  assert.equal(afterSignup.growth.newsletter_subscribers_total, 1);
  assert.equal(afterSignup.growth.newsletter_signups_new, 1);
  assert.deepEqual(afterSignup.growth.newsletter_signups_by_source.map((s) => [s.key, s.count]), [["homepage", 1]]);
  assert.equal(afterSignup.growth.known_emails_total, 2, "account + new subscriber, deduplicated, test excluded");
  assert.equal(afterSignup.growth.klaviyo_list_members, before.growth.klaviyo_list_members, "Klaviyo count cached 10 min (read-only)");
  ok("signup appears exactly once in newsletter metrics (total, new, by source, known emails)");

  // 4–5. Meal generation events, as emitted by the generator page.
  const visitorA = "11111111-aaaa-4aaa-8aaa-111111111111";
  await sendEvents([
    { event_type: "page_view", route: "/generator", visitor_id: visitorA, metadata: { traffic_source: "google", device_type: "mobile" } },
    { event_type: "meal_generation_started", route: "/generator", visitor_id: visitorA },
    { event_type: "meal_generated", route: "/generator", visitor_id: visitorA, metadata: { recipe_title: "E2E Chili" } },
  ]);
  // Spoofed/duplicate events a browser must not be able to record.
  const spoof = await sendEvents([
    { event_type: "account_created", visitor_id: visitorA, metadata: { provider: "email" } },
    { event_type: "stripe_checkout_completed", visitor_id: visitorA },
    { event_type: "page_view", route: "/admin/analytics", visitor_id: visitorA },
  ]);
  assert.equal(spoof.inserted, 0, "server-only + admin events dropped");
  const bot = await sendEvents(
    [{ event_type: "page_view", route: "/", visitor_id: "bot-visitor" }],
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  );
  assert.equal(bot.inserted, 0, "crawler dropped");
  await flushMirror();
  const generated = await pgOne<{ n: string }>(`SELECT COUNT(*) AS n FROM analytics_events WHERE event_type = 'meal_generated'`);
  assert.equal(Number(generated?.n), 1);
  const afterGen = await dashboard("7d");
  assert.equal(afterGen.engagement.meals_generated, 1);
  assert.equal(afterGen.engagement.meal_generation_success_rate, 100);
  ok("exactly one completed meal-generation event recorded and reported; spoofed, admin and bot events rejected");

  // 6. Page views across pages, two visitors, two sessions.
  const visitorB = "22222222-bbbb-4bbb-8bbb-222222222222";
  await sendEvents([
    { event_type: "page_view", route: "/", visitor_id: visitorA, metadata: { traffic_source: "internal", device_type: "mobile" } },
    { event_type: "page_view", route: "/recipes/chicken-parm?token=SECRET", visitor_id: visitorA, metadata: { traffic_source: "internal", device_type: "mobile" } },
    { event_type: "recipe_view", route: "/recipes/chicken-parm", visitor_id: visitorA, metadata: { recipe_slug: "chicken-parm", recipe_title: "Chicken Parm" } },
    { event_type: "recipe_save", route: "/recipes/chicken-parm", visitor_id: visitorA, metadata: { recipe_slug: "chicken-parm", recipe_title: "Chicken Parm" } },
  ]);
  assert.equal(jar.get("fh_vid"), visitorA, "server visitor cookie adopted the browser's id");
  jar.delete("fh_vid"); // visitor B is a different browser
  await sendEvents([
    { event_type: "page_view", route: "/pizza", visitor_id: visitorB, metadata: { traffic_source: "reddit", device_type: "desktop" } },
    { event_type: "shopping_list_open", route: "/pizza", visitor_id: visitorB, metadata: { recipe_title: "Pizza", generator_type: "pizza" } },
    { event_type: "wheel_spin", route: "/classics-wheel", visitor_id: visitorB, metadata: { recipe_slug: "jerk-chicken", recipe_title: "Jerk Chicken" } },
  ]);
  await flushMirror();
  const d = await dashboard("7d");
  assert.equal(d.audience.status.source.startsWith("Postgres"), true, "dashboard reads durable Postgres events");
  assert.equal(d.audience.page_views, 4);
  assert.equal(d.audience.unique_visitors, 2);
  assert.equal(d.audience.sessions, 2, "one session per visitor (no 30-min gap)");
  assert.deepEqual(
    d.audience.traffic_sources.map((s) => [s.key, s.count]).sort(),
    [["google", 1], ["reddit", 1]],
    "sessions attributed to landing source; internal navigation is not a referral",
  );
  assert.ok(d.audience.top_pages.some((p) => p.key === "/recipes/chicken-parm"), "query string (token) stripped");
  assert.ok(!d.audience.top_pages.some((p) => p.key.includes("SECRET")));
  assert.deepEqual(d.audience.devices.map((x) => [x.key, x.count]).sort(), [["desktop", 1], ["mobile", 3]]);
  assert.equal(d.engagement.pizza_night_views, 1);
  assert.equal(d.engagement.recipes_saved, 1);
  assert.equal(d.engagement.grocery_lists_created, 1);
  assert.equal(d.engagement.wheel_spins, 1);
  assert.equal(d.growth.newsletter_conversion_rate, 50, "1 new subscriber / 2 unique visitors");
  ok("page views, visitors, sessions, sources, pages, devices and feature counts are correct");

  // 7. Dashboard totals == direct database counts.
  const db = await pgOne<Record<string, string>>(
    `SELECT
       COUNT(*) FILTER (WHERE event_type = 'page_view') AS pv,
       COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view') AS uv,
       COUNT(*) FILTER (WHERE event_type = 'recipe_save') AS saves,
       COUNT(*) FILTER (WHERE event_type = 'meal_generated') AS meals
     FROM analytics_events WHERE occurred_at >= now() - interval '7 days'`,
  );
  assert.equal(d.audience.page_views, Number(db?.pv));
  assert.equal(d.audience.unique_visitors, Number(db?.uv));
  assert.equal(d.engagement.recipes_saved, Number(db?.saves));
  assert.equal(d.engagement.meals_generated, Number(db?.meals));
  const consentDb = await pgOne<{ n: string }>(
    `SELECT COUNT(*) AS n FROM user_marketing_consent WHERE marketing_consent = 1 AND unsubscribed_at IS NULL`,
  );
  assert.equal(d.growth.newsletter_subscribers_total, Number(consentDb?.n));
  ok("dashboard totals match direct Postgres counts");

  // Period filters.
  const all = await dashboard("all");
  const d90 = await dashboard("90d");
  assert.equal(all.audience.page_views, 4);
  assert.equal(d90.audience.page_views, 4);
  assert.equal(all.growth.registered_users_total, 1);
  ok("7-day / 90-day / all-time filters return consistent data");

  // 9. Klaviyo: opt-in grants marketing consent through the subscription API.
  const job = klaviyoSubscribeBodies.find((b) => b.data.attributes.profiles.data[0].attributes.email === email);
  assert.ok(job, "subscription job sent for the homepage signup");
  assert.equal(job.data.type, "profile-subscription-bulk-create-job");
  assert.equal(job.data.attributes.profiles.data[0].attributes.subscriptions.email.marketing.consent, "SUBSCRIBED");
  assert.equal(job.data.relationships.list.data.id, "LIST_E2E");
  assert.equal(klaviyoRelationshipCalls, 0, "list-membership-only endpoint no longer used");
  ok("Klaviyo opt-in uses profile-subscription-bulk-create-jobs with SUBSCRIBED consent + list");

  // Outage: inline retries exhausted → queued in Postgres → worker delivers later.
  const outageEmail = `e2e.outage.${Date.now()}@firehouse-crew.org`;
  klaviyoFailNext = 3;
  const sentBefore = klaviyoSubscribeBodies.length;
  const outage = await browser("/api/homepage-subscribe", { method: "POST", body: JSON.stringify({ email: outageEmail }) });
  assert.equal(outage.status, 207, "signup still accepted during a Klaviyo outage");
  assert.equal(klaviyoFailNext, 0, "3 inline attempts made");
  await flushMirror();
  let q = await pgOne<{ status: string; attempts: number; last_error: string }>(
    `SELECT status, attempts, last_error FROM klaviyo_subscription_queue WHERE email = $1`,
    [outageEmail],
  );
  assert.equal(q?.status, "pending");
  assert.match(q!.last_error, /503/);
  await pgRun(`UPDATE klaviyo_subscription_queue SET next_attempt_at = now() WHERE email = $1`, [outageEmail]);
  const { processKlaviyoRetryQueue } = await import("../server/klaviyo.js");
  const retried = await processKlaviyoRetryQueue();
  assert.equal(retried.sent, 1);
  q = await pgOne<{ status: string; attempts: number; last_error: string }>(
    `SELECT status, attempts, last_error FROM klaviyo_subscription_queue WHERE email = $1`,
    [outageEmail],
  );
  assert.equal(q?.status, "sent");
  assert.equal(klaviyoSubscribeBodies.length, sentBefore + 1);
  // An unsubscribe recorded before the retry always wins.
  const unsubEmail = `e2e.unsub.${Date.now()}@firehouse-crew.org`;
  await pgRun(
    `INSERT INTO user_marketing_consent (id, email, marketing_consent, consent_source, unsubscribed_at) VALUES ('c_unsub', $1, 0, 'homepage', now())`,
    [unsubEmail],
  );
  await pgRun(`INSERT INTO klaviyo_subscription_queue (email, status, attempts) VALUES ($1, 'pending', 1)`, [unsubEmail]);
  const cancelled = await processKlaviyoRetryQueue();
  assert.equal(cancelled.cancelled, 1);
  assert.equal(cancelled.sent, 0, "never re-subscribes an unsubscribed email");
  const summary = await fetch(`${base}/api/admin/marketing/klaviyo-queue`, { headers: { "x-admin-key": ADMIN_KEY, "User-Agent": UA } });
  assert.equal(summary.status, 200);
  ok("Klaviyo outage: 3 inline retries, durable queue, worker delivery, unsubscribes never overridden");

  // 10. Mobile delivery: sendBeacon-style request (text/plain, no CSRF header).
  const beacon = (headers: Record<string, string>, visitor: string, cookies = "") =>
    fetch(`${base}/api/analytics/events`, {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "text/plain;charset=UTF-8", ...(cookies ? { cookie: cookies } : {}), ...headers },
      body: JSON.stringify({ events: [{ event_type: "page_view", route: "/beacon", visitor_id: visitor, metadata: { traffic_source: "direct" } }] }),
    });
  const visitorC = "33333333-cccc-4ccc-8ccc-333333333333";
  const accepted = await beacon({ Origin: base, "Sec-Fetch-Site": "same-origin" }, visitorC);
  assert.equal(accepted.status, 200, "same-origin beacon accepted without CSRF header");
  const vidCookie = (accepted.headers.getSetCookie?.() ?? []).find((c) => c.startsWith("fh_vid="));
  assert.ok(vidCookie && /HttpOnly/i.test(vidCookie) && /Max-Age=\d{7,}/i.test(vidCookie), "long-lived httpOnly visitor cookie");
  assert.equal((await beacon({ Origin: "https://evil.example" }, visitorC)).status, 403, "foreign Origin refused");
  assert.equal((await beacon({ "Sec-Fetch-Site": "cross-site", Origin: base }, visitorC)).status, 403, "cross-site fetch refused");
  assert.equal((await beacon({}, visitorC)).status, 403, "no CSRF token and no origin proof refused");
  // The server cookie wins over a different (e.g. ITP-wiped and regenerated) client id.
  await beacon({ "Sec-Fetch-Site": "same-origin" }, "44444444-dddd-4ddd-8ddd-444444444444", `fh_vid=${visitorC}`);
  await flushMirror();
  const beaconRows = await pgAll<{ visitor_id: string }>(`SELECT visitor_id FROM analytics_events WHERE route = '/beacon'`);
  assert.deepEqual([...new Set(beaconRows.map((r) => r.visitor_id))], [visitorC], "one visitor despite regenerated client id");
  ok("beacon delivery accepted same-origin; cross-site/forged requests refused; server visitor cookie survives client resets");

  // 11. Signed-in activity is linked to the account and counted once across devices.
  const { createAuthSession, getAuthCookieName } = await import("../server/auth/auth-store.js");
  const session1 = await createAuthSession("u_real", false);
  const session2 = await createAuthSession("u_real", false);
  const phone = "55555555-eeee-4eee-8eee-555555555555";
  const laptop = "66666666-ffff-4fff-8fff-666666666666";
  // Phone browses anonymously first, then signs in.
  await beacon({ "Sec-Fetch-Site": "same-origin" }, phone, `fh_vid=${phone}`);
  await beacon({ "Sec-Fetch-Site": "same-origin" }, phone, `fh_vid=${phone}; ${getAuthCookieName()}=${session1.token}`);
  await beacon({ "Sec-Fetch-Site": "same-origin" }, laptop, `fh_vid=${laptop}; ${getAuthCookieName()}=${session2.token}`);
  await flushMirror();
  const linked = await pgAll<{ visitor_id: string; user_id: string | null }>(
    `SELECT visitor_id, user_id FROM analytics_events WHERE visitor_id IN ($1, $2) ORDER BY id`,
    [phone, laptop],
  );
  assert.deepEqual(linked.map((r) => r.user_id), [null, "u_real", "u_real"], "user_id set server-side only when signed in");
  const idDash = await dashboard("7d");
  assert.equal(idDash.audience.signed_in_visitors, 1, "two devices + earlier anonymous browsing = one signed-in person");
  assert.equal(idDash.audience.unique_visitors, 4, "A, B, C anonymous + one signed-in person");
  assert.equal(idDash.audience.anonymous_visitors, 3);
  ok("signed-in activity linked to the account; one person across devices and pre-sign-in browsing");

  // 12. Retention cohorts (synthetic history inserted directly).
  const ago = (days: number) => `now() - interval '${days} days'`;
  await pgRun(
    `INSERT INTO analytics_events (event_type, visitor_id, user_id, route, occurred_at) VALUES
       ('page_view', 'ret-r1', NULL, '/', ${ago(20)}), ('page_view', 'ret-r1', NULL, '/', ${ago(17)}),
       ('page_view', 'ret-r2', 'u_ret', '/', ${ago(40)}), ('page_view', 'ret-r2', 'u_ret', '/', ${ago(25)}),
       ('page_view', 'ret-r3', NULL, '/', ${ago(50)})`,
  );
  const ret = (await dashboard("30d")).audience.retention!;
  assert.deepEqual([ret.d7.all.cohort, ret.d7.all.retained, ret.d7.all.rate], [3, 1, 33.3], "d7: r1 back in 3 days; r2 (15d) and r3 not");
  assert.deepEqual([ret.d30.all.cohort, ret.d30.all.retained, ret.d30.all.rate], [2, 1, 50], "d30: r2 back in 15 days; r1 too recent");
  assert.deepEqual([ret.d30.signed_in.cohort, ret.d30.signed_in.retained], [1, 1]);
  assert.deepEqual([ret.d30.anonymous.cohort, ret.d30.anonymous.retained], [1, 0]);
  const ret30 = await dashboard("30d");
  assert.equal(ret30.audience.returning_signed_in_users, 1, "u_ret: seen before the period");
  ok("7-day and 30-day retention computed per first-visit cohort, split signed-in / anonymous");

  // 13. Server requests are counted separately from page views; tracking baseline labelled.
  await fetch(`${base}/`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } });
  await fetch(`${base}/api/health`, { headers: { "User-Agent": "kube-probe" } });
  const { flushServerRequestCounts } = await import("../server/analytics/server-requests.js");
  await flushServerRequestCounts();
  const sr = (await dashboard("7d")).audience.server_requests!;
  assert.ok(sr.total > sr.page_human, "server requests include API/asset/bot traffic");
  assert.ok(sr.page_bot >= 1 && sr.health >= 1 && sr.api >= 1);
  const final = await dashboard("7d");
  assert.equal(final.tracking.reliable, true);
  assert.ok(final.tracking.reliable_since, "reliable tracking start date labelled");
  ok("server requests (bots, API, health, files) reported separately; reliable-tracking date labelled");

  // 14. Google redirect sign-in: g_csrf_token double-submit, or the signed nonce fallback.
  const idToken = (nonce?: string) =>
    Buffer.from(
      JSON.stringify({
        sub: "google-sub-e2e", email: "g.user@firehouse-crew.org", email_verified: "true",
        aud: process.env.GOOGLE_CLIENT_ID, iss: "https://accounts.google.com",
        exp: Math.floor(Date.now() / 1000) + 600, ...(nonce ? { nonce } : {}),
      }),
    ).toString("base64url");
  const googlePost = (form: Record<string, string>, cookies: string) =>
    fetch(`${base}/api/auth/google/callback`, {
      method: "POST",
      redirect: "manual",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", cookie: cookies, Origin: "https://accounts.google.com" },
      body: new URLSearchParams(form).toString(),
    });
  const nonce = "n-0123456789abcdef0123";
  const noProof = await googlePost({ credential: idToken(nonce) }, "");
  assert.equal(noProof.headers.get("location"), "/?error=sign_in_failed", "no CSRF cookie and no nonce → refused");
  const wrongNonce = await googlePost({ credential: idToken("n-attacker-0000000000") }, `fh_g_nonce=${nonce}`);
  assert.equal(wrongNonce.headers.get("location"), "/?error=sign_in_failed", "token minted for another nonce → refused");
  const noTokenNonce = await googlePost({ credential: idToken() }, `fh_g_nonce=${nonce}`);
  assert.equal(noTokenNonce.headers.get("location"), "/?error=sign_in_failed", "token without nonce → refused on fallback path");
  const viaNonce = await googlePost({ credential: idToken(nonce) }, `fh_g_nonce=${nonce}`);
  assert.match(viaNonce.headers.get("location") ?? "", /signed_in=1/, "matching signed nonce accepted when g_csrf_token cookie is lost");
  assert.ok((viaNonce.headers.getSetCookie?.() ?? []).some((c) => c.startsWith(`${getAuthCookieName()}=`)), "session cookie set");
  const viaCsrf = await googlePost({ credential: idToken(), g_csrf_token: "abc123" }, "g_csrf_token=abc123");
  assert.match(viaCsrf.headers.get("location") ?? "", /signed_in=1/, "classic g_csrf_token double-submit still accepted");
  const googleUsers = await pgAll(`SELECT user_id FROM auth_identities WHERE provider = 'google' AND provider_subject = 'google-sub-e2e'`);
  assert.equal(googleUsers.length, 1, "repeat Google sign-in reuses one account");
  ok("Google redirect callback: CSRF cookie or matching signed nonce required; one account per Google identity");

  // 8. Revenue: Stripe records only.
  assert.equal(d.revenue.status.available, true);
  assert.equal(d.revenue.active_paid_subscribers, 2, "active Stripe subscriptions only (trial excluded)");
  assert.equal(d.revenue.trialing_subscribers, 1);
  assert.equal(d.revenue.new_paid_subscriptions, 1, "started within 7 days");
  assert.equal(d.revenue.cancellations, 1);
  assert.equal(d.revenue.mrr_cents, 499 + Math.round(3999 / 12), "monthly + annual/12 at list price");
  assert.equal(d.revenue.revenue_cents, 499, "paid invoices in the 7-day window");
  assert.equal(all.revenue.revenue_cents, 499 + 3999);
  assert.equal(d.revenue.complimentary_plans, 1, "admin-granted Pro shown separately, never as paid");
  assert.ok(stripeCalls.every((c) => c.startsWith("subscriptions.list") || c.startsWith("invoices.list")), "read-only Stripe calls");
  ok("revenue metrics come only from Stripe subscriptions/invoices (read-only); admin grants excluded");

  stripeClient.setStripeClientForTests(null);
  delete process.env.STRIPE_SECRET_KEY;
  const noStripe = await dashboard("30d");
  assert.equal(noStripe.revenue.active_paid_subscribers, null, "unavailable, not a fabricated 0");
  assert.equal(noStripe.revenue.status.available, false);
  ok("without Stripe credentials revenue is labelled unavailable instead of showing 0");

  console.log(`\nAll ${passed} checks passed.`);
} catch (err) {
  console.error("\nFAILED:", err);
  process.exitCode = 1;
} finally {
  if (process.env.E2E_KEEP_ALIVE === "1") {
    console.log(`\nKeeping isolated server up for manual review: ${base}/admin/analytics (admin key: ${ADMIN_KEY})`);
    await new Promise(() => {});
  }
  await pg.close().catch(() => {});
  try {
    const { releaseSqliteTimersForTests } = await import("../server/sqlite.js");
    releaseSqliteTimersForTests();
  } catch {
    /* ignore */
  }
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  setTimeout(() => process.exit(process.exitCode ?? 0), 100);
}
