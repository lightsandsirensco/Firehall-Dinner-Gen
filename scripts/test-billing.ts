#!/usr/bin/env tsx

/**

 * Validates billing store — plans, subscriptions, permissions, feature flags.

 */

import assert from "node:assert/strict";

import fs from "node:fs";

import os from "node:os";

import path from "node:path";

import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";

import { bindAuthDb, upsertEmailUser } from "../server/auth/auth-store.js";

import { bindHallMembershipDb } from "../server/hall-membership/store.js";

import {

  adminSetPlanEnabled,

  adminSetUserPlan,

  adminTogglePlanFeature,

  bindBillingDb,

  getPlanCatalog,

  resolveUserBilling,

  selectUserPlan,

  userHasFeature,

} from "../server/billing/store.js";

import { hasFeature } from "../shared/billing/types.js";



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

const MIGRATION_042 = fs.readFileSync(

  path.join(process.cwd(), "server", "db", "migrations", "042_firefighter_plus_plan.sql"),

  "utf8",

);



const tmpDb = path.join(os.tmpdir(), `fh-billing-validate-${Date.now()}.db`);



async function main(): Promise<void> {

  const db = await openSqliteDatabase(tmpDb);

  db.exec(MIGRATION_014);

  db.exec(MIGRATION_015);

  db.exec(MIGRATION_016);

  db.exec(MIGRATION_042);

  bindAuthDb(db);

  bindHallMembershipDb(db);

  bindBillingDb(db);



  const guest = resolveUserBilling(null, { is_guest: true });

  assert.equal(guest.effective_plan_id, "guest");

  assert.equal(guest.features.generator, true);

  assert.equal(guest.features.cross_device_saves, false);

  assert.equal(guest.features.hall_dashboard, false);



  const { user } = upsertEmailUser("billing@test.firehall");

  const personal = resolveUserBilling(user.user_id);

  assert.equal(personal.effective_plan_id, "personal");

  assert.equal(personal.features.cross_device_saves, true);

  assert.equal(personal.features.hall_analytics, false);

  assert.equal(personal.features.hall_dashboard, true);

  // "personal" is the free plan — it must NOT carry any Plus-only entitlement.
  assert.equal(personal.features.advanced_search, false);
  assert.equal(personal.features.nutrition, false);
  assert.equal(personal.features.unlimited_saved_meals, false);



  assert.equal(selectUserPlan(user.user_id, "hall_pro"), null);
  // Self-select must never grant the paid tier — no payment processing exists yet.
  assert.equal(selectUserPlan(user.user_id, "firefighter_plus"), null);



  const selected = selectUserPlan(user.user_id, "personal");

  assert.ok(selected);

  assert.equal(selected!.effective_plan_id, "personal");



  adminTogglePlanFeature("personal", "grocery_exports", false);

  const downgraded = resolveUserBilling(user.user_id);

  assert.equal(downgraded.features.grocery_exports, false);



  adminSetPlanEnabled("hall_pro", false);

  const catalogDisabled = getPlanCatalog().find((p) => p.plan_id === "hall_pro");

  assert.equal(catalogDisabled?.enabled, false);



  adminSetPlanEnabled("hall_pro", true);

  adminSetUserPlan(user.user_id, "personal");

  const granted = resolveUserBilling(user.user_id);

  assert.equal(granted.effective_plan_id, "personal");



  assert.equal(userHasFeature(user.user_id, "hall_analytics"), false);



  // Admin/dev grant is the only way to reach firefighter_plus (entitlement
  // testing / monetization validation — no Stripe yet).
  adminSetUserPlan(user.user_id, "firefighter_plus");

  const pro = resolveUserBilling(user.user_id);

  assert.equal(pro.effective_plan_id, "firefighter_plus");

  assert.equal(pro.features.advanced_search, true);

  assert.equal(pro.features.nutrition, true);

  assert.equal(pro.features.unlimited_saved_meals, true);

  // Pro is a strict superset of Personal — it keeps the free feature set too.
  assert.equal(pro.features.cross_device_saves, true);

  assert.equal(pro.features.hall_dashboard, true);

  assert.equal(userHasFeature(user.user_id, "advanced_search"), true);



  const catalog = getPlanCatalog();

  assert.equal(catalog.length, 4);

  assert.ok(catalog.some((p) => p.plan_id === "firefighter_plus" && p.enabled));

  assert.ok(hasFeature(personal.features, "generator"));



  try {

    fs.unlinkSync(tmpDb);

  } catch {

    /* ignore */

  }



  releaseSqliteTimersForTests();

  console.log("[test-billing] OK");

}



main().catch((err) => {

  console.error("[test-billing] FAILED", err);

  releaseSqliteTimersForTests();

  process.exit(1);

});

