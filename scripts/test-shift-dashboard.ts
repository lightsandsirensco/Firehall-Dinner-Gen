#!/usr/bin/env tsx
/**
 * Validates Shift Dashboard copy, history helpers, and analytics events.
 */
import assert from "node:assert/strict";
import { SHIFT_DASHBOARD } from "../client/src/lib/brand-copy.ts";
import { ANALYTICS_EVENT_TYPES } from "../shared/analytics/events.js";
import type { HallHistoryEntry } from "../shared/hall-profile/types.js";
import {
  computeLongestMealStreak,
  countShiftMealsThisMonth,
  countShiftVotesThisMonth,
  filterHistoryForShift,
  getShiftMostCookedMeals,
  shiftLabelMatches,
} from "../shared/shift-dashboard/history.ts";

function entry(
  partial: Partial<HallHistoryEntry> & Pick<HallHistoryEntry, "type" | "title" | "at">,
): HallHistoryEntry {
  return {
    id: partial.id ?? "e1",
    source: partial.source ?? "test",
    shiftLabel: partial.shiftLabel,
    recipeSlug: partial.recipeSlug,
    ...partial,
  };
}

function main(): void {
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shift_dashboard_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shift_meal_selected"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("shift_vote_created"));

  assert.equal(SHIFT_DASHBOARD.recentlyCooked, "Recently Cooked");
  assert.equal(SHIFT_DASHBOARD.mostCookedMeal, "Most Cooked Meal");
  assert.equal(SHIFT_DASHBOARD.currentShoppingList, "Current Shopping List");
  assert.equal(SHIFT_DASHBOARD.actions.createVote, "Create Hall Vote");
  assert.equal(SHIFT_DASHBOARD.actions.reportCanteen, "Hall Staples");
  assert.equal(SHIFT_DASHBOARD.backToHall, "Linked Hall");
  assert.equal(SHIFT_DASHBOARD.stats.longestMealStreak, "Longest meal streak");

  const shiftName = "A Shift";
  const entries: HallHistoryEntry[] = [
    entry({
      id: "1",
      type: "meal_cooked",
      title: "Tacos",
      at: "2026-06-20T18:00:00.000Z",
      shiftLabel: "A Shift",
      recipeSlug: "tacos",
    }),
    entry({
      id: "2",
      type: "meal_cooked",
      title: "Tacos",
      at: "2026-06-21T18:00:00.000Z",
      shiftLabel: "A Shift",
      recipeSlug: "tacos",
    }),
    entry({
      id: "3",
      type: "hall_vote",
      title: "Vote",
      at: "2026-06-21T19:00:00.000Z",
      shiftLabel: "A Shift",
    }),
    entry({
      id: "4",
      type: "meal_cooked",
      title: "Pasta",
      at: "2026-06-15T18:00:00.000Z",
      shiftLabel: "B Shift",
    }),
  ];

  assert.equal(shiftLabelMatches(entries[0]!, shiftName), true);
  assert.equal(filterHistoryForShift(entries, shiftName).length, 3);
  assert.equal(getShiftMostCookedMeals(entries, shiftName, 1)[0]?.cookCount, 2);
  assert.equal(computeLongestMealStreak(entries, shiftName), 2);
  assert.equal(countShiftMealsThisMonth(entries, shiftName) >= 2, true);
  assert.equal(countShiftVotesThisMonth(entries, shiftName) >= 1, true);

  console.log("[test-shift-dashboard] OK");
}

main();
