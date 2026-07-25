#!/usr/bin/env tsx
import assert from "node:assert/strict";
import {
  resolveRitualNextAction,
  resolveRitualPhase,
  ritualEyebrow,
  type RitualSnapshot,
} from "../client/src/lib/home/shift-ritual.ts";
import { buildRitualChecks } from "../client/src/lib/home/build-ritual-checks.ts";

function main(): void {
  const base: RitualSnapshot = {
    dinnerTitle: null,
    voteOpen: false,
    pendingItems: 0,
    shoppingHref: "/hall",
    hasHall: true,
  };

  assert.equal(resolveRitualPhase(base), "decide");
  assert.equal(resolveRitualNextAction(base).label, "Pick Tonight's Meal");

  const voting: RitualSnapshot = {
    ...base,
    dinnerTitle: "Chili",
    voteOpen: true,
    voteHref: "/vote/1",
  };
  assert.equal(resolveRitualPhase(voting), "vote");
  assert.equal(resolveRitualNextAction(voting).label, "Cast your vote");

  const shopping: RitualSnapshot = {
    ...base,
    dinnerTitle: "Chili",
    pendingItems: 3,
  };
  assert.equal(resolveRitualPhase(shopping), "shop");
  assert.match(resolveRitualNextAction(shopping).label, /Grab 3/);

  const cooking: RitualSnapshot = {
    ...base,
    dinnerTitle: "Chili",
    recipeCookHref: "/recipes/chili?cook=1",
  };
  assert.equal(resolveRitualPhase(cooking), "cook");
  assert.equal(resolveRitualNextAction(cooking).label, "Start cooking");

  const continuing: RitualSnapshot = {
    ...cooking,
    cookingInProgress: true,
    cookHref: "/recipes/chili?cook=1",
  };
  assert.equal(resolveRitualPhase(continuing), "continue");
  assert.equal(resolveRitualNextAction(continuing).label, "Continue cooking");

  assert.equal(ritualEyebrow(16), "Dinner window");
  assert.equal(ritualEyebrow(18), "Tonight's shift");

  const checks = buildRitualChecks(shopping);
  assert.equal(checks.length, 3);
  assert.equal(checks.find((c) => c.id === "shop")?.active, true);

  console.log("[test-shift-ritual] OK");
}

main();
