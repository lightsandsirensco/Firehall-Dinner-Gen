/**
 * Phase 11 — Premium Run It Back: source choice, copy rules, slot adaptation
 * across shift lengths, crew-size carry-over, hard-restriction flags,
 * refresh mode, Pro gating.
 * Run: npx tsx scripts/test-run-it-back.ts
 */
import assert from "node:assert/strict";
import type { PersonalSchedule, ScheduleOverride, ShiftInstance } from "../shared/schedule/types.ts";
import { getShiftsInRange } from "../shared/schedule/engine.ts";
import { mealSlotsForShift } from "../shared/schedule/meal-slots.ts";
import type { DietaryFilterKey, DietarySummary } from "../shared/dietary/schema.ts";
import { defaultSlotState } from "../shared/shift-plan/plan.ts";
import {
  carryCrewOverride,
  chooseRunItBackSource,
  hardFilterViolation,
  makeRecipeCheck,
  slotIdentity,
  type HardFilterRequest,
} from "../shared/shift-plan/run-it-back.ts";
import { runItBackSchema } from "../shared/shift-plan/schema.ts";
import type { PlannedRecipe, ShiftPlanSlotState } from "../shared/shift-plan/types.ts";
import { PLAN_BASE_FEATURES, PLUS_FEATURES } from "../shared/billing/types.ts";
import { ANALYTICS_EVENT_TYPES } from "../shared/analytics/events.ts";
import { createMemoryShiftPlanRepo, type ShiftPlanRepo } from "../server/shift-plan/store.ts";
import {
  ShiftPlanError,
  getShiftPlan,
  runItBack,
  type ShiftPlanDeps,
  type SlotPicker,
} from "../server/shift-plan/service.ts";

const TZ = "America/Toronto";
const USER = "user-a";
/** 23:30 local Oct 7 — next shift is the 07:00 Oct 8 anchor; Oct 5 / Oct 2 are earlier 24/48 shifts. */
const NOW = new Date("2026-10-08T03:30:00Z");

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function schedule(onHours: number, offHours: number, crew = 6): PersonalSchedule {
  return {
    timezone: TZ,
    anchorDate: "2026-10-08",
    startTime: "07:00",
    blocks: [
      { kind: "on", minutes: onHours * 60 },
      { kind: "off", minutes: offHours * 60 },
    ],
    defaultCrewSize: crew,
  };
}

function summary(flags: Partial<Record<DietaryFilterKey, boolean>>, confidence: "high" | "low" = "high"): DietarySummary {
  return { confidence, flags, adaptable: [] } as unknown as DietarySummary;
}

/** Catalog fixture: dietary profile + Foods-to-Avoid tags. */
const CATALOG: Record<string, { title: string; dietarySummary?: DietarySummary; avoidTags: string[] }> = {
  "eggs-a": { title: "Eggs A", dietarySummary: summary({ glutenFree: true, vegetarian: true }), avoidTags: [] },
  "lunch-a": { title: "Lunch A", dietarySummary: summary({ glutenFree: true }), avoidTags: [] },
  "dinner-a": { title: "Dinner A", dietarySummary: summary({ glutenFree: true }), avoidTags: [] },
  "pasta-night": { title: "Pasta Night", dietarySummary: summary({ glutenFree: false }), avoidTags: [] },
  "mushroom-risotto": { title: "Mushroom Risotto", dietarySummary: summary({ glutenFree: true }), avoidTags: ["mushrooms"] },
  "mystery-stew": { title: "Mystery Stew", dietarySummary: summary({ glutenFree: true }, "low"), avoidTags: [] },
};

const NO_RESTRICTIONS: HardFilterRequest = { dietary_restrictions: [], allergens_to_avoid: [], foods_to_avoid: [] } as HardFilterRequest;
const check = (request: HardFilterRequest = NO_RESTRICTIONS) => makeRecipeCheck((slug) => CATALOG[slug], request);

const recipe = (slug: string): PlannedRecipe => ({ slug, title: slug, imageUrl: null, totalMinutes: 30, path: `/recipes/${slug}` });

