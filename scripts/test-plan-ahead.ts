/**
 * Phase 10 — Premium Plan Ahead: Free boundary, Pro 30-day window, multiple
 * upcoming shifts, extra + cancelled shifts, 48/72-hour rotations, plan
 * status, persistence, and the schedule pattern never changing.
 * Run: npx tsx scripts/test-plan-ahead.ts
 */
import assert from "node:assert/strict";
import type { PersonalSchedule, ScheduleOverride } from "../shared/schedule/types.ts";
import { mealSlotsForShift } from "../shared/schedule/meal-slots.ts";
import { plannableShift } from "../shared/shift-plan/plan.ts";
import {
  MAX_UPCOMING_SHIFTS,
  PLAN_AHEAD_WINDOW_DAYS,
  planAheadHorizon,
  resolvePlanAheadAccess,
  shiftAccess,
  shiftPlanStatus,
  upcomingPlannableShifts,
} from "../shared/shift-plan/plan-ahead.ts";
import { shiftPlanQuerySchema } from "../shared/shift-plan/schema.ts";
import type { PlannedRecipe } from "../shared/shift-plan/types.ts";
import { PLAN_BASE_FEATURES, PLUS_FEATURES } from "../shared/billing/types.ts";
import { ANALYTICS_EVENT_TYPES } from "../shared/analytics/events.ts";
import { createMemoryShiftPlanRepo, type ShiftPlanRepo } from "../server/shift-plan/store.ts";
import {
  ShiftPlanError,
  fillShiftPlan,
  getShiftPlan,
  listUpcomingShifts,
  patchShiftPlanSlot,
  type ShiftPlanDeps,
  type SlotPicker,
} from "../server/shift-plan/service.ts";

const TZ = "America/Toronto";
const USER = "user-a";
/** 23:30 local on Oct 7 — the first shift is the 07:00 Oct 8 anchor. Window ends Nov 6 22:30 local (after DST ends Nov 1). */
const NOW = new Date("2026-10-08T03:30:00Z");

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function schedule(onHours: number, offHours: number): PersonalSchedule {
  return {
    timezone: TZ,
    anchorDate: "2026-10-08",
    startTime: "07:00",
    blocks: [
      { kind: "on", minutes: onHours * 60 },
      { kind: "off", minutes: offHours * 60 },
    ],
    defaultCrewSize: 6,
  };
}

const recipe = (slug: string): PlannedRecipe => ({ slug, title: slug, imageUrl: null, totalMinutes: 30, path: `/recipes/${slug}` });

interface Harness {
  deps: ShiftPlanDeps;
  repo: ShiftPlanRepo;
  entitlementChecks: string[];
}

function harness(
  s: PersonalSchedule,
  opts: { pro?: boolean; overrides?: ScheduleOverride[]; now?: Date; repo?: ShiftPlanRepo } = {},
): Harness {
  const repo = opts.repo ?? createMemoryShiftPlanRepo();
  const entitlementChecks: string[] = [];
  return {
    repo,
    entitlementChecks,
    deps: {
      repo,
      loadSchedule: async () => ({ schedule: s, overrides: opts.overrides ?? [], mealPreferences: {} }),
      resolveRecipe: recipe,
      isSelectableSlug: () => true,
      canPlanAhead: async (userId) => {
        entitlementChecks.push(userId);
        return opts.pro === true;
      },
      canRunItBack: async () => opts.pro === true,
      now: () => opts.now ?? NOW,
    },
  };
}

