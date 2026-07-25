#!/usr/bin/env tsx
/**
 * Validates Linked Hall copy and section labels.
 */
import assert from "node:assert/strict";
import { HALL_DASHBOARD, HALL_IDENTITY } from "../client/src/lib/brand-copy.ts";
import { ANALYTICS_EVENT_TYPES } from "../shared/analytics/events.js";

function main(): void {
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_dashboard_viewed"));

  assert.equal(HALL_DASHBOARD.title, "Hall");
  assert.equal(HALL_DASHBOARD.myHall, "My Hall");
  assert.equal(HALL_IDENTITY.myHall, "My Hall");
  assert.equal(HALL_IDENTITY.stationNotSet, "Station not set");
  assert.equal(HALL_IDENTITY.unassignedManager, "No canteen manager assigned");
  assert.equal(HALL_DASHBOARD.tonight, "Tonight");
  assert.equal(HALL_DASHBOARD.tonightsMeal, "Tonight");
  assert.equal(HALL_DASHBOARD.lastMeals, "Hall Meal History");
  assert.equal(HALL_DASHBOARD.lastMealsCooked, "Recently cooked");
  assert.equal(HALL_DASHBOARD.hallFavorites, "Crew favorites");
  assert.equal(HALL_DASHBOARD.needAnything, "Need Anything?");
  assert.equal(HALL_DASHBOARD.quickActions, "Crew collaboration");
  assert.equal(HALL_DASHBOARD.actions.pickMeal, "Pick Meal");
  assert.equal(HALL_DASHBOARD.actions.spinWheel, "Spin Wheel");
  assert.equal(HALL_DASHBOARD.actions.sharedList, "Shared Shopping List");
  assert.equal(HALL_DASHBOARD.actions.cookMode, "Cook Mode");

  console.log("[test-hall-dashboard] OK");
}

main();
