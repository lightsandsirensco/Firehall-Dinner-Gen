#!/usr/bin/env tsx

/**
 * Validates hall-scoped Hall Pro billing — subscriptions, feature gates, trials.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb, upsertEmailUser } from "../server/auth/auth-store.js";
import { bindHallMembershipDb, createHall, joinHall } from "../server/hall-membership/store.js";
import {
  bindBillingDb,
  convertHallProTrial,
  enableHallPro,
  getPlanCatalog,
  resolveUserBilling,
  selectUserPlan,
  startHallProTrial,
  userHasFeature,
} from "../server/billing/store.js";
import { HALL_PRO_FEATURES, isHallProFeature } from "../shared/billing/types.js";

const MIGRATION_014 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "014_user_accounts.sql"),
  "utf8",
);
const MIGRATION_015 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "015_hall_membership.sql"),
  "utf8",
);
const MIGRATION_016 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "016_billing.sql"),
  "utf8",
);
const MIGRATION_022 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "022_hall_identity.sql"),
  "utf8",
);
const MIGRATION_023 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "023_hall_pro_subscription.sql"),
  "utf8",
);

const tmpDb = path.join(os.tmpdir(), `fh-hall-pro-billing-${Date.now()}.db`);

async function main(): Promise<void> {
  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_014);
  db.exec(MIGRATION_015);
  db.exec(MIGRATION_016);
  db.exec(MIGRATION_022);
  db.exec(MIGRATION_023);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);

  const guest = resolveUserBilling(null, { is_guest: true });
  assert.equal(guest.effective_plan_id, "guest");
  assert.equal(guest.hall_pro_hall_ids.length, 0);
  assert.equal(guest.features.hall_analytics, false);
  assert.equal(guest.features.view_canteen, false);
  assert.equal(guest.features.hall_dashboard, false);

  const { user } = upsertEmailUser("billing@test.firehall");
  const personal = resolveUserBilling(user.user_id);
  assert.equal(personal.effective_plan_id, "personal");
  assert.equal(personal.features.cross_device_saves, true);
  assert.equal(personal.features.view_canteen, false);
  assert.equal(personal.features.meal_calendar, false);
  assert.equal(personal.features.hall_analytics, false);
  assert.equal(personal.features.hall_dashboard, true);
  assert.equal(personal.features.shared_shopping_lists, false);
  assert.equal(personal.features.canteen_management, false);

  assert.equal(selectUserPlan(user.user_id, "hall_pro"), null);

  const captain = upsertEmailUser("captain@firehall.test").user;
  const member = upsertEmailUser("member@firehall.test").user;
  const detail = createHall(captain.user_id, {
    hall_name: "Engine 7",
    station_number: "7",
    department: "City Fire",
    crew_size: 10,
    shift_names: ["A Shift"],
    appliances: ["stove"],
  });
  joinHall(member.user_id, { join_code: detail.hall.join_code });
  const hallId = detail.hall.hall_id;

  assert.equal(userHasFeature(captain.user_id, "shared_shopping_lists", { hall_id: hallId }), false);
  assert.equal(userHasFeature(member.user_id, "canteen_management", { hall_id: hallId }), false);
  assert.equal(userHasFeature(member.user_id, "shared_shopping_lists", { hall_id: hallId }), false);

  const trial = startHallProTrial(hallId, captain.user_id);
  assert.equal(trial.status, "trialing");
  assert.ok(trial.trial_started_at);

  const captainBilling = resolveUserBilling(captain.user_id);
  assert.ok(captainBilling.hall_pro_hall_ids.includes(hallId));
  assert.equal(userHasFeature(captain.user_id, "shared_shopping_lists", { hall_id: hallId }), true);
  assert.equal(userHasFeature(member.user_id, "hall_history", { hall_id: hallId }), true);

  for (const feature of HALL_PRO_FEATURES) {
    assert.ok(isHallProFeature(feature));
    assert.equal(userHasFeature(captain.user_id, feature, { hall_id: hallId }), true);
  }

  const converted = convertHallProTrial(hallId, captain.user_id);
  assert.equal(converted?.status, "active");

  enableHallPro(hallId, captain.user_id);
  assert.equal(userHasFeature(captain.user_id, "hall_grocery_planning", { hall_id: hallId }), true);
  assert.equal(userHasFeature(captain.user_id, "hall_analytics", { hall_id: hallId }), false);
  assert.equal(userHasFeature(captain.user_id, "shift_reports", { hall_id: hallId }), false);

  const catalog = getPlanCatalog();
  const hallProPlan = catalog.find((p) => p.plan_id === "hall_pro");
  assert.ok(hallProPlan);
  assert.equal(hallProPlan!.display_name, "Hall Pro");
  assert.equal(hallProPlan!.features.length, HALL_PRO_FEATURES.length);

  const freePlan = catalog.find((p) => p.plan_id === "guest");
  assert.equal(freePlan?.display_name, "Free");

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[test-hall-pro-billing] OK");
}

main().catch((err) => {
  console.error("[test-hall-pro-billing] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
