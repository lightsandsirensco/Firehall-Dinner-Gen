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

  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_SQL);
  bindAnalyticsDb(db);

  const sessionId = "validate-session";
  const visitorId = "validate-visitor";

  const testInserted = insertAnalyticsTestEvents(sessionId, visitorId);
  assert.equal(testInserted, 5);

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
