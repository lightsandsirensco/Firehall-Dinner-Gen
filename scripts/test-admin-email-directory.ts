#!/usr/bin/env tsx
/**
 * /admin/users and /admin/signups read Postgres only, and match the database:
 * counts equal independent SQL, emails are deduplicated case-insensitively,
 * consent comes only from user_marketing_consent (never Klaviyo), search,
 * filters, pagination and CSV export agree, the capture path persists leads
 * without consent, legacy import is insert-only, and no read touches data.
 */
import { testPg } from "./lib/pglite-test-db.js";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import { recordConsentOptIn, recordUnsubscribe } from "../server/marketing-consent/store.js";
import {
  csvCell,
  emailDirectoryCsv,
  queryEmailDirectory,
  queryRegisteredUsers,
  recordEmailLeadCapture,
  registeredUsersCsv,
} from "../server/admin-users/email-directory.js";
import { captureEmailLead, registerAdminUsersRoutes } from "../server/admin-users/routes.js";
import { importLegacyLeads, parseLegacyLeadsCsv } from "./import-legacy-email-leads.js";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";

async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await testPg.query(text, params)).rows as T[];
}

async function addUser(
  id: string,
  email: string | null,
  opts: { provider?: string; guest?: boolean; createdDaysAgo?: number; loginDaysAgo?: number | null; name?: string } = {},
): Promise<void> {
  await sql(
    `INSERT INTO users (user_id, email, auth_provider, is_guest, created_at, last_login_at)
     VALUES ($1, $2, $3, $4, now() - ($5 || ' days')::interval,
             CASE WHEN $6::int IS NULL THEN NULL ELSE now() - ($6 || ' days')::interval END)`,
    [id, email, opts.provider ?? "email", opts.guest ? 1 : 0, String(opts.createdDaysAgo ?? 1), opts.loginDaysAgo ?? null],
  );
  if (opts.name) {
    await sql(`INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2)`, [id, opts.name]);
  }
}

