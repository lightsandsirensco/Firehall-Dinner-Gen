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
delete process.env.OPENAI_API_KEY;

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";

// --- Network: only 127.0.0.1 + a stand-in Klaviyo ---------------------------
let klaviyoListMembers = 0;
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
      klaviyoListMembers = 1;
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/api/events/") return new Response(null, { status: 202 });
    return json({ errors: [{ title: "stub", detail: url.pathname }] }, 404);
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
const monthlyPrice = { unit_amount: 599, recurring: { interval: "month", interval_count: 1 } };
const annualPrice = { unit_amount: 3999, recurring: { interval: "year", interval_count: 1 } };
const fakeSubscriptions = [
  { status: "active", start_date: nowSec - 2 * 86400, canceled_at: null, currency: "usd", items: { data: [{ quantity: 1, price: monthlyPrice }] } },
  { status: "active", start_date: nowSec - 200 * 86400, canceled_at: null, currency: "usd", items: { data: [{ quantity: 1, price: annualPrice }] } },
  { status: "trialing", start_date: nowSec - 86400, canceled_at: null, currency: "usd", items: { data: [{ quantity: 1, price: monthlyPrice }] } },
  { status: "canceled", start_date: nowSec - 60 * 86400, canceled_at: nowSec - 3 * 86400, currency: "usd", items: { data: [{ quantity: 1, price: monthlyPrice }] } },
];
const fakeInvoices = [
  { amount_paid: 599, currency: "usd", created: nowSec - 2 * 86400 },
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

  // 8. Revenue: Stripe records only.
  assert.equal(d.revenue.status.available, true);
  assert.equal(d.revenue.active_paid_subscribers, 2, "active Stripe subscriptions only (trial excluded)");
  assert.equal(d.revenue.trialing_subscribers, 1);
  assert.equal(d.revenue.new_paid_subscriptions, 1, "started within 7 days");
  assert.equal(d.revenue.cancellations, 1);
  assert.equal(d.revenue.mrr_cents, 599 + Math.round(3999 / 12), "monthly + annual/12 at list price");
  assert.equal(d.revenue.revenue_cents, 599, "paid invoices in the 7-day window");
  assert.equal(all.revenue.revenue_cents, 599 + 3999);
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
