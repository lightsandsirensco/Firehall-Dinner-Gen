#!/usr/bin/env tsx
/**
 * External (Klaviyo-only) contacts on /admin/signups: only profiles with
 * Firehall evidence are listed, Lights & Sirens and unattributed profiles are
 * counted but excluded, emails already in Postgres are never double-counted,
 * list membership never becomes consent, the Postgres directory totals are
 * unchanged, and nothing is written to Postgres.
 */
import { testPg } from "./lib/pglite-test-db.js";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import { recordConsentOptIn } from "../server/marketing-consent/store.js";
import { queryEmailDirectory } from "../server/admin-users/email-directory.js";
import {
  classifyKlaviyoContacts,
  externalContactsCsv,
  queryExternalContacts,
  setKlaviyoSnapshotFetcherForTests,
  type KlaviyoProfileLite,
  type KlaviyoSnapshot,
} from "../server/admin-users/klaviyo-contacts.js";
import { registerAdminUsersRoutes } from "../server/admin-users/routes.js";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";

async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await testPg.query(text, params)).rows as T[];
}

function profile(id: string, email: string | null, extra: Partial<KlaviyoProfileLite> = {}): KlaviyoProfileLite {
  return {
    id,
    email,
    first_name: null,
    last_name: null,
    created: "2026-10-01T00:00:00Z",
    updated: "2026-10-02T00:00:00Z",
    properties: {},
    email_consent: "NEVER_SUBSCRIBED",
    email_consent_method: null,
    email_consented_at: null,
    suppressed: false,
    ...extra,
  };
}

const SNAPSHOT: KlaviyoSnapshot = {
  fetched_at: "2026-11-11T00:00:00Z",
  firehall_list_found: true,
  event_evidence_available: true,
  profiles: [
    profile("p_member", "Alice@FH.test"), // in Postgres (registered) and on list
    profile("p_list", "lead1@fh.test", { first_name: "Lee" }), // Klaviyo-only, list member, no consent
    profile("p_props", "lead2@fh.test", { properties: { account_status: "registered" } }),
    profile("p_events", "lead3@fh.test"),
    profile("p_both", "both@fh.test", { properties: { "Shopify Tags": "" } }), // list + Shopify
    profile("p_sub", "sub@fh.test", { email_consent: "SUBSCRIBED", email_consent_method: "Website form" }),
    profile("p_supp", "supp@fh.test", { email_consent: "SUBSCRIBED", suppressed: true }),
    profile("p_shop", "shopper@ls.test", { properties: { "Shopify Tags": "", "Accepts Marketing": true } }),
    profile("p_none", "mystery@x.test"),
    profile("p_noemail", null),
  ],
  firehall_list_member_ids: new Set(["p_member", "p_list", "p_both", "p_sub", "p_supp"]),
  firehall_event_profile_ids: new Set(["p_events"]),
};

