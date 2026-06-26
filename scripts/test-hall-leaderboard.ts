#!/usr/bin/env tsx
/**
 * Validates internal hall leaderboard aggregation (analytics only — no product UI).
 */
import assert from "node:assert/strict";
import { buildHallLeaderboard } from "../shared/hall-leaderboard/aggregate.ts";
import type { HallActivityEvent } from "../shared/hall-analytics/types.js";

function event(
  partial: Partial<HallActivityEvent> & Pick<HallActivityEvent, "event_type" | "occurred_at">,
): HallActivityEvent {
  return {
    activity_id: "1",
    hall_id: "h1",
    user_id: null,
    external_id: partial.external_id ?? "e1",
    title: partial.title ?? "Test",
    recipe_slug: partial.recipe_slug ?? null,
    cuisine: null,
    category: null,
    shift_label: partial.shift_label ?? null,
    ...partial,
  };
}

function main(): void {
  const now = new Date("2026-06-22T12:00:00.000Z");
  const events: HallActivityEvent[] = [
    ...Array.from({ length: 12 }, (_, i) =>
      event({
        event_type: "meal_cooked",
        external_id: `meal-${i}`,
        title: i < 8 ? "Jerk Chicken & Rice and Peas" : "Steak Sandwiches",
        recipe_slug: i < 8 ? "jerk-chicken" : "steak-sandwiches",
        shift_label: "A Shift",
        occurred_at: `2026-06-${String(10 + (i % 10)).padStart(2, "0")}T18:00:00.000Z`,
      }),
    ),
    ...Array.from({ length: 5 }, (_, i) =>
      event({
        event_type: "vote_created",
        external_id: `vote-${i}`,
        title: "Tonight's hall dinner vote",
        shift_label: "C Shift",
        occurred_at: `2026-06-${String(12 + i).padStart(2, "0")}T19:00:00.000Z`,
      }),
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      event({
        event_type: "wheel_spin",
        external_id: `wheel-${i}`,
        title: "Wheel spin",
        shift_label: "B Shift",
        occurred_at: `2026-06-${String(15 + i).padStart(2, "0")}T20:00:00.000Z`,
      }),
    ),
  ];

  const board = buildHallLeaderboard(events, now);
  assert.equal(board.most_active_shifts[0]?.label, "A Shift");
  assert.equal(board.most_active_shifts[0]?.count, 12);
  assert.equal(board.top_voted_shifts[0]?.label, "C Shift");
  assert.equal(board.top_voted_shifts[0]?.count, 5);
  assert.equal(board.wheel_champion?.label, "B Shift");
  assert.equal(board.most_cooked_meals[0]?.label, "Jerk Chicken & Rice and Peas");
  assert.equal(board.most_cooked_meals[0]?.count, 8);

  console.log("[test-hall-leaderboard] OK");
}

main();