async function addSubscription(userId: string, status: string, source: string, pastDueDaysAgo?: number): Promise<void> {
  await sql(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, source, past_due_since)
     VALUES ($1, 'firefighter_plus', $2, $3,
             CASE WHEN $4::int IS NULL THEN NULL ELSE now() - ($4 || ' days')::interval END)`,
    [userId, status, source, pastDueDaysAgo ?? null],
  );
}

async function addTrial(userId: string, expiresInDays: number): Promise<void> {
  await sql(
    `INSERT INTO personal_pro_trials (user_id, trial_started_at, trial_expires_at, start_source)
     VALUES ($1, now() + (($2 - 14) || ' days')::interval, now() + ($2 || ' days')::interval, 'first_shift_plan')`,
    [userId, String(expiresInDays)],
  );
}

async function snapshot(): Promise<string> {
  const tables = [
    "users",
    "user_profiles",
    "user_subscriptions",
    "personal_pro_trials",
    "user_marketing_consent",
    "klaviyo_subscription_queue",
    "auth_magic_links",
    "email_lead_captures",
  ];
  const parts: string[] = [];
  for (const t of tables) {
    const [row] = await sql<{ h: string | null }>(
      `SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) AS h FROM ${t} x`,
    );
    parts.push(`${t}:${row?.h}`);
  }
  return parts.join("\n");
}

async function main(): Promise<void> {
  // ---- Registered users ----
  await addUser("u_alice", "alice@fh.test", { provider: "google", name: "Alice Captain", loginDaysAgo: 2 });
  await addUser("u_bob", "bob@fh.test", { createdDaysAgo: 40, loginDaysAgo: 35 });
  await addUser("u_carol", "Carol@FH.test", { createdDaysAgo: 3 });
  await addUser("u_guest", null, { guest: true });
  await addUser("u_henry", "henry@fh.test", { createdDaysAgo: 20 });
  await addUser("u_ivan", "ivan@fh.test", { createdDaysAgo: 5 });
  await addUser("u_jack", "jack@fh.test", { createdDaysAgo: 30 });
  await addUser("u_kate", "kate@fh.test", { createdDaysAgo: 60 });
  await addUser("u_liam", "liam@fh.test", { createdDaysAgo: 60 });
  await addSubscription("u_henry", "active", "stripe");
  await addTrial("u_ivan", 7);
  await addTrial("u_jack", -3);
  await addSubscription("u_kate", "past_due", "stripe", 1);
  await addSubscription("u_liam", "past_due", "stripe", 60);

  // ---- Consent, Klaviyo, leads, sign-in requests ----
  await recordConsentOptIn({ email: "alice@fh.test", userId: "u_alice", source: "homepage" });
  await sql(`INSERT INTO klaviyo_subscription_queue (email, status) VALUES ('alice@fh.test', 'sent')`);
  // Bob is on the Klaviyo list (queue sent) but never opted in: must NOT read as consent.
  await sql(`INSERT INTO klaviyo_subscription_queue (email, status) VALUES ('bob@fh.test', 'sent')`);
  await recordEmailLeadCapture({ email: "carol@fh.test", source: "generator" });
  await recordEmailLeadCapture({ email: "dave@fh.test", source: "homepage" });
  await recordConsentOptIn({ email: "dave@fh.test", source: "homepage" });
  await recordEmailLeadCapture({ email: "Erin@FH.test", source: "shopping_list" });
  await recordEmailLeadCapture({ email: "erin@fh.test", source: "red_lead" });
  await sql(
    `INSERT INTO auth_magic_links (token_hash, email, expires_at) VALUES ('h1', 'frank@fh.test', now() + interval '1 hour')`,
  );
  await recordEmailLeadCapture({ email: "gina@fh.test", source: "generator" });
  await recordConsentOptIn({ email: "gina@fh.test", source: "generator" });
  await recordUnsubscribe("gina@fh.test", "klaviyo:unsubscribed");
  // A Klaviyo-webhook suppression for an email Firehall never collected (shared Klaviyo account).
  await recordUnsubscribe("other-brand@lights.test", "klaviyo:unsubscribed");
  await sql(`INSERT INTO auth_magic_links (token_hash, email, expires_at) VALUES ('h2', '=HYPERLINK@fh.test', now())`);
  for (let i = 0; i < 120; i++) {
    await recordEmailLeadCapture({ email: `bulk${String(i).padStart(3, "0")}@fh.test`, source: "generator" });
  }

  const before = await snapshot();

  // ---- Directory matches independent SQL ----
  const all = await queryEmailDirectory({ all: true });
  const [{ n: expectedUnique }] = await sql<{ n: number }>(
    `SELECT count(*)::int AS n FROM (
       SELECT lower(email) e FROM users WHERE is_guest = 0 AND email IS NOT NULL
       UNION SELECT email FROM email_lead_captures
       UNION SELECT lower(email) FROM auth_magic_links
       UNION SELECT email FROM user_marketing_consent WHERE consent_captured_at IS NOT NULL
     ) s`,
  );
  assert.equal(all.total, expectedUnique, "unique email count matches SQL union");
  assert.equal(all.summary.total_unique_emails, expectedUnique);
  assert.equal(new Set(all.emails.map((e) => e.email)).size, all.emails.length, "no duplicate emails");
  assert.ok(!all.emails.some((e) => e.email === "other-brand@lights.test"), "Klaviyo-only suppression excluded");

  const [{ n: expectedRegistered }] = await sql<{ n: number }>(
    `SELECT count(*)::int AS n FROM users WHERE is_guest = 0 AND email IS NOT NULL AND email <> ''`,
  );
  assert.equal(all.summary.registered_users, expectedRegistered, "registered count matches users table");
  const [{ n: expectedSubscribed }] = await sql<{ n: number }>(
    `SELECT count(*)::int AS n FROM user_marketing_consent WHERE marketing_consent = 1 AND unsubscribed_at IS NULL`,
  );
  assert.equal(all.summary.marketing_subscribers, expectedSubscribed, "subscriber count matches consent table");
  assert.equal(all.summary.registered_and_subscribed, 1);
  assert.equal(
    all.summary.registered_users + (all.summary.marketing_subscribers - all.summary.registered_and_subscribed) + all.summary.other_emails,
    all.summary.total_unique_emails,
    "categories partition the directory",
  );

  const byEmail = new Map(all.emails.map((e) => [e.email, e]));
  assert.equal(byEmail.get("alice@fh.test")?.category, "registered_user");
  assert.equal(byEmail.get("alice@fh.test")?.consent, "subscribed");
  assert.equal(byEmail.get("bob@fh.test")?.consent, "not_consented", "Klaviyo list membership is not consent");
  assert.equal(byEmail.get("bob@fh.test")?.klaviyo_sync, "sent");
  const carol = byEmail.get("carol@fh.test");
  assert.equal(carol?.category, "registered_user", "mixed-case account email merges with lead");
  assert.deepEqual(carol?.sources, ["account_email", "generator"]);
  assert.equal(byEmail.get("dave@fh.test")?.category, "marketing_subscriber");
  assert.deepEqual(byEmail.get("erin@fh.test")?.sources, ["red_lead", "shopping_list"]);
  assert.equal(byEmail.get("erin@fh.test")?.category, "other");
  assert.equal(byEmail.get("frank@fh.test")?.category, "other");
  assert.deepEqual(byEmail.get("frank@fh.test")?.sources, ["sign_in_request"]);
  assert.equal(byEmail.get("gina@fh.test")?.consent, "unsubscribed");
  assert.equal(byEmail.get("gina@fh.test")?.category, "other", "unsubscribed is not a subscriber");

  // ---- Filters, search, source ----
  assert.equal((await queryEmailDirectory({ filter: "registered_users", all: true })).total, expectedRegistered);
  assert.equal((await queryEmailDirectory({ filter: "marketing_subscribers", all: true })).total, expectedSubscribed);
  assert.equal((await queryEmailDirectory({ filter: "unsubscribed", all: true })).total, 1);
  assert.equal((await queryEmailDirectory({ filter: "other_emails", all: true })).total, all.summary.other_emails);
  assert.deepEqual((await queryEmailDirectory({ q: "ERIN" })).emails.map((e) => e.email), ["erin@fh.test"]);
  assert.deepEqual((await queryEmailDirectory({ q: "alice captain" })).emails.map((e) => e.email), ["alice@fh.test"]);
  const redLead = await queryEmailDirectory({ source: "red_lead", all: true });
  assert.deepEqual(redLead.emails.map((e) => e.email), ["erin@fh.test"]);

  // ---- Pagination ----
  const seen = new Set<string>();
  for (let p = 1; p <= Math.ceil(all.total / 50); p++) {
    const page = await queryEmailDirectory({ page: p, page_size: 50 });
    assert.equal(page.total, all.total);
    assert.equal(page.page, p);
    for (const e of page.emails) {
      assert.ok(!seen.has(e.email), `email repeated across pages: ${e.email}`);
      seen.add(e.email);
    }
  }
  assert.equal(seen.size, all.total, "pages cover every email exactly once");
  const beyond = await queryEmailDirectory({ page: 999, page_size: 50 });
  assert.equal(beyond.page, Math.ceil(all.total / 50), "out-of-range page clamps to last page");
  assert.equal((await queryEmailDirectory({ page_size: 10_000 })).page_size, 200, "page size capped");

  // ---- Export ----
  const csv = emailDirectoryCsv(all.emails);
  assert.equal(csv.trim().split("\n").length - 1, all.total, "CSV has one line per email");
  assert.ok(csv.includes("'=hyperlink@fh.test"), "formula-looking cells are neutralised");
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell("+1"), "'+1");

  // ---- Registered users ----
  const users = await queryRegisteredUsers({ all: true });
  const [{ n: expectedNonGuest }] = await sql<{ n: number }>(`SELECT count(*)::int AS n FROM users WHERE is_guest = 0`);
  assert.equal(users.total, expectedNonGuest);
  assert.equal(users.summary.total, expectedNonGuest);
  const plan = new Map(users.users.map((u) => [u.user_id, u.plan]));
  assert.equal(plan.get("u_henry"), "pro", "active Stripe subscription");
  assert.equal(plan.get("u_ivan"), "pro", "active trial");
  assert.equal(plan.get("u_jack"), "free", "expired trial");
  assert.equal(plan.get("u_kate"), "pro", "past_due inside grace period");
  assert.equal(plan.get("u_liam"), "free", "past_due beyond grace period");
  assert.equal(users.summary.pro, 3);
  assert.equal(users.summary.subscribed, 1);
  assert.equal((await queryRegisteredUsers({ filter: "pro", all: true })).total, 3);
  assert.equal((await queryRegisteredUsers({ filter: "new_7d", all: true })).total, 3);
  assert.equal((await queryRegisteredUsers({ filter: "active_30d", all: true })).total, 1);
  assert.equal(users.users.find((u) => u.user_id === "u_carol")?.email, "carol@fh.test");
  assert.equal(users.users.find((u) => u.user_id === "u_bob")?.consent, "not_consented");
  assert.equal(registeredUsersCsv(users.users).trim().split("\n").length - 1, users.total);

  // ---- Reads never modify data ----
  assert.equal(await snapshot(), before, "listing, filtering and exporting changed no rows");

  // ---- HTTP routes ----
  const app = express();
  app.use(express.json());
  registerAdminUsersRoutes(app);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const signups = await (await fetch(`${base}/api/admin/signups?page=2&page_size=25`)).json();
    assert.equal(signups.total, all.total);
    assert.equal(signups.emails.length, 25);
    assert.equal(signups.page, 2);
    const exportRes = await fetch(`${base}/api/admin/signups/export?filter=marketing_subscribers`);
    assert.equal(exportRes.status, 200);
    assert.equal((await exportRes.text()).trim().split("\n").length - 1, expectedSubscribed);
    const usersRes = await (await fetch(`${base}/api/admin/users?filter=pro`)).json();
    assert.equal(usersRes.total, 3);
    const usersCsv = await (await fetch(`${base}/api/admin/users/export`)).text();
    assert.equal(usersCsv.trim().split("\n").length - 1, expectedNonGuest);

    const detail = await fetch(`${base}/api/admin/users/u_henry`);
    assert.equal(detail.status, 200, "Postgres-only user detail loads");
    const detailJson = await detail.json();
    assert.equal(detailJson.user.email, "henry@fh.test");
    assert.equal(detailJson.billing.personal_plan, "firefighter_plus");
    assert.equal((await fetch(`${base}/api/admin/users/u_guest`)).status, 404, "guests are not registered users");

    const klaviyo = await fetch(`${base}/api/admin/users/u_bob/klaviyo`, { method: "POST" });
    assert.equal(klaviyo.status, 409, "cannot push a non-consented user to Klaviyo");
    assert.equal(await snapshot(), before, "HTTP reads and a refused Klaviyo push changed no rows");
  } finally {
    server.close();
  }

  // ---- Capture path persists to Postgres without consent ----
  await captureEmailLead({ email: "New.Lead@FH.test", source: "shopping-list", marketing_consent: false });
  const [capture] = await sql<{ source: string; submission_count: number; first_captured_at: Date }>(
    `SELECT source, submission_count, first_captured_at FROM email_lead_captures WHERE email = 'new.lead@fh.test'`,
  );
  assert.equal(capture?.source, "shopping_list");
  assert.equal(capture?.submission_count, 1);
  assert.equal(
    (await sql(`SELECT 1 FROM user_marketing_consent WHERE email = 'new.lead@fh.test'`)).length,
    0,
    "a capture without opt-in records no consent",
  );
  await captureEmailLead({ email: "new.lead@fh.test", source: "shopping_list" });
  const [again] = await sql<{ submission_count: number; first_captured_at: Date }>(
    `SELECT submission_count, first_captured_at FROM email_lead_captures WHERE email = 'new.lead@fh.test'`,
  );
  assert.equal(again?.submission_count, 2);
  assert.equal(new Date(again!.first_captured_at).getTime(), new Date(capture!.first_captured_at).getTime());

  // ---- Legacy import is insert-only and idempotent ----
  const legacyCsv = [
    "lead_id,email,source,signup_form,captured_at,converted,hall_created,last_activity,klaviyo_synced",
    "a1,Legacy@FH.test,generator,email-recipe,2026-11-06T18:45:27.831Z,no,no,2026-11-06T18:45:27.831Z,no",
    'a2,"erin@fh.test",shopping_list,,2020-01-01T00:00:00.000Z,no,no,,yes',
  ].join("\n");
  const legacyRows = parseLegacyLeadsCsv(legacyCsv);
  assert.equal(legacyRows.length, 2);
  const [erinBefore] = await sql(`SELECT * FROM email_lead_captures WHERE email = 'erin@fh.test' AND source = 'shopping_list'`);
  const exec = (text: string, params: unknown[]) => testPg.query(text, params);
  assert.equal(await importLegacyLeads(legacyRows, exec), 1, "only the new email is inserted");
  assert.equal(await importLegacyLeads(legacyRows, exec), 0, "re-running inserts nothing");
  const [erinAfter] = await sql(`SELECT * FROM email_lead_captures WHERE email = 'erin@fh.test' AND source = 'shopping_list'`);
  assert.deepEqual(erinAfter, erinBefore, "existing lead row untouched by import");
  const [legacy] = await sql<{ first_captured_at: Date; imported_from: string }>(
    `SELECT first_captured_at, imported_from FROM email_lead_captures WHERE email = 'legacy@fh.test'`,
  );
  assert.equal(new Date(legacy!.first_captured_at).toISOString(), "2026-11-06T18:45:27.831Z");
  assert.equal(legacy?.imported_from, "sqlite_email_leads");
  assert.equal((await sql(`SELECT 1 FROM user_marketing_consent WHERE email = 'legacy@fh.test'`)).length, 0);

  console.log("[test-admin-email-directory] OK");
  releaseSqliteTimersForTests();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