function harness(s: PersonalSchedule, opts: { pro?: boolean; overrides?: ScheduleOverride[]; repo?: ShiftPlanRepo } = {}) {
  const repo = opts.repo ?? createMemoryShiftPlanRepo();
  const deps: ShiftPlanDeps = {
    repo,
    loadSchedule: async () => ({ schedule: s, overrides: opts.overrides ?? [], mealPreferences: {} }),
    resolveRecipe: recipe,
    isSelectableSlug: () => true,
    canPlanAhead: async () => opts.pro === true,
    canRunItBack: async () => opts.pro === true,
    now: () => NOW,
  };
  return { deps, repo };
}

function shiftAt(s: PersonalSchedule, overrides: ScheduleOverride[], key: string): ShiftInstance {
  const hit = getShiftsInRange(s, overrides, {
    from: new Date("2026-09-01T00:00:00Z"),
    to: new Date("2026-12-01T00:00:00Z"),
  }).find((x) => x.key === key);
  assert.ok(hit, `no shift ${key}`);
  return hit;
}

/** Saves a plan for `key`; spec is keyed by slot identity ("dinner|1"). */
async function seed(
  repo: ShiftPlanRepo,
  s: PersonalSchedule,
  overrides: ScheduleOverride[],
  key: string,
  spec: Record<string, Partial<ShiftPlanSlotState>>,
): Promise<ShiftPlanSlotState[]> {
  const slots = mealSlotsForShift(shiftAt(s, overrides, key));
  const states = slots
    .filter((sl) => spec[slotIdentity(sl)])
    .map((sl) => ({ ...defaultSlotState(sl.key), ...spec[slotIdentity(sl)] }));
  assert.equal(states.length, Object.keys(spec).length, "every spec entry matched a slot");
  await repo.saveSlots(USER, key, states);
  return states;
}

/** Distinct recipe per call, honoring avoid lists. */
function picker(log: Array<{ key: string; hard: string[] }> = []): SlotPicker {
  let n = 0;
  return async (slot, avoid) => {
    log.push({ key: slot.key, hard: [...avoid.hard] });
    let slug = `fresh-${slot.type}-${(n += 1)}`;
    while (avoid.hard.includes(slug) || avoid.soft.includes(slug)) slug = `fresh-${slot.type}-${(n += 1)}`;
    return slug;
  };
}

async function failure(p: Promise<unknown>): Promise<{ status: number; code?: string }> {
  try {
    await p;
  } catch (err) {
    assert.ok(err instanceof ShiftPlanError, String(err));
    return { status: err.status, code: err.code };
  }
  assert.fail("expected the request to be refused");
}

/** Last shift: auto breakfast, manual (locked) lunch, skipped dinner, BYO late night. */
const LAST_SHIFT = {
  "breakfast|1": { recipeSlug: "eggs-a", selectionSource: "auto" as const },
  "lunch|1": { recipeSlug: "lunch-a", selectionSource: "manual" as const, locked: true },
  "dinner|1": { skipped: true },
  "late_night|1": { byo: true },
};

const byType = (slots: Array<{ type: string; dayIndex: number }>) => (type: string, day = 1) =>
  slots.find((s) => s.type === type && s.dayIndex === day)!;

console.log("Entitlement + registry");

await test("run_it_back is Pro-only; analytics events registered; request schema strict", () => {
  assert.ok((PLUS_FEATURES as readonly string[]).includes("run_it_back"));
  assert.ok(!PLAN_BASE_FEATURES.personal.includes("run_it_back"));
  for (const e of ["run_it_back_clicked", "run_it_back_completed", "run_it_back_paywall_viewed"]) {
    assert.ok((ANALYTICS_EVENT_TYPES as readonly string[]).includes(e), e);
  }
  assert.equal(runItBackSchema.safeParse({ shiftKey: "k", mode: "copy", base: {} }).success, true);
  assert.equal(runItBackSchema.safeParse({ shiftKey: "k", mode: "redo", base: {} }).success, false);
  assert.equal(runItBackSchema.safeParse({ shiftKey: "k", mode: "copy", base: {}, notes: "x" }).success, false);
});

await test("Free: preview is visible (for the Pro lock) but running it → 403 run_it_back_required, nothing written", async () => {
  const s = schedule(24, 48);
  const { deps, repo } = harness(s);
  await seed(repo, s, [], "2026-10-05T07:00", LAST_SHIFT);
  const view = await getShiftPlan(deps, USER);
  assert.equal(view.runItBack?.sourceShiftKey, "2026-10-05T07:00");
  assert.equal(view.runItBack?.decidedCount, 4);
  assert.deepEqual(
    await failure(runItBack(deps, USER, { shiftKey: "2026-10-08T07:00", mode: "copy" }, { checkRecipe: check() })),
    { status: 403, code: "run_it_back_required" },
  );
  assert.equal((await repo.getPlan(USER, "2026-10-08T07:00")).exists, false);
});

