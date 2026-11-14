#!/usr/bin/env tsx
/**
 * Pro early-access waitlist: durable Postgres signup (PGlite), duplicate
 * handling, Klaviyo sync/retry/suppression against a fake Klaviyo (no network),
 * separation from newsletter consent, HTTP routes, and admin counts.
 */
import { testPg } from "./lib/pglite-test-db.js";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import cookieParser from "cookie-parser";
import { attachAuthUser } from "../server/auth/auth-middleware.js";
import { createAuthSession, getAuthCookieName, upsertEmailUser } from "../server/auth/auth-store.js";
import { recordConsentOptIn, recordUnsubscribe } from "../server/marketing-consent/store.js";
import {
  joinProWaitlist,
  getProWaitlistEntry,
  processProWaitlistSyncQueue,
  syncProWaitlistEntry,
} from "../server/pro-waitlist/store.js";
import { registerProWaitlistRoutes } from "../server/pro-waitlist/routes.js";
import { queryEmailDirectory } from "../server/admin-users/email-directory.js";
import { captureEmailLead } from "../server/admin-users/routes.js";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";
import { initCacheStore } from "../server/cache-store.js";

// ---- Fake Klaviyo: every a.klaviyo.com call is answered here, nothing leaves the process.
const realFetch = globalThis.fetch;
type Mode = "ok" | "down";
let klaviyoMode: Mode = "ok";
const suppressedInKlaviyo = new Set<string>();
const klaviyoCalls: Array<{ method: string; path: string; body: any }> = [];
globalThis.fetch = (async (input: any, init?: any) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.hostname === "127.0.0.1" || url.hostname === "localhost") return realFetch(input, init);
  assert.equal(url.hostname, "a.klaviyo.com", `unexpected outbound request to ${url.hostname}`);
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  klaviyoCalls.push({ method: init?.method ?? "GET", path: url.pathname, body });
  const json = (status: number, data: unknown) =>
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  if (klaviyoMode === "down") return json(503, { errors: [{ title: "Unavailable", detail: "down" }] });
  if (url.pathname === "/api/lists/") return json(200, { data: [{ id: "WAITLIST1" }] });
  if (url.pathname === "/api/profiles/") {
    const email = /equals\(email,"(.+)"\)/.exec(url.searchParams.get("filter") ?? "")?.[1] ?? "";
    if (suppressedInKlaviyo.has(email)) {
      return json(200, { data: [{ attributes: { subscriptions: { email: { marketing: { consent: "UNSUBSCRIBED", suppression: [{ reason: "USER_SUPPRESSED" }] } } } } }] });
    }
    return json(200, { data: [] });
  }
  return json(202, { data: {} });
}) as typeof fetch;
process.env.KLAVIYO_API_KEY = "pk_test_fake_never_sent";

const subscribeJobsFor = (email: string) =>
  klaviyoCalls.filter(
    (c) =>
      c.path === "/api/profile-subscription-bulk-create-jobs/" &&
      c.body?.data?.attributes?.profiles?.data?.[0]?.attributes?.email === email,
  );

async function consentRow(email: string) {
  return (await testPg.query(`SELECT * FROM user_marketing_consent WHERE email = $1`, [email])).rows[0];
}

