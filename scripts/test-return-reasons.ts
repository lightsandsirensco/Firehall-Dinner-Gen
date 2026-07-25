#!/usr/bin/env tsx
import assert from "node:assert/strict";
import { buildReturnReasons } from "../client/src/lib/home/return-reasons.ts";
import type { RitualSnapshot } from "../client/src/lib/home/shift-ritual.ts";

function main(): void {
  const decide: RitualSnapshot = {
    dinnerTitle: null,
    voteOpen: false,
    pendingItems: 0,
    shoppingHref: "/hall",
    hasHall: true,
  };
  const decideReasons = buildReturnReasons(decide, { savedCount: 2, suggestCount: 1 });
  assert.ok(decideReasons.some((r) => r.id === "dinner_unset" && r.primary));
  assert.ok(decideReasons.some((r) => r.id === "favorites"));
  assert.ok(decideReasons.some((r) => r.id === "suggested"));

  const openLoops: RitualSnapshot = {
    dinnerTitle: "Chili",
    voteOpen: true,
    voteHref: "/vote/1",
    pendingItems: 2,
    shoppingHref: "/shop",
    recipeCookHref: "/recipes/chili?cook=1",
    hasHall: true,
  };
  const open = buildReturnReasons(openLoops, { savedCount: 0, suggestCount: 0, phase: "vote" });
  assert.ok(open.some((r) => r.id === "vote_open" && r.primary));
  assert.ok(open.some((r) => r.id === "shopping"));

  console.log("[test-return-reasons] OK");
}

main();