await test("no earlier plan → no preview; running → 404", async () => {
  const { deps } = harness(schedule(24, 48), { pro: true });
  assert.equal((await getShiftPlan(deps, USER)).runItBack, null);
  assert.equal(
    (await failure(runItBack(deps, USER, { shiftKey: "2026-10-08T07:00", mode: "copy" }, { checkRecipe: check() }))).status,
    404,
  );
});

console.log("Same shift type");

await test("copies meals, lock + source, skipped and BYO; plan reads complete; source untouched", async () => {
  const s = schedule(24, 48);
  const { deps, repo } = harness(s, { pro: true });
  const source = await seed(repo, s, [], "2026-10-05T07:00", LAST_SHIFT);
  const before = structuredClone(await repo.getPlan(USER, "2026-10-05T07:00"));

  const res = await runItBack(
    deps,
    USER,
    { shiftKey: "2026-10-08T07:00", sourceShiftKey: "2026-10-05T07:00", mode: "copy" },
    { checkRecipe: check() },
  );
  const slot = byType(res.plan.slots);
  assert.equal(res.summary.match, "same_type");
  assert.deepEqual([slot("breakfast").recipe?.slug, slot("breakfast").locked, slot("breakfast").selectionSource], ["eggs-a", false, "auto"]);
  assert.deepEqual([slot("lunch").recipe?.slug, slot("lunch").locked, slot("lunch").selectionSource], ["lunch-a", true, "manual"]);
  assert.equal(slot("dinner").skipped, true);
  assert.equal(slot("late_night").byo, true);
  assert.equal(res.plan.complete, true);
  assert.equal(res.created, true);
  assert.deepEqual(
    [res.summary.copiedMeals, res.summary.copiedSkipped, res.summary.copiedByo, res.summary.flagged.length],
    [2, 1, 1, 0],
  );
  assert.deepEqual([res.summary.newSlotKeys, res.summary.droppedMeals], [[], 0]);
  assert.deepEqual(await repo.getPlan(USER, "2026-10-05T07:00"), before, "source plan unchanged");
  assert.ok(source.every((st) => st.slotKey.startsWith("2026-10-05T07:00|")));
});

await test("only plan decisions are written — every target state has exactly the plan fields", async () => {
  const s = schedule(24, 48);
  const { deps, repo } = harness(s, { pro: true });
  await seed(repo, s, [], "2026-10-05T07:00", LAST_SHIFT);
  await runItBack(deps, USER, { shiftKey: "2026-10-08T07:00", mode: "copy" }, { checkRecipe: check() });
  const target = await repo.getPlan(USER, "2026-10-08T07:00");
  const fields = ["byo", "crewSizeOverride", "locked", "recipeSlug", "selectionSource", "skipped", "slotKey"];
  for (const st of target.slots) assert.deepEqual(Object.keys(st).sort(), fields);
  assert.ok(target.slots.every((st) => st.slotKey.startsWith("2026-10-08T07:00|")));
});

await test("replaces an existing target plan entirely (including slots the source left open)", async () => {
  const s = schedule(24, 48);
  const { deps, repo } = harness(s, { pro: true });
  await seed(repo, s, [], "2026-10-05T07:00", { "dinner|1": { recipeSlug: "dinner-a", selectionSource: "auto" } });
  await seed(repo, s, [], "2026-10-08T07:00", {
    "breakfast|1": { recipeSlug: "eggs-a", selectionSource: "manual", locked: true },
    "dinner|1": { skipped: true },
  });
  const res = await runItBack(deps, USER, { shiftKey: "2026-10-08T07:00", mode: "copy" }, { checkRecipe: check() });
  const slot = byType(res.plan.slots);
  assert.equal(slot("breakfast").recipe, null);
  assert.equal(slot("breakfast").locked, false);
  assert.deepEqual([slot("dinner").skipped, slot("dinner").recipe?.slug], [false, "dinner-a"]);
  assert.equal(res.created, false);
});

