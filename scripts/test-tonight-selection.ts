/**
 * Tonight's meal is only what the user deliberately picked for the current
 * shift day — never a stale history entry. Run: npx tsx scripts/test-tonight-selection.ts
 */
import assert from "node:assert/strict";

const store = new Map<string, string>();
const events: string[] = [];
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  window: { dispatchEvent: (e: { type: string }) => void events.push(e.type) },
  Event: class {
    constructor(public type: string) {}
  },
});

const {
  clearTonightSelection,
  getTonightSelection,
  markTonightCookingStarted,
  setTonightSelection,
  stopTonightCooking,
  tonightShiftDate,
} = await import("../client/src/lib/tonight-selection-store.ts");

const at = (iso: string) => new Date(iso);

// Fresh user: nothing selected, regardless of any hall history.
assert.equal(getTonightSelection(), null);

// Shift day rolls over at 4am local, not midnight.
assert.equal(tonightShiftDate(at("2026-10-03T23:30:00")), "2026-10-03");
assert.equal(tonightShiftDate(at("2026-10-04T01:30:00")), "2026-10-03");
assert.equal(tonightShiftDate(at("2026-10-04T04:30:00")), "2026-10-04");

const picked = setTonightSelection(
  { source: "wheel", title: "  Carolina Pulled Pork ", recipeSlug: "Pulled-Pork", recipePath: "/recipes/pulled-pork" },
  at("2026-10-03T17:00:00"),
);
assert.equal(picked.title, "Carolina Pulled Pork");
assert.equal(picked.recipeSlug, "pulled-pork");
assert.ok(events.includes("tonight-selection-changed"));

assert.equal(getTonightSelection(at("2026-10-03T21:00:00"))?.title, "Carolina Pulled Pork");
assert.equal(getTonightSelection(at("2026-10-04T02:00:00"))?.title, "Carolina Pulled Pork");
// Next shift day: yesterday's pick must not resurface as tonight's meal.
assert.equal(getTonightSelection(at("2026-10-04T05:00:00")), null);
assert.equal(getTonightSelection(at("2026-10-10T18:00:00")), null);

// Cooking state is opt-in and reversible.
setTonightSelection({ source: "generator", title: "Chicken Fajitas" });
assert.equal(getTonightSelection()?.cookingStartedAt, undefined);
markTonightCookingStarted();
assert.ok(getTonightSelection()?.cookingStartedAt);
stopTonightCooking();
assert.equal(getTonightSelection()?.cookingStartedAt, undefined);

clearTonightSelection();
assert.equal(getTonightSelection(), null);

// Corrupt or old-schema data never produces a meal.
store.set("firehall_tonight_selection_v1", "{not json");
assert.equal(getTonightSelection(), null);
store.set("firehall_tonight_selection_v1", JSON.stringify({ version: 0, title: "Old", shiftDate: tonightShiftDate() }));
assert.equal(getTonightSelection(), null);

console.log("[test-tonight-selection] OK");
