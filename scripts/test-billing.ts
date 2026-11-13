#!/usr/bin/env tsx
/**
 * Validates billing store — plans, subscriptions, permissions, feature flags —
 * against the real Postgres migrations (PGlite).
 */
import "./lib/pglite-test-db.js";
import assert from "node:assert/strict";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";
import { upsertEmailUser } from "../server/auth/auth-store.js";
import {
  adminSetPlanEnabled,
  adminSetUserPlan,
  adminTogglePlanFeature,
  getPlanCatalog,
  initBillingStore,
  resolveUserBilling,
  selectUserPlan,
  userHasFeature,
} from "../server/billing/store.js";
import { hasFeature } from "../shared/billing/types.js";

async function main(): Promise<void> {
  await initBillingStore();

  const guest = await resolveUserBilling(null, { is_guest: true });
  assert.equal(guest.effective_plan_id, "guest");
  assert.equal(guest.features.generator, true);
  assert.equal(guest.features.cross_device_saves, false);
  assert.equal(guest.features.hall_dashboard, false);

  const { user } = await upsertEmailUser("billing@test.firehall");
  const personal = await resolveUserBilling(user.user_id);
  assert.equal(personal.effective_plan_id, "personal");
  assert.equal(personal.features.cross_device_saves, true);
  assert.equal(personal.features.hall_analytics, false);
  assert.equal(personal.features.hall_dashboard, true);
  // "personal" is the free plan — it must NOT carry any Plus-only entitlement.
  assert.equal(personal.features.advanced_search, false);
  assert.equal(personal.features.nutrition, false);
  assert.equal(personal.features.unlimited_saved_meals, false);

  assert.equal(await selectUserPlan(user.user_id, "hall_pro"), null);
  // Self-select must never grant the paid tier — only Stripe or an admin grant can.
  assert.equal(await selectUserPlan(user.user_id, "firefighter_plus"), null);
  const selected = await selectUserPlan(user.user_id, "personal");
  assert.ok(selected);
  assert.equal(selected!.effective_plan_id, "personal");

  await adminTogglePlanFeature("personal", "grocery_exports", false);
  const downgraded = await resolveUserBilling(user.user_id);
  assert.equal(downgraded.features.grocery_exports, false);

  await adminSetPlanEnabled("hall_pro", false);
  const catalogDisabled = (await getPlanCatalog()).find((p) => p.plan_id === "hall_pro");
  assert.equal(catalogDisabled?.enabled, false);
  await adminSetPlanEnabled("hall_pro", true);

  await adminSetUserPlan(user.user_id, "personal");
  const granted = await resolveUserBilling(user.user_id);
  assert.equal(granted.effective_plan_id, "personal");
  assert.equal(await userHasFeature(user.user_id, "hall_analytics"), false);

  await adminSetUserPlan(user.user_id, "firefighter_plus");
  const pro = await resolveUserBilling(user.user_id);
  assert.equal(pro.effective_plan_id, "firefighter_plus");
  assert.equal(pro.features.advanced_search, true);
  assert.equal(pro.features.nutrition, true);
  assert.equal(pro.features.unlimited_saved_meals, true);
  // Pro is a strict superset of Personal — it keeps the free feature set too.
  assert.equal(pro.features.cross_device_saves, true);
  assert.equal(pro.features.hall_dashboard, true);
  assert.equal(await userHasFeature(user.user_id, "advanced_search"), true);

  const catalog = await getPlanCatalog();
  assert.equal(catalog.length, 4);
  assert.ok(catalog.some((p) => p.plan_id === "firefighter_plus" && p.enabled));
  assert.ok(hasFeature(personal.features, "generator"));

  releaseSqliteTimersForTests();
  console.log("[test-billing] OK");
}

main().catch((err) => {
  console.error("[test-billing] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