await test("source choice: same shift type beats a more recent different-length plan; most recent comparable wins", async () => {
  const s = schedule(24, 48);
  const extra: ScheduleOverride = { id: "ot", kind: "extra", startLocal: "2026-10-06T19:00", endLocal: "2026-10-07T07:00" };
  const { deps, repo } = harness(s, { pro: true, overrides: [extra] });
  await seed(repo, s, [extra], "2026-10-02T07:00", { "dinner|1": { recipeSlug: "dinner-a" } });
  await seed(repo, s, [extra], "2026-10-05T07:00", { "lunch|1": { recipeSlug: "lunch-a" } });
  await seed(repo, s, [extra], "extra:ot", { "dinner|1": { recipeSlug: "pasta-night" } });
  const view = await getShiftPlan(deps, USER);
  assert.deepEqual([view.runItBack?.sourceShiftKey, view.runItBack?.match], ["2026-10-05T07:00", "same_type"]);

  const pure = chooseRunItBackSource(shiftAt(s, [extra], "2026-10-08T07:00"), [
    { shift: shiftAt(s, [extra], "extra:ot"), states: [{ ...defaultSlotState("x"), recipeSlug: "a" }] },
  ]);
  assert.equal(pure?.match, "different_length");
});

await test("Pro + Plan Ahead: running back into a future shift uses the nearest earlier plan (even an upcoming one)", async () => {
  const s = schedule(24, 48);
  const { deps, repo } = harness(s, { pro: true });
  await seed(repo, s, [], "2026-10-05T07:00", { "lunch|1": { recipeSlug: "lunch-a" } });
  await seed(repo, s, [], "2026-10-08T07:00", { "dinner|1": { recipeSlug: "dinner-a" } });
  const res = await runItBack(deps, USER, { shiftKey: "2026-10-11T07:00", mode: "copy" }, { checkRecipe: check() });
  assert.equal(res.summary.sourceShiftKey, "2026-10-08T07:00");
  assert.equal(res.plan.planAhead, true);
  assert.equal(byType(res.plan.slots)("dinner").recipe?.slug, "dinner-a");
});

await test("stale preview: sourceShiftKey no longer the source → 409, nothing written", async () => {
  const s = schedule(24, 48);
  const { deps, repo } = harness(s, { pro: true });
  await seed(repo, s, [], "2026-10-05T07:00", LAST_SHIFT);
  assert.equal(
    (
      await failure(
        runItBack(
          deps,
          USER,
          { shiftKey: "2026-10-08T07:00", sourceShiftKey: "2026-10-02T07:00", mode: "copy" },
          { checkRecipe: check() },
        ),
      )
    ).status,
    409,
  );
  assert.equal((await repo.getPlan(USER, "2026-10-08T07:00")).exists, false);
});

console.log("Changed crew size");

await test("carryCrewOverride: smaller stays smaller, bigger stays bigger, otherwise reset", () => {
  assert.equal(carryCrewOverride(3, 6, 6), 3, "crew unchanged → kept");
  assert.equal(carryCrewOverride(3, 6, 4), 3, "still fewer than the crew");
  assert.equal(carryCrewOverride(3, 6, 2), null, "now more than the crew → reset");
  assert.equal(carryCrewOverride(9, 6, 4), 9, "guests: still more than the crew");
  assert.equal(carryCrewOverride(9, 6, 12), null, "guests now fewer than the crew → reset");
  assert.equal(carryCrewOverride(9, 6, 9), null, "equals the new crew → no override needed");
  assert.equal(carryCrewOverride(null, 6, 4), null);
});

await test("crew changed on the target shift: sensible overrides kept, others reset and counted", async () => {
  const s = schedule(24, 48);
  const modify: ScheduleOverride = { id: "m", kind: "modify", shiftKey: "2026-10-08T07:00", crewSize: 2 };
  const { deps, repo } = harness(s, { pro: true, overrides: [modify] });
  await seed(repo, s, [modify], "2026-10-05T07:00", {
    "late_night|1": { recipeSlug: "dinner-a", crewSizeOverride: 3 },
    "dinner|1": { recipeSlug: "dinner-a", crewSizeOverride: 9 },
  });
  const res = await runItBack(deps, USER, { shiftKey: "2026-10-08T07:00", mode: "copy" }, { checkRecipe: check() });
  const slot = byType(res.plan.slots);
  assert.equal(res.plan.shift?.crewSize, 2);
  assert.deepEqual([slot("dinner").crewSizeOverride, slot("dinner").crewSize], [9, 9]);
  assert.deepEqual([slot("late_night").crewSizeOverride, slot("late_night").crewSize], [null, 2]);
  assert.deepEqual([res.summary.crewOverridesKept, res.summary.crewOverridesReset], [1, 1]);
});