async function main(): Promise<void> {
  await initCacheStore();
  // 1. Join + duplicate: original timestamp/source preserved, email normalized.
  const first = await joinProWaitlist({ email: "Alice@FH.test ", source: "plans_page" });
  assert.equal(first.status, "joined");
  assert.equal(first.entry.email, "alice@fh.test");
  const again = await joinProWaitlist({ email: "alice@fh.test", source: "paywall:plan_ahead" });
  assert.equal(again.status, "already_joined");
  assert.equal(again.entry.joined_at, first.entry.joined_at);
  assert.equal(again.entry.source, "plans_page");
  assert.equal((await testPg.query(`SELECT count(*)::int AS n FROM pro_waitlist_signups`)).rows[0].n, 1);
  assert.equal(first.entry.consent_scope, "pro_launch_notifications");

  // 2. Waitlist is not newsletter consent.
  assert.equal(await consentRow("alice@fh.test"), undefined, "joining the waitlist must not record marketing consent");

  // 3. Klaviyo down: row stays durable and pending; retry worker syncs it later.
  klaviyoMode = "down";
  assert.equal(await syncProWaitlistEntry("alice@fh.test", 0), "pending");
  let row = (await testPg.query(`SELECT * FROM pro_waitlist_signups WHERE email = 'alice@fh.test'`)).rows[0];
  assert.equal(row.klaviyo_status, "pending");
  assert.equal(row.klaviyo_attempts, 1);
  assert.ok(row.klaviyo_last_error);
  klaviyoMode = "ok";
  await testPg.query(`UPDATE pro_waitlist_signups SET klaviyo_next_attempt_at = now() - interval '1 minute'`);
  assert.equal(await processProWaitlistSyncQueue(), 1);
  assert.equal((await getProWaitlistEntry("alice@fh.test"))?.klaviyo_status, "synced");
  const job = subscribeJobsFor("alice@fh.test")[0];
  assert.ok(job, "subscription job sent");
  assert.equal(job.body.data.relationships.list.data.id, "WAITLIST1", "goes to the Pro waitlist list, not the newsletter list");
  assert.equal(await processProWaitlistSyncQueue(), 0, "synced rows are not retried");

  // 4. Suppressed in Klaviyo: never resubscribed.
  suppressedInKlaviyo.add("gone@fh.test");
  await joinProWaitlist({ email: "gone@fh.test", source: "plans_page" });
  assert.equal(await syncProWaitlistEntry("gone@fh.test", 0), "skipped_suppressed");
  assert.equal(subscribeJobsFor("gone@fh.test").length, 0);

  // 5. Unsubscribed locally: no Klaviyo call at all.
  await recordConsentOptIn({ email: "unsub@fh.test", source: "homepage" });
  await recordUnsubscribe("unsub@fh.test", "klaviyo:unsubscribed");
  await joinProWaitlist({ email: "unsub@fh.test", source: "plans_page" });
  const before = klaviyoCalls.length;
  assert.equal(await syncProWaitlistEntry("unsub@fh.test", 0), "skipped_suppressed");
  assert.equal(klaviyoCalls.length, before);
  assert.ok((await consentRow("unsub@fh.test")).unsubscribed_at, "unsubscribe left intact");

  // 6. HTTP routes.
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachAuthUser);
  registerProWaitlistRoutes(app);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const csrf = { "Content-Type": "application/json", "X-CSRF-Token": "t", Cookie: "csrf_token=t" };
  const post = (body: unknown, cookie = "") =>
    fetch(`${base}/api/pro-waitlist`, {
      method: "POST",
      headers: { ...csrf, Cookie: `csrf_token=t${cookie ? `; ${cookie}` : ""}` },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await fetch(`${base}/api/pro-waitlist`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 403, "CSRF required");
    assert.equal((await post({ source: "plans_page" })).status, 400, "signed-out needs an email");
    assert.equal((await post({ email: "not-an-email", source: "plans_page" })).status, 400);

    const created = await post({ email: "bob@fh.test", source: "plans_page", newsletter_opt_in: true });
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.equal(createdBody.status, "joined");
    assert.equal(createdBody.newsletter, "subscribed");
    assert.equal((await consentRow("bob@fh.test")).marketing_consent, 1, "explicit newsletter box records consent");
    assert.equal((await consentRow("bob@fh.test")).consent_source, "pro_waitlist");

    // Signed-in: account email is used, body email ignored; duplicate reports accurately.
    const { user } = await upsertEmailUser("carol@fh.test");
    const session = await createAuthSession(user.user_id, false);
    const authCookie = `${getAuthCookieName()}=${session.token}`;
    const status0 = await (await fetch(`${base}/api/pro-waitlist/status`, { headers: { Cookie: authCookie } })).json();
    assert.deepEqual(
      { signed_in: status0.signed_in, account_email: status0.account_email, joined: status0.joined },
      { signed_in: true, account_email: "carol@fh.test", joined: false },
      "signed-in users are not auto-registered",
    );
    const joined = await (await post({ email: "someone-else@fh.test", source: "paywall:plan_ahead" }, authCookie)).json();
    assert.equal(joined.email, "carol@fh.test");
    assert.equal(joined.newsletter, "not_requested");
    assert.equal(await consentRow("carol@fh.test"), undefined);
    assert.equal((await getProWaitlistEntry("carol@fh.test"))?.user_id, user.user_id);
    const dup = await post({ source: "plans_page" }, authCookie);
    assert.equal(dup.status, 200);
    assert.equal((await dup.json()).status, "already_joined");
    const status1 = await (await fetch(`${base}/api/pro-waitlist/status`, { headers: { Cookie: authCookie } })).json();
    assert.equal(status1.joined, true);
  } finally {
    server.close();
  }
  await new Promise((r) => setTimeout(r, 300)); // let fire-and-forget syncs settle

  // 7. Admin directory distinguishes waitlist from newsletter subscribers.
  const dir = await queryEmailDirectory({ all: true });
  const byEmail = new Map(dir.emails.map((r) => [r.email, r]));
  assert.equal(dir.summary.pro_waitlist, 5);
  assert.equal(byEmail.get("alice@fh.test")?.pro_waitlist, true);
  assert.equal(byEmail.get("alice@fh.test")?.consent, "not_consented", "waitlist-only is not a marketing subscriber");
  assert.equal(byEmail.get("bob@fh.test")?.consent, "subscribed");
  assert.equal((await queryEmailDirectory({ filter: "pro_waitlist", all: true })).total, 5);

  // 8. Newsletter capture (homepage/footer path) reports whether Postgres saved it.
  assert.equal(await captureEmailLead({ email: "dan@fh.test", source: "newsletter", marketing_consent: true }), true);
  await testPg.query(`ALTER TABLE email_lead_captures RENAME TO email_lead_captures_off`);
  try {
    assert.equal(
      await captureEmailLead({ email: "erin@fh.test", source: "newsletter", marketing_consent: true }),
      false,
      "a failed durable write must not be reported as saved",
    );
  } finally {
    await testPg.query(`ALTER TABLE email_lead_captures_off RENAME TO email_lead_captures`);
  }

  console.log("pro-waitlist: all checks passed");
}

main()
  .then(() => {
    releaseSqliteTimersForTests();
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
