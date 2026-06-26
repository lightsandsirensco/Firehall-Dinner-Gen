#!/usr/bin/env tsx

/**

 * Validates hall growth dashboard aggregates — North Star, cohorts, metrics, and charts.

 */

import assert from "node:assert/strict";

import fs from "node:fs";

import os from "node:os";

import path from "node:path";

import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";

import { bindAnalyticsDb, insertAnalyticsEvents } from "../server/analytics/analytics-store.js";

import { bindAuthDb, upsertEmailUser } from "../server/auth/auth-store.js";

import { bindHallMembershipDb, createHall } from "../server/hall-membership/store.js";

import { bindHallAnalyticsDb, upsertHallActivity } from "../server/hall-analytics/store.js";

import { bindGrowthDashboardDb, getGrowthDashboard } from "../server/growth-dashboard/store.js";

import {

  GROWTH_NORTH_STAR_LABEL,

  GROWTH_CHART_RANGES,

} from "../shared/growth-dashboard/types.js";



const MIGRATION_013 = fs.readFileSync(

  path.join(process.cwd(), "server", "db", "migrations", "013_analytics_events.sql"),

  "utf8",

);

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

const MIGRATION_021 = fs.readFileSync(

  path.join(process.cwd(), "server", "db", "migrations", "021_hall_analytics.sql"),

  "utf8",

);

const MIGRATION_022 = fs.readFileSync(

  path.join(process.cwd(), "server", "db", "migrations", "022_hall_identity.sql"),

  "utf8",

);



const tmpDb = path.join(os.tmpdir(), `fh-growth-dashboard-${Date.now()}.db`);



async function main(): Promise<void> {

  const db = await openSqliteDatabase(tmpDb);

  db.exec(MIGRATION_013);

  db.exec(MIGRATION_014);

  db.exec(MIGRATION_015);

  db.exec(MIGRATION_016);

  db.exec(MIGRATION_021);

  db.exec(MIGRATION_022);



  bindAnalyticsDb(db);

  bindAuthDb(db);

  bindHallMembershipDb(db);

  bindHallAnalyticsDb(db);

  bindGrowthDashboardDb(db);



  const user = upsertEmailUser("growth@test.com").user;



  const hall = createHall(user.user_id, { hall_name: "Station 1", shift_names: ["A Shift"] });

  const hallId = hall.hall.hall_id;



  const createdMs = Date.now() - 35 * 86_400_000;

  const createdAt = new Date(createdMs).toISOString();

  db.prepare(`UPDATE halls SET created_at = ? WHERE hall_id = ?`).run(createdAt, hallId);



  insertAnalyticsEvents([

    {

      event_type: "hall_activation_completed",

      metadata: { hall_id: hallId },

    },

    {

      event_type: "hall_vote_started",

      metadata: { hall_id: hallId, shift_label: "A Shift" },

    },

    {

      event_type: "shared_shopping_list_completed",

      metadata: { hall_id: hallId, list_id: "list-1" },

    },

    {

      event_type: "hall_pro_trial_started",

      metadata: { hall_id: hallId },

    },

  ]);



  const weekActivityDaysAfterCreation = [1, 8, 15, 22];

  for (const day of weekActivityDaysAfterCreation) {

    upsertHallActivity(hallId, user.user_id, {

      event_type: "meal_cooked",

      external_id: `meal-${day}`,

      title: "Chili",

      recipe_slug: "chili",

      cuisine: "American",

      category: null,

      shift_label: "A Shift",

      occurred_at: new Date(createdMs + day * 86_400_000).toISOString(),

    });

  }



  upsertHallActivity(hallId, "u1", {

    event_type: "vote_created",

    external_id: "vote-1",

    title: "Tonight",

    recipe_slug: null,

    cuisine: null,

    category: null,

    shift_label: "A Shift",

    occurred_at: new Date(createdMs + 2 * 86_400_000).toISOString(),

  });



  db.prepare(

    `INSERT INTO hall_subscriptions (hall_id, plan_id, status, source, updated_at)

     VALUES (?, 'hall_pro', 'active', 'admin_grant', datetime('now'))`,

  ).run(hallId);



  const dash = getGrowthDashboard("all", "7d");



  assert.equal(dash.north_star.label, GROWTH_NORTH_STAR_LABEL);

  assert.equal(dash.north_star.count, 1);

  assert.equal(dash.cohorts.length, 4);

  assert.equal(dash.cohorts[0].label, "Week 1");

  assert.equal(dash.cohorts[3].label, "Week 4");

  assert.equal(dash.cohorts[0].active_halls, 1);

  assert.equal(dash.cohorts[3].active_halls, 1);



  assert.ok(dash.metrics.active_halls >= 1);

  assert.ok(dash.metrics.active_shifts >= 1);

  assert.ok(dash.metrics.hall_votes >= 1);

  assert.ok(dash.metrics.meals_generated >= 4);

  assert.ok(dash.metrics.shopping_lists >= 1);

  assert.ok(dash.metrics.hall_pro_trials >= 1);

  assert.equal(dash.metrics.hall_pro_conversions, 1);



  assert.equal(dash.chart.length, 7);

  assert.ok(GROWTH_CHART_RANGES.includes("90d"));



  const chart90 = getGrowthDashboard("all", "90d");

  assert.equal(chart90.chart.length, 90);



  console.log("[test-growth-dashboard] OK");

  releaseSqliteTimersForTests();

}



main().catch((err) => {

  console.error("[test-growth-dashboard] FAILED", err);

  releaseSqliteTimersForTests();

  process.exit(1);

});


