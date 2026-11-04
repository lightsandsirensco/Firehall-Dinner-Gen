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
  getHallOfFame,
  insertAnalyticsEvents,
  insertAnalyticsTestEvents,
} from "../server/analytics/analytics-store.js";
import { getAnalyticsDashboard } from "../server/analytics/dashboard.js";

process.env.ANALYTICS_PG_MIRROR = "0";
delete process.env.DATABASE_URL;
delete process.env.KLAVIYO_API_KEY;
delete process.env.STRIPE_SECRET_KEY;

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
  assert.ok(ANALYTICS_EVENT_TYPES.includes("magic_link_requested"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("magic_link_sent"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("magic_link_failed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("magic_link_opened"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("magic_link_completed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("magic_link_expired"));
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

  // Seeded test events are tagged and must never reach the dashboard.
  const seededOnly = await getAnalyticsDashboard("all");
  assert.equal(seededOnly.audience.page_views, 0, "test page_view excluded");
  assert.equal(seededOnly.engagement.meals_generated, 0, "test meal_generated excluded");

  const real = "real-visitor-1";
  insertAnalyticsEvents(
    [
      { event_type: "page_view", visitor_id: real, route: "/", metadata: { traffic_source: "google", device_type: "mobile" } },
      { event_type: "page_view", visitor_id: real, route: "/recipes/chicken-parm?token=secret", metadata: { traffic_source: "google" } },
      { event_type: "page_view", visitor_id: real, route: "/admin/analytics", metadata: {} },
      { event_type: "recipe_view", visitor_id: real, route: "/recipes/chicken-parm", metadata: { recipe_slug: "chicken-parm", recipe_title: "Chicken Parm" } },
      { event_type: "meal_generated", visitor_id: real, route: "/generator", metadata: { recipe_title: "Real Meal" } },
      { event_type: "wheel_spin", visitor_id: real, route: "/classics-wheel", metadata: { recipe_slug: "jerk-chicken", recipe_title: "Jerk Chicken" } },
    ],
    "real-session",
  );

  const dash = await getAnalyticsDashboard("all");
  assert.equal(dash.audience.page_views, 2, "admin page view excluded");
  assert.equal(dash.audience.unique_visitors, 1);
  assert.equal(dash.audience.sessions, 1, "two quick page views = one session");
  assert.equal(dash.audience.traffic_sources[0]?.key, "google");
  assert.ok(dash.audience.top_pages.some((p) => p.key === "/recipes/chicken-parm"), "query string stripped");
  assert.equal(dash.engagement.recipe_views, 1);
  assert.equal(dash.engagement.meals_generated, 1);
  assert.equal(dash.engagement.wheel_spins, 1);
  assert.equal(dash.engagement.meal_generation_success_rate, 100);
  assert.equal(dash.growth.newsletter_subscribers_total, null, "unavailable without Postgres, not 0");
  assert.equal(dash.revenue.active_paid_subscribers, null, "unavailable without Stripe, not 0");
  assert.ok(dash.engagement.top_viewed_recipes.length >= 1);

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
