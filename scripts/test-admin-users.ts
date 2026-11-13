#!/usr/bin/env tsx
/**
 * Legacy SQLite admin pieces still served by /api/admin/leads and the founder
 * leads view. Accounts are Postgres-only now, so the SQLite users table is
 * empty: notes/pilot flags must refuse (route returns 409) instead of writing
 * orphan rows, and user detail falls back to Postgres. The Postgres-backed
 * /admin/users and /admin/signups are covered by test-admin-email-directory.ts.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindHallMembershipDb } from "../server/hall-membership/store.js";
import { bindAdminUsersDb, getAdminUserDetail, updateAdminUserMeta } from "../server/admin-users/store.js";
import { bindAdminLeadsDb, listEmailLeads, recordEmailLead } from "../server/admin-users/leads-store.js";
import { bindFounderLeadsDb, exportFounderLeadsCsv, listFounderLeads } from "../server/admin-users/founder-leads.js";

const MIGRATIONS = [
  "014_user_accounts.sql",
  "015_hall_membership.sql",
  "016_billing.sql",
  "018_hall_shopping_lists.sql",
  "021_hall_analytics.sql",
  "022_hall_identity.sql",
  "023_hall_pro_subscription.sql",
  "025_admin_users_leads.sql",
  "039_founder_leads_meta.sql",
  "043_email_marketing_consent.sql",
].map((name) => fs.readFileSync(path.join(process.cwd(), "server", "db", "migrations", name), "utf8"));

const tmpDb = path.join(os.tmpdir(), `fh-admin-users-${Date.now()}.db`);

async function main(): Promise<void> {
  const db = await openSqliteDatabase(tmpDb);
  for (const sql of MIGRATIONS) db.exec(sql);
  bindHallMembershipDb(db);
  bindAdminUsersDb(db);
  bindAdminLeadsDb(db);
  bindFounderLeadsDb(db);

  recordEmailLead({ email: "lead@firehall.test", source: "homepage", klaviyo_synced: true });
  recordEmailLead({ email: "LEAD@firehall.test", source: "generator" });
  recordEmailLead({ email: "other@firehall.test", source: "shopping_list" });

  const leads = listEmailLeads("all", 50);
  assert.equal(leads.filter((l) => l.email === "lead@firehall.test").length, 2, "one lead row per source");
  assert.ok(leads.every((l) => !l.converted_to_user), "no SQLite users, so nothing converts");
  assert.equal(listEmailLeads("homepage", 50).length, 1);

  const founder = listFounderLeads({ q: "lead@firehall.test" });
  assert.equal(founder.total, 1, "duplicate emails merge into one founder lead");
  assert.ok(founder.leads[0]?.sources.includes("homepage"));
  assert.ok(founder.leads[0]?.sources.includes("generator"));
  assert.equal(founder.leads[0]?.account_created, false);
  assert.equal(listFounderLeads({}).total, 2);
  const csv = exportFounderLeadsCsv();
  assert.ok(csv.includes("lead@firehall.test") && csv.includes("other@firehall.test"));

  const postgresOnlyUser = "u_postgres_only";
  assert.throws(
    () => updateAdminUserMeta(postgresOnlyUser, { internal_notes: "note", is_pilot_lead: true }),
    /User not found/,
    "notes/pilot flags refuse accounts missing from SQLite",
  );
  assert.equal(
    (db.prepare(`SELECT count(*) AS n FROM admin_user_meta`).get() as { n: number }).n,
    0,
    "no orphan admin_user_meta row is written",
  );
  assert.equal(getAdminUserDetail(postgresOnlyUser), null, "detail falls back to Postgres for such accounts");

  console.log("[test-admin-users] OK");
  releaseSqliteTimersForTests();
  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
