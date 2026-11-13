#!/usr/bin/env tsx
/**
 * Validates hall-scoped Hall Pro billing — subscriptions, feature gates, trials —
 * against the real Postgres migrations (PGlite) plus SQLite Firehouse tables.
 */
import "./lib/pglite-test-db.js";
import assert from "node:assert/strict";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";
import { upsertEmailUser } from "../server/auth/auth-store.js";
import { createHall, initHallMembershipStore, joinHall } from "../server/hall-membership/store.js";
import {
  convertHallProTrial,
  enableHallPro,
  getPlanCatalog,
  initBillingStore,
  resolveUserBilling,
  selectUserPlan,
  startHallProTrial,
  userHasFeature,
} from "../server/billing/store.js";
import { HALL_PRO_FEATURES, isHallProFeature } from "../shared/billing/types.js";

async function main(): Promise<void> {
  await initHallMembershipStore();
  await initBillingStore();

  const guest = await resolveUserBilling(null, { is_guest: true });
  assert.equal(guest.effective_plan_id, "guest");
  assert.equal(guest.hall_pro_hall_ids.length, 0);
  assert.equal(guest.features.hall_analytics, false);
  assert.equal(guest.features.view_canteen, false);
  assert.equal(guest.features.hall_dashboard, false);

  const { user } = await upsertEmailUser("billing@test.firehall");
  const personal = await resolveUserBilling(user.user_id);
  assert.equal(personal.effective_plan_id, "personal");
  assert.equal(personal.features.cross_device_saves, true);
  assert.equal(personal.features.view_canteen, false);
  assert.equal(personal.features.meal_calendar, false);
  assert.equal(personal.features.hall_analytics, false);
  assert.equal(personal.features.hall_dashboard, true);
  assert.equal(personal.features.shared_shopping_lists, false);
  assert.equal(personal.features.canteen_management, false);
  assert.equal(await selectUserPlan(user.user_id, "hall_pro"), null);

  const captain = (await upsertEmailUser("captain@firehall.test")).user;
  const member = (await upsertEmailUser("member@firehall.test")).user;
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

  assert.equal(await userHasFeature(captain.user_id, "shared_shopping_lists", { hall_id: hallId }), false);
  assert.equal(await userHasFeature(member.user_id, "canteen_management", { hall_id: hallId }), false);
  assert.equal(await userHasFeature(member.user_id, "shared_shopping_lists", { hall_id: hallId }), false);

  const trial = startHallProTrial(hallId, captain.user_id);
  assert.equal(trial.status, "trialing");
  assert.ok(trial.trial_started_at);

  const captainBilling = await resolveUserBilling(captain.user_id);
  assert.ok(captainBilling.hall_pro_hall_ids.includes(hallId));
  assert.equal(await userHasFeature(captain.user_id, "shared_shopping_lists", { hall_id: hallId }), true);
  assert.equal(await userHasFeature(member.user_id, "hall_history", { hall_id: hallId }), true);
  for (const feature of HALL_PRO_FEATURES) {
    assert.ok(isHallProFeature(feature));
    assert.equal(await userHasFeature(captain.user_id, feature, { hall_id: hallId }), true);
  }

  const converted = convertHallProTrial(hallId, captain.user_id);
  assert.equal(converted?.status, "active");

  enableHallPro(hallId, captain.user_id);
  assert.equal(await userHasFeature(captain.user_id, "hall_grocery_planning", { hall_id: hallId }), true);
  assert.equal(await userHasFeature(captain.user_id, "hall_analytics", { hall_id: hallId }), false);
  assert.equal(await userHasFeature(captain.user_id, "shift_reports", { hall_id: hallId }), false);

  const catalog = await getPlanCatalog();
  const hallProPlan = catalog.find((p) => p.plan_id === "hall_pro");
  assert.ok(hallProPlan);
  assert.equal(hallProPlan!.display_name, "Hall Pro");
  assert.equal(hallProPlan!.features.length, HALL_PRO_FEATURES.length);
  // Postgres 0001 seeded "Guest" (SQLite 023's rename to "Free" was not
  // carried over); only /admin/billing shows this label — customers see PLAN_DISPLAY.
  const freePlan = catalog.find((p) => p.plan_id === "guest");
  assert.equal(freePlan?.display_name, "Guest");

  releaseSqliteTimersForTests();
  console.log("[test-hall-pro-billing] OK");
}

main().catch((err) => {
  console.error("[test-hall-pro-billing] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