/** Distinct recipe per call, honoring avoid lists. */
function picker(): SlotPicker {
  let n = 0;
  return async (slot, avoid) => {
    let slug = `${slot.type.replace("_", "-")}-${(n += 1)}`;
    while (avoid.hard.includes(slug) || avoid.soft.includes(slug)) slug = `${slot.type.replace("_", "-")}-${(n += 1)}`;
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

const keys = (shifts: Array<{ shift: { key: string } }>) => shifts.map((s) => s.shift.key);

console.log("Entitlement + registry");

await test("plan_ahead is a Pro-only feature; access resolves from billing features", () => {
  assert.ok((PLUS_FEATURES as readonly string[]).includes("plan_ahead"));
  assert.ok(PLAN_BASE_FEATURES.firefighter_plus.includes("plan_ahead"));
  assert.ok(!PLAN_BASE_FEATURES.personal.includes("plan_ahead"));
  assert.ok(!PLAN_BASE_FEATURES.guest.includes("plan_ahead"));
  assert.deepEqual(resolvePlanAheadAccess({ plan_ahead: true }), { canPlanAhead: true, windowDays: 30 });
  assert.equal(resolvePlanAheadAccess({ plan_ahead: false }).canPlanAhead, false);
  assert.equal(resolvePlanAheadAccess(null).canPlanAhead, false);
  assert.equal(PLAN_AHEAD_WINDOW_DAYS, 30);
});

await test("analytics events are registered", () => {
  for (const e of ["future_shift_viewed", "plan_ahead_paywall_viewed", "future_shift_plan_created"]) {
    assert.ok((ANALYTICS_EVENT_TYPES as readonly string[]).includes(e), e);
  }
});

await test("GET ?shiftKey= schema: optional, bounded", () => {
  assert.equal(shiftPlanQuerySchema.safeParse({}).success, true);
  assert.equal(shiftPlanQuerySchema.safeParse({ shiftKey: "extra:abc" }).success, true);
  assert.equal(shiftPlanQuerySchema.safeParse({ shiftKey: "x".repeat(65) }).success, false);
});

console.log("Free boundary");

await test("Free: sees every upcoming shift; only the next one is actionable, the rest are Pro-locked", async () => {
  const { deps } = harness(schedule(24, 48));
  const view = await listUpcomingShifts(deps, USER);
  assert.equal(view.canPlanAhead, false);
  assert.deepEqual(keys(view.shifts), [
    "2026-10-08T07:00",
    "2026-10-11T07:00",
    "2026-10-14T07:00",
    "2026-10-17T07:00",
    "2026-10-20T07:00",
    "2026-10-23T07:00",
    "2026-10-26T07:00",
    "2026-10-29T07:00",
    "2026-11-01T07:00",
    "2026-11-04T07:00",
  ]);
  assert.deepEqual(
    view.shifts.map((s) => [s.isNext, s.actionable]),
    [[true, true], ...Array(9).fill([false, false])],
  );
  assert.ok(view.shifts.every((s) => s.status === "unplanned" && s.mealCount === 4));
});

await test("Free: the next shift plans fully with no entitlement lookup", async () => {
  const h = harness(schedule(24, 48));
  const res = await fillShiftPlan(h.deps, USER, { shiftKey: "2026-10-08T07:00", mode: "fill" }, picker());
  assert.equal(res.plan.complete, true);
  assert.equal(res.plan.planAhead, false);
  assert.equal(res.created, true);
  assert.equal((await getShiftPlan(h.deps, USER)).planAhead, false);
  assert.deepEqual(h.entitlementChecks, [], "the free shift never needs a billing check");
});

await test("Free: opening, filling or editing a later shift → 403 plan_ahead_required, nothing saved", async () => {
  const h = harness(schedule(24, 48));
  const future = "2026-10-11T07:00";
  assert.deepEqual(await failure(getShiftPlan(h.deps, USER, future)), { status: 403, code: "plan_ahead_required" });
  assert.deepEqual(await failure(fillShiftPlan(h.deps, USER, { shiftKey: future, mode: "fill" }, picker())), {
    status: 403,
    code: "plan_ahead_required",
  });
  assert.deepEqual(
    await failure(patchShiftPlanSlot(h.deps, USER, { shiftKey: future, slotKey: `${future}|dinner|2026-10-11`, skipped: true })),
    { status: 403, code: "plan_ahead_required" },
  );
  assert.equal((await h.repo.getPlan(USER, future)).exists, false);
});

await test("Free: on shift now → the current shift is free; the following one is locked", async () => {
  const midShift = new Date("2026-10-08T20:00:00Z");
  const { deps } = harness(schedule(24, 48), { now: midShift });
  const view = await listUpcomingShifts(deps, USER);
  assert.equal(view.shifts[0]!.shift.key, "2026-10-08T07:00");
  assert.deepEqual([view.shifts[0]!.isNext, view.shifts[0]!.actionable], [true, true]);
  assert.deepEqual([view.shifts[1]!.shift.key, view.shifts[1]!.actionable], ["2026-10-11T07:00", false]);
});

await test("Free: the boundary moves forward once the next shift has ended", async () => {
  const after = new Date("2026-10-09T12:00:00Z");
  const { deps } = harness(schedule(24, 48), { now: after });
  const plan = await getShiftPlan(deps, USER);
  assert.equal(plan.shift?.key, "2026-10-11T07:00");
  assert.equal(plan.planAhead, false);
});

console.log("Premium — 30-day window");

await test("Pro: every shift in the window is actionable and opens as a Plan Ahead shift", async () => {
  const { deps } = harness(schedule(24, 48), { pro: true });
  const view = await listUpcomingShifts(deps, USER);
  assert.equal(view.canPlanAhead, true);
  assert.ok(view.shifts.every((s) => s.actionable));
  const plan = await getShiftPlan(deps, USER, "2026-11-04T07:00");
  assert.equal(plan.planAhead, true);
  assert.equal(plan.shift?.key, "2026-11-04T07:00");
  assert.equal(plan.slots.length, 4);
  assert.equal(plan.started, false);
});

await test("Pro: a shift starting at/after now + 30 days is outside the window (404) and not listed", async () => {
  const { deps } = harness(schedule(24, 48), { pro: true });
  const horizon = planAheadHorizon(NOW).getTime();
  const view = await listUpcomingShifts(deps, USER);
  assert.ok(view.shifts.every((s) => Date.parse(s.shift.start) < horizon));
  assert.deepEqual(await failure(getShiftPlan(deps, USER, "2026-11-07T07:00")), { status: 404, code: undefined });
  assert.deepEqual(
    await failure(fillShiftPlan(deps, USER, { shiftKey: "2026-11-07T07:00", mode: "fill" }, picker())),
    { status: 409, code: undefined },
  );
});

await test("window edge: shiftAccess allows strictly before the horizon only", () => {
  const access = resolvePlanAheadAccess({ plan_ahead: true });
  const at = (ms: number) => ({ key: "k", start: new Date(ms).toISOString(), status: "scheduled" as const });
  const horizon = planAheadHorizon(NOW).getTime();
  assert.deepEqual(shiftAccess(at(horizon - 60_000), "free", access, NOW), { planAhead: true, actionable: true });
  assert.deepEqual(shiftAccess(at(horizon), "free", access, NOW), { planAhead: true, actionable: false });
  assert.deepEqual(shiftAccess(at(horizon + 1e9), "k", access, NOW), { planAhead: false, actionable: true }, "free shift always actionable");
});

await test("Pro: planning a future shift persists, reloads, and reports created once", async () => {
  const repo = createMemoryShiftPlanRepo();
  const { deps } = harness(schedule(24, 48), { pro: true, repo });
  const key = "2026-10-20T07:00";
  const first = await fillShiftPlan(deps, USER, { shiftKey: key, mode: "fill" }, picker());
  assert.equal(first.created, true);
  assert.equal(first.plan.planAhead, true);
  assert.equal(first.plan.complete, true);
  const again = await patchShiftPlanSlot(deps, USER, { shiftKey: key, slotKey: first.plan.slots[0]!.key, locked: true });
  assert.equal(again.created, false);

  const reloaded = await getShiftPlan(harness(schedule(24, 48), { pro: true, repo }).deps, USER, key);
  assert.deepEqual(
    reloaded.slots.map((s) => s.recipe?.slug),
    first.plan.slots.map((s) => s.recipe?.slug),
  );
  assert.equal(reloaded.slots[0]!.locked, true);
  assert.equal((await getShiftPlan(deps, USER)).started, false, "the next shift's plan is untouched");
});

await test("Pro: a plan saved while Pro stays stored but locks again after downgrade", async () => {
  const repo = createMemoryShiftPlanRepo();
  const key = "2026-10-14T07:00";
  await fillShiftPlan(harness(schedule(24, 48), { pro: true, repo }).deps, USER, { shiftKey: key, mode: "fill" }, picker());
  const free = harness(schedule(24, 48), { repo });
  assert.equal((await failure(getShiftPlan(free.deps, USER, key))).status, 403);
  const row = (await listUpcomingShifts(free.deps, USER)).shifts.find((s) => s.shift.key === key)!;
  assert.deepEqual([row.status, row.actionable], ["planned", false]);
  assert.equal((await repo.getPlan(USER, key)).exists, true);
});

console.log("Multiple upcoming shifts — status");

await test("Unplanned / Partially planned / Planned are tracked per shift", async () => {
  const { deps } = harness(schedule(24, 48), { pro: true });
  await fillShiftPlan(deps, USER, { shiftKey: "2026-10-08T07:00", mode: "fill" }, picker());
  const partial = await getShiftPlan(deps, USER, "2026-10-11T07:00");
  await patchShiftPlanSlot(deps, USER, { shiftKey: "2026-10-11T07:00", slotKey: partial.slots[2]!.key, skipped: true });
  const lunch = partial.slots.find((s) => s.type === "lunch")!;
  await patchShiftPlanSlot(deps, USER, { shiftKey: "2026-10-11T07:00", slotKey: lunch.key, recipeSlug: "lunch-x" });

  const view = await listUpcomingShifts(deps, USER);
  const byKey = new Map(view.shifts.map((s) => [s.shift.key, s]));
  assert.deepEqual(
    [byKey.get("2026-10-08T07:00")!.status, byKey.get("2026-10-08T07:00")!.plannedCount],
    ["planned", 4],
  );
  assert.deepEqual(
    [byKey.get("2026-10-11T07:00")!.status, byKey.get("2026-10-11T07:00")!.plannedCount],
    ["partial", 2],
  );
  assert.equal(byKey.get("2026-10-14T07:00")!.status, "unplanned");
  assert.equal(byKey.get("2026-10-14T07:00")!.plannedCount, 0);
});

await test("slot keys are per shift: identical meals in two shifts never collide", async () => {
  const { deps, repo } = harness(schedule(24, 48), { pro: true });
  await fillShiftPlan(deps, USER, { shiftKey: "2026-10-14T07:00", mode: "fill" }, picker());
  await fillShiftPlan(deps, USER, { shiftKey: "2026-10-17T07:00", mode: "fill" }, picker());
  const states = await repo.listSlotStates(USER, ["2026-10-14T07:00", "2026-10-17T07:00", "2026-10-20T07:00"]);
  assert.equal(states.get("2026-10-14T07:00")!.length, 4);
  assert.equal(states.get("2026-10-17T07:00")!.length, 4);
  assert.equal(states.has("2026-10-20T07:00"), false);
  assert.ok(states.get("2026-10-17T07:00")!.every((s) => s.slotKey.startsWith("2026-10-17T07:00|")));
});

await test("shiftPlanStatus: empty shift is unplanned; optional-only open is still planned", async () => {
  assert.equal(shiftPlanStatus([]), "unplanned");
  const plan = await getShiftPlan(harness(schedule(24, 48)).deps, USER);
  assert.ok(plan.slots.some((s) => !s.optional) && plan.slots.some((s) => s.optional));
  const decided = plan.slots.map((s) => (s.optional ? s : { ...s, skipped: true }));
  assert.equal(shiftPlanStatus(decided), "planned");
  assert.equal(shiftPlanStatus(plan.slots.map((s, i) => (i === 0 ? { ...s, byo: true } : s))), "partial");
});

await test("upcoming list is capped", async () => {
  const tiny: PersonalSchedule = { ...schedule(1, 1) };
  const { deps } = harness(tiny, { pro: true });
  assert.equal((await listUpcomingShifts(deps, USER)).shifts.length, MAX_UPCOMING_SHIFTS);
});

console.log("Extra shifts");

const extra: ScheduleOverride = {
  id: "ot1",
  kind: "extra",
  startLocal: "2026-10-12T19:00",
  endLocal: "2026-10-13T07:00",
  crewSize: 4,
};

await test("an extra shift appears in order, is Pro-locked for Free, plannable for Pro", async () => {
  const free = await listUpcomingShifts(harness(schedule(24, 48), { overrides: [extra] }).deps, USER);
  const row = free.shifts.find((s) => s.shift.key === "extra:ot1")!;
  assert.equal(free.shifts.indexOf(row), 2, "sorted between Oct 11 and Oct 14");
  assert.deepEqual([row.shift.source, row.actionable, row.shift.crewSize], ["extra", false, 4]);

  const pro = harness(schedule(24, 48), { pro: true, overrides: [extra] });
  const res = await fillShiftPlan(pro.deps, USER, { shiftKey: "extra:ot1", mode: "fill" }, picker());
  assert.equal(res.plan.planAhead, true);
  assert.ok(res.plan.slots.length > 0 && res.plan.complete);
  assert.ok(res.plan.slots.every((s) => s.shiftCrewSize === 4));
});

await test("an extra shift that is the next shift is free to plan", async () => {
  const soon: ScheduleOverride = { id: "ot0", kind: "extra", startLocal: "2026-10-07T23:45", endLocal: "2026-10-08T06:00" };
  const { deps } = harness(schedule(24, 48), { overrides: [soon] });
  const plan = await getShiftPlan(deps, USER);
  assert.equal(plan.shift?.key, "extra:ot0");
  assert.equal(plan.planAhead, false);
  const view = await listUpcomingShifts(deps, USER);
  assert.deepEqual([view.shifts[0]!.shift.key, view.shifts[1]!.actionable], ["extra:ot0", false]);
});

console.log("Cancelled shifts");

const cancelNext: ScheduleOverride = { id: "c1", kind: "cancel", shiftKey: "2026-10-08T07:00" };
const cancelLater: ScheduleOverride = { id: "c2", kind: "cancel", shiftKey: "2026-10-17T07:00" };

await test("cancelled shifts are never listed; cancelling the next shift moves the free boundary", async () => {
  const { deps } = harness(schedule(24, 48), { overrides: [cancelNext, cancelLater] });
  const view = await listUpcomingShifts(deps, USER);
  assert.ok(!keys(view.shifts).includes("2026-10-08T07:00"));
  assert.ok(!keys(view.shifts).includes("2026-10-17T07:00"));
  assert.deepEqual([view.shifts[0]!.shift.key, view.shifts[0]!.isNext, view.shifts[0]!.actionable], [
    "2026-10-11T07:00",
    true,
    true,
  ]);
  assert.equal((await getShiftPlan(deps, USER)).shift?.key, "2026-10-11T07:00");
});

await test("Pro can't plan a cancelled shift; a planned shift that gets cancelled is refused (stale)", async () => {
  const repo = createMemoryShiftPlanRepo();
  const key = "2026-10-17T07:00";
  await fillShiftPlan(harness(schedule(24, 48), { pro: true, repo }).deps, USER, { shiftKey: key, mode: "fill" }, picker());
  const after = harness(schedule(24, 48), { pro: true, repo, overrides: [cancelLater] });
  assert.equal((await failure(getShiftPlan(after.deps, USER, key))).status, 404);
  assert.equal((await failure(fillShiftPlan(after.deps, USER, { shiftKey: key, mode: "fill" }, picker()))).status, 409);
});

await test("a modified shift keeps its key and its plan (moved start stays plannable)", async () => {
  const repo = createMemoryShiftPlanRepo();
  const key = "2026-10-14T07:00";
  await fillShiftPlan(harness(schedule(24, 48), { pro: true, repo }).deps, USER, { shiftKey: key, mode: "fill" }, picker());
  const moved: ScheduleOverride = { id: "m1", kind: "modify", shiftKey: key, startLocal: "2026-10-14T08:00", crewSize: 8 };
  const view = await listUpcomingShifts(harness(schedule(24, 48), { pro: true, repo, overrides: [moved] }).deps, USER);
  const row = view.shifts.find((s) => s.shift.key === key)!;
  assert.deepEqual([row.shift.status, row.shift.startLocal, row.shift.crewSize], ["modified", "2026-10-14T08:00", 8]);
  assert.notEqual(row.status, "unplanned");
});

console.log("48 / 72-hour rotations");

await test("48 on / 72 off: six 48h shifts in the window, eight meals each", async () => {
  const h = harness(schedule(48, 72), { pro: true });
  const view = await listUpcomingShifts(h.deps, USER);
  assert.deepEqual(keys(view.shifts), [
    "2026-10-08T07:00",
    "2026-10-13T07:00",
    "2026-10-18T07:00",
    "2026-10-23T07:00",
    "2026-10-28T07:00",
    "2026-11-02T07:00",
  ]);
  assert.ok(view.shifts.every((s) => s.shift.scheduledMinutes === 2880 && s.mealCount === 8));
  const res = await fillShiftPlan(h.deps, USER, { shiftKey: "2026-11-02T07:00", mode: "fill" }, picker());
  assert.equal(res.plan.complete, true);
  assert.equal(new Set(res.plan.slots.map((s) => s.mealDate)).size, 2, "two meal days");
});

await test("72 on / 96 off: five 72h shifts in the window, three meal days each", async () => {
  const s = schedule(72, 96);
  const { deps } = harness(s);
  const view = await listUpcomingShifts(deps, USER);
  assert.deepEqual(keys(view.shifts), [
    "2026-10-08T07:00",
    "2026-10-15T07:00",
    "2026-10-22T07:00",
    "2026-10-29T07:00",
    "2026-11-05T07:00",
  ]);
  const shift = view.shifts[3]!.shift;
  assert.equal(shift.scheduledMinutes, 4320);
  assert.equal(shift.elapsedMinutes, 4320 + 60, "spans the Nov 1 DST change");
  assert.equal(view.shifts[3]!.mealCount, mealSlotsForShift(shift).length);
  assert.equal(new Set(mealSlotsForShift(shift).map((m) => m.mealDate)).size, 3);
  assert.deepEqual(view.shifts.map((r) => r.actionable), [true, false, false, false, false]);
});

await test("24 on / 72 off (Kelly-style): Free sees all, plans one", async () => {
  const { deps } = harness(schedule(24, 72));
  const view = await listUpcomingShifts(deps, USER);
  assert.equal(view.shifts.length, 8);
  assert.equal(view.shifts.filter((r) => r.actionable).length, 1);
});

console.log("Schedule pattern is never changed by planning");

await test("planning shifts never mutates the schedule or overrides; the free shift is unchanged", async () => {
  const s = schedule(24, 48);
  const overrides: ScheduleOverride[] = [extra, cancelLater];
  const before = structuredClone({ s, overrides });
  const freeBefore = plannableShift(s, overrides, NOW)?.key;
  const { deps } = harness(s, { pro: true, overrides });
  for (const key of ["2026-10-11T07:00", "extra:ot1", "2026-10-20T07:00"]) {
    await fillShiftPlan(deps, USER, { shiftKey: key, mode: "fill" }, picker());
  }
  await patchShiftPlanSlot(deps, USER, {
    shiftKey: "2026-10-20T07:00",
    slotKey: (await getShiftPlan(deps, USER, "2026-10-20T07:00")).slots[0]!.key,
    crewSizeOverride: 10,
  });
  assert.deepEqual({ s, overrides }, before);
  assert.equal(plannableShift(s, overrides, NOW)?.key, freeBefore);
  const again = upcomingPlannableShifts(s, overrides, NOW);
  assert.equal(again.shifts.find((x) => x.key === "2026-10-20T07:00")?.crewSize, 6, "per-meal crew override stays in the plan");
});

await test("no schedule → empty upcoming view; a keyed GET is 404", async () => {
  const deps: ShiftPlanDeps = { ...harness(schedule(24, 48)).deps, loadSchedule: async () => null };
  assert.deepEqual(await listUpcomingShifts(deps, USER), {
    hasSchedule: false,
    timezone: null,
    canPlanAhead: false,
    windowDays: 30,
    shifts: [],
  });
  assert.equal((await failure(getShiftPlan(deps, USER, "2026-10-11T07:00"))).status, 404);
});

console.log(`\n${passed} plan-ahead tests passed`);