console.log("Changed restrictions");

await test("hardFilterViolation names the failing rule", () => {
  const gf = { ...NO_RESTRICTIONS, dietary_restrictions: ["glutenFree"] } as HardFilterRequest;
  assert.equal(hardFilterViolation(CATALOG["pasta-night"]!, gf), "Not Gluten-Free");
  assert.equal(hardFilterViolation(CATALOG["mystery-stew"]!, gf), "Not verified Gluten-Free");
  assert.equal(hardFilterViolation(CATALOG["dinner-a"]!, gf), null);
  const allergen = { ...NO_RESTRICTIONS, allergens_to_avoid: ["gluten"] } as HardFilterRequest;
  assert.equal(hardFilterViolation(CATALOG["pasta-night"]!, allergen), "Not Gluten-Free", "allergen maps to its dietary flag");
  const avoid = { ...NO_RESTRICTIONS, foods_to_avoid: ["mushrooms"] } as HardFilterRequest;
  assert.equal(hardFilterViolation(CATALOG["mushroom-risotto"]!, avoid), "Contains mushrooms");
});

await test("meals that no longer fit (or left the catalog) are flagged, not copied — even locked ones", async () => {
  const s = schedule(24, 48);
  const { deps, repo } = harness(s, { pro: true });
  await seed(repo, s, [], "2026-10-05T07:00", {
    "breakfast|1": { recipeSlug: "eggs-a", selectionSource: "auto" },
    "lunch|1": { recipeSlug: "pasta-night", selectionSource: "manual", locked: true },
    "dinner|1": { recipeSlug: "mushroom-risotto", selectionSource: "auto" },
    "late_night|1": { recipeSlug: "retired-recipe", selectionSource: "auto" },
  });
  const request = { ...NO_RESTRICTIONS, allergens_to_avoid: ["gluten"], foods_to_avoid: ["mushrooms"] } as HardFilterRequest;
  const res = await runItBack(deps, USER, { shiftKey: "2026-10-08T07:00", mode: "copy" }, { checkRecipe: check(request) });
  const slot = byType(res.plan.slots);
  assert.equal(slot("breakfast").recipe?.slug, "eggs-a");
  for (const type of ["lunch", "dinner", "late_night"]) {
    assert.deepEqual([slot(type).recipe, slot(type).locked], [null, false], type);
  }
  assert.deepEqual(
    res.summary.flagged.map((f) => [f.label, f.recipeTitle, f.reason, f.kind]),
    [
      ["Lunch", "Pasta Night", "Not Gluten-Free", "restriction"],
      ["Dinner", "Mushroom Risotto", "Contains mushrooms", "restriction"],
      ["Late Night", null, "No longer available", "unavailable"],
    ],
  );
  assert.equal(res.summary.copiedMeals, 1);
  assert.equal(res.plan.complete, false);
});

console.log("Different shift duration");

await test("24h source → 48h target: day 1 copied, day 2 left open as new meals", async () => {
  const s = schedule(48, 96);
  const extra: ScheduleOverride = { id: "d24", kind: "extra", startLocal: "2026-10-05T07:00", endLocal: "2026-10-06T07:00" };
  const { deps, repo } = harness(s, { pro: true, overrides: [extra] });
  await seed(repo, s, [extra], "extra:d24", LAST_SHIFT);
  const view = await getShiftPlan(deps, USER);
  assert.deepEqual([view.runItBack?.match, view.runItBack?.sourceScheduledMinutes], ["different_length", 1440]);

  const res = await runItBack(deps, USER, { shiftKey: "2026-10-08T07:00", mode: "copy" }, { checkRecipe: check() });
  const slot = byType(res.plan.slots);
  assert.equal(res.plan.slots.length, 8);
  assert.equal(slot("lunch", 1).recipe?.slug, "lunch-a");
  assert.equal(slot("dinner", 1).skipped, true);
  assert.ok(["breakfast", "lunch", "dinner", "late_night"].every((t) => slot(t, 2).recipe == null && !slot(t, 2).skipped));
  assert.equal(res.summary.newSlotKeys.length, 4);
  assert.ok(res.summary.newSlotKeys.every((k) => k.endsWith("2026-10-09")));
  assert.equal(res.summary.droppedMeals, 0);
});

