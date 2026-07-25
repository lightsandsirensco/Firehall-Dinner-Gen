#!/usr/bin/env tsx
/**
 * Validates admin users + email leads CRM store.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb, upsertEmailUser } from "../server/auth/auth-store.js";
import { bindHallMembershipDb, createHall } from "../server/hall-membership/store.js";
import { bindBillingDb } from "../server/billing/store.js";
import {
  bindAdminUsersDb,
  getAdminUserDetail,
  listAdminSignups,
  listAdminUsers,
  updateAdminUserMeta,
} from "../server/admin-users/store.js";
import {
  bindAdminLeadsDb,
  listEmailLeads,
  recordEmailLead,
  syncAllLeadConversions,
} from "../server/admin-users/leads-store.js";
import {
  bindFounderLeadsDb,
  exportFounderLeadsCsv,
  listFounderLeads,
} from "../server/admin-users/founder-leads.js";

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
].map((name) =>
  fs.readFileSync(path.join(process.cwd(), "server", "db", "migrations", name), "utf8"),
);

const tmpDb = path.join(os.tmpdir(), `fh-admin-users-${Date.now()}.db`);

async function main(): Promise<void> {
  const db = await openSqliteDatabase(tmpDb);
  for (const sql of MIGRATIONS) db.exec(sql);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);
  bindAdminUsersDb(db);
  bindAdminLeadsDb(db);
  bindFounderLeadsDb(db);

  recordEmailLead({ email: "lead@firehall.test", source: "homepage", klaviyo_synced: true });
  recordEmailLead({ email: "lead@firehall.test", source: "generator" });

  const user = upsertEmailUser("lead@firehall.test").user;
  syncAllLeadConversions();

  const leads = listEmailLeads("all", 50);
  assert.ok(leads.length >= 2);
  const converted = leads.find((l) => l.email === "lead@firehall.test" && l.source === "homepage");
  assert.ok(converted?.converted_to_user);
  assert.equal(converted?.converted_user_id, user.user_id);

  const founder = listFounderLeads({ q: "lead@firehall.test" });
  assert.equal(founder.total, 1, "duplicate emails should merge into one founder lead");
  assert.ok(founder.leads[0]?.account_created);
  assert.ok(founder.leads[0]?.sources.includes("homepage"));
  assert.ok(founder.leads[0]?.sources.includes("generator"));
  assert.ok(founder.analytics.total_emails >= 1);
  assert.ok(exportFounderLeadsCsv().includes("lead@firehall.test"));

  const captain = upsertEmailUser("captain@firehall.test").user;
  createHall(captain.user_id, {
    hall_name: "Station 7",
    station_number: "7",
    department: "City",
    crew_size: 6,
    shift_names: ["A"],
    appliances: ["stove"],
  });

  const allUsers = listAdminUsers("all", 100);
  assert.ok(allUsers.users.some((u) => u.user_id === captain.user_id));
  assert.ok(allUsers.users.some((u) => u.user_id === user.user_id));

  updateAdminUserMeta(user.user_id, { internal_notes: "Pilot contact", is_pilot_lead: true });
  const detail = getAdminUserDetail(user.user_id);
  assert.ok(detail);
  assert.equal(detail.internal_notes, "Pilot contact");
  assert.equal(detail.is_pilot_lead, true);
  assert.ok(detail.klaviyo.on_list);

  const pilotUsers = listAdminUsers("pilot_leads", 100);
  assert.ok(pilotUsers.users.some((u) => u.user_id === user.user_id));

  const allSignups = listAdminSignups("all", { limit: 100 });
  assert.ok(allSignups.signups.some((s) => s.email === "captain@firehall.test"));
  assert.ok(allSignups.signups.some((s) => s.email === "lead@firehall.test"));

  const registeredOnly = listAdminSignups("registered_users", { limit: 100 });
  assert.ok(registeredOnly.signups.every((s) => s.account_type === "registered"));

  const joinedHall = listAdminSignups("joined_hall", { limit: 100 });
  assert.ok(joinedHall.signups.some((s) => s.email === "captain@firehall.test"));

  const searchByHall = listAdminSignups("all", { q: "Station 7", limit: 100 });
  assert.ok(searchByHall.signups.some((s) => s.hall_name === "Station 7"));

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
