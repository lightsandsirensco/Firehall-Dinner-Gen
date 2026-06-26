#!/usr/bin/env tsx
/**
 * Validates hall streak computation (internal analytics helpers — no product UI).
 */
import assert from "node:assert/strict";
import {
  buildHallStreaksSnapshot,
  computeLongestShiftStreak,
  shiftsInARowLabel,
} from "../shared/hall-streak/compute.ts";
import { computeShiftStreak } from "../shared/wheel-streak/streak-math.ts";
import type { HallHistoryEntry } from "../shared/hall-profile/types.js";

function entry(
  partial: Partial<HallHistoryEntry> & Pick<HallHistoryEntry, "type" | "at">,
): HallHistoryEntry {
  return {
    id: partial.id ?? "e1",
    title: partial.title ?? "Meal",
    source: partial.source ?? "test",
    shiftLabel: partial.shiftLabel,
    ...partial,
  };
}

function main(): void {
  assert.equal(shiftsInARowLabel(4), "4 shifts in a row");

  const hallDays = ["2026-06-19", "2026-06-20", "2026-06-21", "2026-06-22"];
  assert.equal(computeShiftStreak(new Set(hallDays)), 4);
  assert.equal(computeLongestShiftStreak(hallDays), 4);
  assert.equal(shiftsInARowLabel(4), "4 shifts in a row");

  const entries: HallHistoryEntry[] = [
    ...["2026-06-19", "2026-06-20", "2026-06-21", "2026-06-22"].map((day, index) =>
      entry({
        id: `hall-${index}`,
        type: "meal_cooked",
        at: `${day}T18:00:00.000Z`,
        shiftLabel: index < 2 ? "A Shift" : "B Shift",
      }),
    ),
    ...["2026-06-19", "2026-06-20", "2026-06-21", "2026-06-22"].map((day, index) =>
      entry({
        id: `a-${index}`,
        type: "meal_cooked",
        at: `${day}T19:00:00.000Z`,
        shiftLabel: "A Shift",
      }),
    ),
    entry({
      id: "vote-1",
      type: "hall_vote",
      at: "2026-06-22T19:00:00.000Z",
      shiftLabel: "C Shift",
    }),
  ];

  const snapshot = buildHallStreaksSnapshot({
    entries,
    wheelCurrent: 3,
    wheelLongest: 5,
    shiftLabel: "A Shift",
  });

  assert.equal(snapshot.hall.meals.current, 4);
  assert.equal(snapshot.shift?.label, "A Shift");
  assert.equal(snapshot.shift?.meals.current, 4);
  assert.equal(snapshot.hall.votes.current, 1);
  assert.equal(snapshot.hall.wheel.current, 3);

  console.log("[test-hall-streaks] OK");
}

main();