async function main(): Promise<void> {
  await sql(`INSERT INTO users (user_id, email, auth_provider, is_guest) VALUES ('u_alice', 'alice@fh.test', 'email', 0)`);
  await recordConsentOptIn({ email: "optin@fh.test", source: "homepage" });

  // ---- Pure classification ----
  const pgEmails = new Set(["alice@fh.test", "optin@fh.test"]);
  const { rows, summary } = classifyKlaviyoContacts(SNAPSHOT, pgEmails);
  assert.deepEqual(summary, {
    klaviyo_profiles: 10,
    already_in_postgres: 1,
    firehall_klaviyo_only: 6,
    firehall_klaviyo_only_subscribed: 1,
    excluded_lights_sirens: 1,
    excluded_unattributed: 1,
    no_email: 1,
    duplicate_profiles: 0,
  });
  const total =
    summary.already_in_postgres + summary.firehall_klaviyo_only + summary.excluded_lights_sirens +
    summary.excluded_unattributed + summary.no_email + summary.duplicate_profiles;
  assert.equal(total, summary.klaviyo_profiles, "every Klaviyo profile is in exactly one bucket");

  const byEmail = new Map(rows.map((r) => [r.email, r]));
  assert.ok(!byEmail.has("alice@fh.test"), "Postgres emails are never listed as external");
  assert.ok(!byEmail.has("shopper@ls.test"), "Lights & Sirens-only contacts are excluded");
  assert.ok(!byEmail.has("mystery@x.test"), "profiles without Firehall evidence are excluded");
  assert.deepEqual(byEmail.get("lead2@fh.test")?.evidence, ["firehall_app_properties"]);
  assert.deepEqual(byEmail.get("lead3@fh.test")?.evidence, ["firehall_events"]);
  assert.equal(byEmail.get("both@fh.test")?.also_lights_sirens, true, "shared contacts are flagged");
  assert.equal(byEmail.get("lead1@fh.test")?.klaviyo_email_consent, "NEVER_SUBSCRIBED", "list membership is not consent");
  assert.equal(byEmail.get("supp@fh.test")?.klaviyo_suppressed, true);

  const noEvents = classifyKlaviyoContacts({ ...SNAPSHOT, firehall_event_profile_ids: new Set() }, pgEmails);
  assert.equal(noEvents.summary.excluded_unattributed, 2, "without event access, event-only profiles stay unattributed");

  // ---- Query layer against Postgres; directory totals unaffected ----
  const directoryBefore = (await queryEmailDirectory({ all: true })).summary;
  const before = JSON.stringify(await sql(`SELECT email, marketing_consent, unsubscribed_at FROM user_marketing_consent ORDER BY email`));
  const userCount = (await sql<{ n: number }>(`SELECT count(*)::int AS n FROM users`))[0]!.n;

  setKlaviyoSnapshotFetcherForTests(async () => SNAPSHOT);
  const all = await queryExternalContacts({ all: true });
  assert.equal(all.available, true);
  assert.equal(all.postgres_unique_emails, 2);
  assert.equal(all.total, 6);
  assert.equal((await queryExternalContacts({ filter: "klaviyo_subscribed", all: true })).total, 1, "suppressed is not subscribed");
  assert.equal((await queryExternalContacts({ filter: "also_lights_sirens", all: true })).total, 1);
  assert.equal((await queryExternalContacts({ q: "LEE", all: true })).total, 1, "search matches name case-insensitively");
  const p2 = await queryExternalContacts({ page: 2, page_size: 4 });
  assert.equal(p2.contacts.length, 2);
  assert.equal(p2.page, 2);

  const csv = externalContactsCsv(all.contacts);
  assert.equal(csv.trim().split("\n").length, 7);
  assert.ok(csv.split("\n").slice(1, -1).every((l) => l.includes("external_klaviyo_only")), "every CSV row is labelled external");

  assert.deepEqual((await queryEmailDirectory({ all: true })).summary, directoryBefore, "Postgres directory counts are unchanged");
  assert.equal(JSON.stringify(await sql(`SELECT email, marketing_consent, unsubscribed_at FROM user_marketing_consent ORDER BY email`)), before);
  assert.equal((await sql<{ n: number }>(`SELECT count(*)::int AS n FROM users`))[0]!.n, userCount, "no Klaviyo contact imported");

  // ---- Unavailable Klaviyo degrades without touching the Postgres directory ----
  setKlaviyoSnapshotFetcherForTests(async () => {
    throw new Error("Klaviyo GET externalContacts.profiles failed (503)");
  });
  const down = await queryExternalContacts({});
  assert.equal(down.available, false);
  assert.equal(down.summary, null);
  assert.equal(down.postgres_unique_emails, 2);

  // ---- HTTP routes ----
  setKlaviyoSnapshotFetcherForTests(async () => SNAPSHOT);
  const app = express();
  app.use(express.json());
  registerAdminUsersRoutes(app);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const res = await (await fetch(`${base}/api/admin/signups/external?filter=bogus&page_size=2`)).json();
    assert.equal(res.filter, "all", "unknown filters fall back to all");
    assert.equal(res.total, 6);
    assert.equal(res.contacts.length, 2);
    const exportRes = await fetch(`${base}/api/admin/signups/external/export?filter=klaviyo_subscribed`);
    assert.equal(exportRes.status, 200);
    assert.ok((await exportRes.text()).includes("sub@fh.test"));
    const signups = await (await fetch(`${base}/api/admin/signups?page_size=200`)).json();
    assert.equal(signups.summary.total_unique_emails, 2, "the Postgres directory never includes external contacts");
  } finally {
    server.close();
  }

  setKlaviyoSnapshotFetcherForTests(null);
  console.log("[test-admin-external-contacts] OK");
  releaseSqliteTimersForTests();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
