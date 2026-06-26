#!/usr/bin/env tsx
/**
 * Validates hall analytics aggregation and activity sync.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb, upsertEmailUser } from "../server/auth/auth-store.js";
import { bindHallMembershipDb, createHall, joinHall } from "../server/hall-membership/store.js";
import { bindBillingDb, enableHallPro } from "../server/billing/store.js";
import {
  bindHallAnalyticsDb,
  getHallAnalytics,
  syncHallActivity,
  upsertHallActivity,
} from "../server/hall-analytics/store.js";
import { buildHallAnalyticsPayload, computeMealStreak } from "../shared/hall-analytics/aggregate.js";
import type { HallActivityEvent } from "../shared/hall-analytics/types.js";
import { userHasFeature } from "../server/billing/store.js";

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

const tmpDb = path.join(os.tmpdir(), `fh-hall-analytics-${Date.now()}.db`);

async function main(): Promise<void> {
  const sampleEvents: HallActivityEvent[] = [
    {
      activity_id: "1",
      hall_id: "h1",
      user_id: "u1",
      event_type: "meal_cooked",
      external_id: "a",
      title: "Chili",
      recipe_slug: "chili",
      cuisine: "American",
      category: null,
      shift_label: "A Shift",
      occurred_at: "2026-06-20T18:00:00.000Z",
    },
    {
      activity_id: "2",
      hall_id: "h1",
      user_id: "u1",
      event_type: "meal_cooked",
      external_id: "b",
      title: "Chili",
      recipe_slug: "chili",
      cuisine: "American",
      category: null,
      shift_label: "A Shift",
      occurred_at: "2026-06-21T18:00:00.000Z",
    },
    {
      activity_id: "3",
      hall_id: "h1",
      user_id: "u2",
      event_type: "vote_created",
      external_id: "v1",
      title: "Tonight vote",
      recipe_slug: null,
      cuisine: null,
      category: null,
      shift_label: "B Shift",
      occurred_at: "2026-06-21T19:00:00.000Z",
    },
    {
      activity_id: "4",
      hall_id: "h1",
      user_id: "u2",
      event_type: "wheel_spin",
      external_id: "w1",
      title: "Wheel",
      recipe_slug: null,
      cuisine: null,
      category: null,
      shift_label: "B Shift",
      occurred_at: "2026-06-21T20:00:00.000Z",
    },
    {
      activity_id: "5",
      hall_id: "h1",
      user_id: "u1",
      event_type: "shopping_list_completed",
      external_id: "list1",
      title: "Grocery run",
      recipe_slug: null,
      cuisine: null,
      category: null,
      shift_label: "A Shift",
      occurred_at: "2026-06-21T21:00:00.000Z",
    },
  ];

  const payload = buildHallAnalyticsPayload("h1", sampleEvents);
  assert.equal(payload.metrics.meals_cooked, 2);
  assert.equal(payload.metrics.votes_created, 1);
  assert.equal(payload.metrics.wheel_spins, 1);
  assert.equal(payload.metrics.shopping_lists, 1);
  assert.equal(payload.cards.top_meal?.label, "Chili");
  assert.equal(payload.cards.top_cuisine?.label, "American");
  assert.equal(computeMealStreak(sampleEvents), 2);

  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_014);
  db.exec(MIGRATION_015);
  db.exec(MIGRATION_016);
  db.exec(MIGRATION_021);
  db.exec(MIGRATION_022);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);
  bindHallAnalyticsDb(db);

  const captain = upsertEmailUser("captain@firehall.test").user;
  const member = upsertEmailUser("member@firehall.test").user;
  const detail = createHall(captain.user_id, {
    hall_name: "Engine 12",
    station_number: "12",
    department: "City Fire",
    crew_size: 8,
    shift_names: ["A Shift"],
    appliances: ["stove"],
  });
  joinHall(member.user_id, { join_code: detail.hall.join_code });
  const hallId = detail.hall.hall_id;

  assert.equal(userHasFeature(captain.user_id, "hall_analytics", { hall_id: hallId }), false);
  enableHallPro(hallId, captain.user_id);
  assert.equal(userHasFeature(captain.user_id, "hall_analytics", { hall_id: hallId }), false);
  assert.equal(userHasFeature(captain.user_id, "shared_shopping_lists", { hall_id: hallId }), true);

  syncHallActivity(hallId, captain.user_id, [
    {
      external_id: "meal-1",
      event_type: "meal_cooked",
      title: "Chicken Parm",
      recipe_slug: "chicken-parm",
      cuisine: "Italian",
      shift_label: "A Shift",
      occurred_at: "2026-06-22T12:00:00.000Z",
    },
    {
      external_id: "vote-1",
      event_type: "vote_created",
      title: "Dinner vote",
      shift_label: "A Shift",
      occurred_at: "2026-06-22T13:00:00.000Z",
    },
  ], ["2026-06-21"]);

  upsertHallActivity(hallId, captain.user_id, {
    event_type: "shopping_list_completed",
    external_id: "list-abc",
    title: "Saturday run",
    occurred_at: "2026-06-22T14:00:00.000Z",
  });

  const analytics = getHallAnalytics(hallId);
  assert.equal(analytics.metrics.meals_cooked, 1);
  assert.equal(analytics.metrics.votes_created, 1);
  assert.equal(analytics.metrics.wheel_spins, 1);
  assert.equal(analytics.metrics.shopping_lists, 1);
  assert.equal(analytics.cards.top_meal?.label, "Chicken Parm");

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[test-hall-analytics] OK");
}

main().catch((err) => {
  console.error("[test-hall-analytics] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
