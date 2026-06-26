#!/usr/bin/env tsx
/**
 * Validates internal product analytics store — schema, ingest, dashboard aggregates.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ANALYTICS_EVENT_TYPES } from "../shared/analytics/events.js";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import {
  bindAnalyticsDb,
  getAnalyticsDashboard,
  getHallOfFame,
  insertAnalyticsEvents,
  insertAnalyticsTestEvents,
} from "../server/analytics/analytics-store.js";

const MIGRATION_SQL = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "013_analytics_events.sql"),
  "utf8",
);

const tmpDb = path.join(os.tmpdir(), `fh-analytics-validate-${Date.now()}.db`);

async function main(): Promise<void> {
  assert.ok(ANALYTICS_EVENT_TYPES.includes("page_view"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("meal_generated"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("wheel_spin"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("email_capture"));

  assert.ok(ANALYTICS_EVENT_TYPES.includes("meal_cooked"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_of_fame_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("account_created"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("login"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("profile_updated"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_created"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_updated"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shift_created"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_joined"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_invite_sent"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_invite_accepted"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_activation_started"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_onboarding_started"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("personal_onboarding_started"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("personal_onboarding_step_completed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("personal_onboarding_completed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("personal_onboarding_hall_choice"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_activation_completed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_first_invite_sent"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_first_vote_created"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shared_shopping_list_created"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shared_shopping_list_updated"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shared_shopping_list_exported"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shared_shopping_list_completed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_supply_updated"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_supply_restocked"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_supply_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("canteen_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("canteen_item_reported"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("canteen_item_low"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("canteen_item_out"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("canteen_item_requested"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("canteen_item_purchased"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("canteen_item_restocked"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("canteen_manager_assigned"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shift_reminder_sent"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shift_reminder_opened"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shift_reminder_clicked"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_analytics_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("growth_dashboard_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("plan_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("plan_selected"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("paywall_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_pro_enabled"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_pro_trial_started"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_pro_converted"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_program_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_program_started"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("sync_completed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("sync_failed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("admin_signups_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("admin_signup_opened"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("admin_signups_exported"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_dashboard_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shift_dashboard_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shift_meal_selected"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shift_vote_created"));

  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_SQL);
  bindAnalyticsDb(db);

  const sessionId = "validate-session";
  const visitorId = "validate-visitor";

  const testInserted = insertAnalyticsTestEvents(sessionId, visitorId);
  assert.equal(testInserted, 7);

  insertAnalyticsEvents(
    [
      {
        event_type: "meal_generation_started",
        visitor_id: visitorId,
        route: "/generator",
        metadata: { protein: "chicken" },
      },
      {
        event_type: "explore_filter",
        visitor_id: visitorId,
        route: "/explore",
        metadata: { filter_key: "primary:bbq_grill", filter_label: "BBQ & Grill", category: "bbq_grill" },
      },
      {
        event_type: "explore_recipe_click",
        visitor_id: visitorId,
        route: "/explore",
        metadata: { recipe_slug: "jerk-chicken", recipe_title: "Jerk Chicken" },
      },
    ],
    sessionId,
  );

  const dash = getAnalyticsDashboard("all");
  assert.ok(dash.summary.page_views >= 1, "page_view counted");
  assert.ok(dash.summary.recipe_views >= 1, "recipe_view counted");
  assert.ok(dash.summary.meal_generations >= 1, "meal_generated counted");
  assert.ok(dash.summary.wheel_spins >= 1, "wheel_spin counted");
  assert.ok(dash.summary.email_captures >= 1, "email_capture counted");
  assert.ok(dash.top_viewed_recipes.length >= 1);
  assert.ok(dash.top_explore_filters.length >= 1);
  assert.ok(dash.top_explore_clicks.length >= 1);
  assert.ok(dash.generation_success_rate > 0);

  const hof = getHallOfFame("all");
  assert.ok(hof.most_cooked.length >= 1, "meal_cooked ranked");
  assert.ok(hof.most_voted.length >= 1, "hall_vote_submitted ranked");
  assert.ok(hof.most_wheel.length >= 1, "wheel_spin ranked");

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[validate-analytics] OK");
}

main().catch((err) => {
  console.error("[validate-analytics] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