await test("48h source → 24h target: day 2 meals dropped and counted", async () => {
  const s = schedule(24, 48);
  const extra: ScheduleOverride = { id: "d48", kind: "extra", startLocal: "2026-10-03T07:00", endLocal: "2026-10-05T07:00" };
  const { deps, repo } = harness(s, { pro: true, overrides: [extra] });
  await seed(repo, s, [extra], "extra:d48", {
    "dinner|1": { recipeSlug: "dinner-a" },
    "lunch|2": { recipeSlug: "lunch-a" },
    "dinner|2": { skipped: true },
  });
  const res = await runItBack(deps, USER, { shiftKey: "2026-10-08T07:00", mode: "copy" }, { checkRecipe: check() });
  assert.equal(res.summary.match, "different_length");
  assert.equal(res.plan.slots.length, 4);
  assert.equal(byType(res.plan.slots)("dinner").recipe?.slug, "dinner-a");
  assert.equal(res.summary.droppedMeals, 2);
});

console.log("Refresh mode — locked / manual / skipped");

await test("Run it back + refresh: keeps locked, skipped and BYO; re-picks unlocked without last shift's picks", async () => {
  const s = schedule(24, 48);
  const { deps, repo } = harness(s, { pro: true });
  await seed(repo, s, [], "2026-10-05T07:00", LAST_SHIFT);
  const log: Array<{ key: string; hard: string[] }> = [];
  const res = await runItBack(
    deps,
    USER,
    { shiftKey: "2026-10-08T07:00", mode: "refresh" },
    { checkRecipe: check(), pick: picker(log) },
  );
  const slot = byType(res.plan.slots);
  assert.deepEqual([slot("lunch").recipe?.slug, slot("lunch").locked], ["lunch-a", true], "manual meal kept");
  assert.equal(slot("dinner").skipped, true);
  assert.equal(slot("late_night").byo, true);
  assert.match(slot("breakfast").recipe!.slug, /^fresh-breakfast-/);
  assert.deepEqual(log.map((l) => l.key), [slot("breakfast").key], "only the unlocked meal is re-picked");
  assert.ok(log[0]!.hard.includes("eggs-a"), "last shift's auto pick is excluded");
  assert.deepEqual([res.summary.refreshed, res.summary.refreshFailed, res.summary.mode], [1, 0, "refresh"]);
});

await test("refresh also fills flagged and new slots; a slot that finds nothing is reported", async () => {
  const s = schedule(48, 96);
  const extra: ScheduleOverride = { id: "d24", kind: "extra", startLocal: "2026-10-05T07:00", endLocal: "2026-10-06T07:00" };
  const { deps, repo } = harness(s, { pro: true, overrides: [extra] });
  await seed(repo, s, [extra], "extra:d24", {
    "dinner|1": { recipeSlug: "pasta-night", locked: true, selectionSource: "manual" },
  });
  const gf = { ...NO_RESTRICTIONS, dietary_restrictions: ["glutenFree"] } as HardFilterRequest;
  let calls = 0;
  const flaky: SlotPicker = async (slot, avoid, seed) => ((calls += 1) === 2 ? null : picker()(slot, avoid, seed));
  const res = await runItBack(deps, USER, { shiftKey: "2026-10-08T07:00", mode: "refresh" }, { checkRecipe: check(gf), pick: flaky });
  assert.equal(res.summary.flagged.length, 1);
  assert.equal(res.summary.newSlotKeys.length, 4);
  assert.deepEqual([res.summary.refreshed, res.summary.refreshFailed], [7, 1]);
  assert.notEqual(byType(res.plan.slots)("dinner").recipe?.slug, "pasta-night");
});

await test("refresh without meal preferences is refused", async () => {
  const s = schedule(24, 48);
  const { deps, repo } = harness(s, { pro: true });
  await seed(repo, s, [], "2026-10-05T07:00", LAST_SHIFT);
  assert.equal(
    (await failure(runItBack(deps, USER, { shiftKey: "2026-10-08T07:00", mode: "refresh" }, { checkRecipe: check() }))).status,
    400,
  );
});

console.log(`\n${passed} run-it-back tests passed`);
