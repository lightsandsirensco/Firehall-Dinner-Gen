/**
 * Phase 13 — 14-day personal Pro reverse trial: start rules (first completed
 * Shift Plan / paywall, never schedule setup), once per account, expiry,
 * downgrade (nothing deleted, Premium data locked), subscribe after expiry,
 * and timezone / DST / exact-boundary timing.
 * Run: npx tsx scripts/test-pro-trial.ts
 */
import assert from "node:assert/strict";
import type { PersonalSchedule } from "../shared/schedule/types.ts";
import {
  PRO_TRIAL_ENDING_NOTICE_DAYS,
  isProTrialActive,
  personalPlanFromSources,
  proTrialDaysLeft,
  proTrialEligibility,
  proTrialState,
  proTrialStatusLabel,
  proTrialWindow,
  type ProTrialRecord,
} from "../shared/billing/pro-trial.ts";
import { PLAN_BASE_FEATURES, PRO_TRIAL_DAYS, type PlanId, type UserSubscription } from "../shared/billing/types.ts";
import { resolvePlanAheadAccess } from "../shared/shift-plan/plan-ahead.ts";
import { ANALYTICS_EVENT_TYPES } from "../shared/analytics/events.ts";
import type { PlannedRecipe } from "../shared/shift-plan/types.ts";
import { createMemoryShiftPlanRepo } from "../server/shift-plan/store.ts";
import {
  ShiftPlanError,
  fillShiftPlan,
  getShiftPlan,
  listUpcomingShifts,
  patchShiftPlanSlot,
  type ShiftPlanDeps,
  type SlotPicker,
} from "../server/shift-plan/service.ts";
import { createMemoryProTrialRepo } from "../server/billing/pro-trial-store.ts";
import { startProTrial, type ProTrialDeps } from "../server/billing/pro-trial.ts";

const TZ = "America/Toronto";
const USER = "user-a";
const DAY = 24 * 60 * 60 * 1000;
/** 23:30 local Oct 7 (Toronto) — next shift is the 07:00 Oct 8 anchor. */
const NOW = new Date("2026-10-08T03:30:00Z");

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const schedule: PersonalSchedule = {
  timezone: TZ,
  anchorDate: "2026-10-08",
  startTime: "07:00",
  blocks: [
    { kind: "on", minutes: 24 * 60 },
    { kind: "off", minutes: 72 * 60 },
  ],
  defaultCrewSize: 6,
};

const recipe = (slug: string): PlannedRecipe => ({ slug, title: slug, imageUrl: null, totalMinutes: 30, path: `/recipes/${slug}` });

function stripeSub(status: UserSubscription["status"]): UserSubscription {
  return {
    user_id: USER,
    plan_id: "firefighter_plus",
    status,
    source: "stripe",
    selected_at: NOW.toISOString(),
    expires_at: null,
  };
}

/**
 * Shift planner + trial wired exactly like production (server/shift-plan/routes.ts):
 * entitlements come from personalPlanFromSources over the stored trial and
 * subscription, and completing a plan calls startProTrial("first_shift_plan").
 */
function world(opts: { subscription?: UserSubscription | null } = {}) {
  let now = NOW;
  let subscription = opts.subscription ?? null;
  const trials = createMemoryProTrialRepo();
  const plans = createMemoryShiftPlanRepo();
  const started: ProTrialRecord[] = [];
  const trialDeps: ProTrialDeps = {
    repo: trials,
    getSubscription: async () => subscription,
    now: () => now,
    onStarted: (r) => started.push(r),
  };
  const plan = async (userId: string): Promise<PlanId> =>
    personalPlanFromSources({ subscription, trial: await trials.get(userId), now });
  const features = async (userId: string) => {
    const p = await plan(userId);
    return Object.fromEntries(PLAN_BASE_FEATURES[p].map((f) => [f, true]));
  };
  let failTrialStart = false;
  const deps: ShiftPlanDeps = {
    repo: plans,
    loadSchedule: async () => ({ schedule, overrides: [], mealPreferences: {} }),
    resolveRecipe: recipe,
    isSelectableSlug: () => true,
    canPlanAhead: async (u) => resolvePlanAheadAccess(await features(u)).canPlanAhead,
    canRunItBack: async (u) => Boolean((await features(u)).run_it_back),
    onPlanComplete: async (u) => {
      if (failTrialStart) throw new Error("db down");
      return (await startProTrial(trialDeps, u, "first_shift_plan")).started;
    },
    now: () => now,
  };
  return {
    deps,
    trials,
    plans,
    trialDeps,
    started,
    plan,
    setNow: (d: Date) => (now = d),
    setSubscription: (s: UserSubscription | null) => (subscription = s),
    failTrialStart: () => (failTrialStart = true),
  };
}

const picker: SlotPicker = (() => {
  let n = 0;
  return async (slot) => `${slot.type}-${(n += 1)}`;
})();

async function failure(p: Promise<unknown>): Promise<{ status: number; code?: string }> {
  try {
    await p;
  } catch (err) {
    assert.ok(err instanceof ShiftPlanError, String(err));
    return { status: err.status, code: err.code };
  }
  assert.fail("expected the request to be refused");
}

console.log("Trial window + timing");

await test("14 days, measured as exact 24h days from the start instant", () => {
  assert.equal(PRO_TRIAL_DAYS, 14);
  const w = proTrialWindow(NOW);
  assert.equal(Date.parse(w.trial_expires_at) - Date.parse(w.trial_started_at), 14 * DAY);
  assert.equal(proTrialDaysLeft(w.trial_expires_at, NOW), 14);
});

await test("timezone/DST: a trial started 23:59 Toronto crossing the Nov 1 DST change still lasts exactly 14×24h", () => {
  const start = new Date("2026-10-25T03:59:00Z"); // 23:59 EDT Oct 24
  const w = proTrialWindow(start);
  assert.equal(w.trial_expires_at, "2026-11-08T03:59:00.000Z"); // 22:59 EST Nov 7 — wall clock moved, duration didn't
  assert.equal(proTrialDaysLeft(w.trial_expires_at, new Date("2026-10-25T04:01:00Z")), 14, "crossing local midnight doesn't eat a day");
  assert.equal(proTrialDaysLeft(w.trial_expires_at, new Date("2026-11-07T04:00:00Z")), 1);
});

await test("exact boundary: active 1ms before expiry, expired at the expiry instant", () => {
  const record = { trial_expires_at: "2026-10-22T03:30:00.000Z" };
  assert.equal(isProTrialActive(record, new Date(Date.parse(record.trial_expires_at) - 1)), true);
  assert.equal(isProTrialActive(record, new Date(record.trial_expires_at)), false);
  assert.equal(isProTrialActive({ trial_expires_at: "not-a-date" }, NOW), false, "unparseable expiry fails closed");
  assert.equal(isProTrialActive(null, NOW), false);
});

await test('status label reads "Pro trial · 9 days left"', () => {
  assert.equal(proTrialStatusLabel({ days_left: 9 }), "Pro trial · 9 days left");
  assert.equal(proTrialStatusLabel({ days_left: 1 }), "Pro trial · 1 day left");
});

console.log("First Shift Plan starts the trial");

await test("schedule setup alone does not start it (viewing the planner and upcoming shifts)", async () => {
  const w = world();
  const view = await getShiftPlan(w.deps, USER);
  await listUpcomingShifts(w.deps, USER);
  assert.ok(view.shift && !view.started);
  assert.equal(await w.trials.get(USER), null);
  assert.equal(await w.plan(USER), "personal");
});

await test("a partial plan does not start it; deciding the last required meal does — optional Late Night left open", async () => {
  const w = world();
  const view = await getShiftPlan(w.deps, USER);
  const shiftKey = view.shift!.key;
  const required = view.slots.filter((s) => !s.optional);
  const lateNight = view.slots.find((s) => s.type === "late_night");
  assert.ok(required.length >= 3, "24h shift has breakfast/lunch/dinner");
  assert.ok(lateNight?.optional, "late night is generated and optional");

  // Mix of the three ways to decide a meal: assigned, skipped, BYO.
  const decisions = [{ recipeSlug: "eggs" }, { skipped: true }, { byo: true }];
  for (let i = 0; i < required.length - 1; i++) {
    const res = await patchShiftPlanSlot(w.deps, USER, { shiftKey, slotKey: required[i].key, ...decisions[i % 3] });
    assert.equal(res.plan.complete, false);
    assert.equal(res.proTrialStarted, false, `no trial after ${i + 1} of ${required.length} required meals`);
  }
  assert.equal(await w.trials.get(USER), null);

  const last = required[required.length - 1];
  const res = await patchShiftPlanSlot(w.deps, USER, { shiftKey, slotKey: last.key, byo: true });
  assert.equal(res.plan.complete, true);
  assert.equal(res.plan.slots.find((s) => s.type === "late_night")!.recipe, null, "late night still open");
  assert.equal(res.proTrialStarted, true);

  const record = (await w.trials.get(USER))!;
  assert.equal(record.start_source, "first_shift_plan");
  assert.equal(record.trial_started_at, NOW.toISOString());
  assert.equal(await w.plan(USER), "firefighter_plus", "trial grants Personal Pro");
  assert.equal(w.started.length, 1, "premium_trial_started recorded once");
});

await test("auto-fill completing the plan starts it too; further saves never restart it", async () => {
  const w = world();
  const shiftKey = (await getShiftPlan(w.deps, USER)).shift!.key;
  const res = await fillShiftPlan(w.deps, USER, { shiftKey, mode: "fill" }, picker);
  assert.equal(res.plan.complete, true);
  assert.equal(res.proTrialStarted, true);
  const slot = res.plan.slots[0];
  const again = await patchShiftPlanSlot(w.deps, USER, { shiftKey, slotKey: slot.key, skipped: true });
  assert.equal(again.proTrialStarted, false);
  assert.equal(w.started.length, 1);
});

await test("a trial-start failure never fails the plan save", async () => {
  const w = world();
  w.failTrialStart();
  const shiftKey = (await getShiftPlan(w.deps, USER)).shift!.key;
  const res = await fillShiftPlan(w.deps, USER, { shiftKey, mode: "fill" }, picker);
  assert.equal(res.plan.complete, true);
  assert.equal(res.proTrialStarted, false);
});

await test("a paying subscriber completing a plan does not burn a trial", async () => {
  const w = world({ subscription: stripeSub("active") });
  const shiftKey = (await getShiftPlan(w.deps, USER)).shift!.key;
  const res = await fillShiftPlan(w.deps, USER, { shiftKey, mode: "fill" }, picker);
  assert.equal(res.proTrialStarted, false);
  assert.equal(await w.trials.get(USER), null);
});

console.log("Paywall start + once per account");

await test("the paywall can start it before any plan; a later first plan then doesn't start another", async () => {
  const w = world();
  const res = await startProTrial(w.trialDeps, USER, "paywall", "shift_planner_upcoming_list");
  assert.equal(res.started, true);
  const record = (await w.trials.get(USER))!;
  assert.equal(record.start_source, "paywall");
  assert.equal(record.paywall_source, "shift_planner_upcoming_list");
  const shiftKey = (await getShiftPlan(w.deps, USER)).shift!.key;
  const fill = await fillShiftPlan(w.deps, USER, { shiftKey, mode: "fill" }, picker);
  assert.equal(fill.proTrialStarted, false);
  assert.equal((await w.trials.get(USER))!.trial_started_at, record.trial_started_at, "earlier start wins");
});

await test("second trial blocked — during the trial, after expiry, and in a concurrent race", async () => {
  const w = world();
  const [a, b] = await Promise.all([
    startProTrial(w.trialDeps, USER, "paywall", "a"),
    startProTrial(w.trialDeps, USER, "paywall", "b"),
  ]);
  assert.equal([a, b].filter((r) => r.started).length, 1, "only one concurrent start wins");
  const during = await startProTrial(w.trialDeps, USER, "paywall", "c");
  assert.deepEqual([during.started, !during.started && during.reason], [false, "trial_used"]);
  w.setNow(new Date(NOW.getTime() + 30 * DAY));
  const after = await startProTrial(w.trialDeps, USER, "first_shift_plan");
  assert.deepEqual([after.started, !after.started && after.reason], [false, "trial_used"]);
  assert.equal(w.trials.rows.size, 1);
  assert.equal(w.started.length, 1);
});

await test("an active subscriber is not eligible (already_pro)", () => {
  const e = proTrialEligibility({ record: null, subscription: stripeSub("active"), now: NOW });
  assert.deepEqual(e, { eligible: false, reason: "already_pro" });
  assert.deepEqual(proTrialEligibility({ record: null, subscription: null, now: NOW }), { eligible: true });
});

console.log("Expiry + downgrade");

await test("expiry returns the user to Free with no write; notices show once each", async () => {
  const w = world();
  await startProTrial(w.trialDeps, USER, "paywall", "x");
  let record = (await w.trials.get(USER))!;

  w.setNow(new Date(NOW.getTime() + 10 * DAY));
  let state = proTrialState(record, new Date(NOW.getTime() + 10 * DAY))!;
  assert.equal(state.days_left, 4);
  assert.equal(state.show_ending_notice, false, `ending notice waits until ${PRO_TRIAL_ENDING_NOTICE_DAYS} days`);

  const in11 = new Date(NOW.getTime() + 11 * DAY);
  state = proTrialState(record, in11)!;
  assert.deepEqual([state.status, state.days_left, state.show_ending_notice], ["active", 3, true]);
  await w.trials.markNoticeSeen(USER, "ending", in11);
  record = (await w.trials.get(USER))!;
  assert.equal(proTrialState(record, new Date(NOW.getTime() + 13 * DAY))!.show_ending_notice, false, "shown once");

  const expired = new Date(record.trial_expires_at);
  w.setNow(expired);
  assert.equal(await w.plan(USER), "personal");
  state = proTrialState(record, expired)!;
  assert.deepEqual([state.status, state.days_left, state.show_expired_notice], ["expired", 0, true]);
  await w.trials.markNoticeSeen(USER, "expired", expired);
  assert.equal(proTrialState((await w.trials.get(USER))!, expired)!.show_expired_notice, false);
  assert.ok(await w.trials.get(USER), "trial row kept forever — it is the 'trial used' record");
});

await test("premium_trial_expired is claimed exactly once, and never before expiry", async () => {
  const w = world();
  await startProTrial(w.trialDeps, USER, "paywall", "x");
  assert.equal(await w.trials.claimExpiredRecording(USER, NOW), false, "not expired yet");
  const later = new Date(NOW.getTime() + 15 * DAY);
  assert.equal(await w.trials.claimExpiredRecording(USER, later), true);
  assert.equal(await w.trials.claimExpiredRecording(USER, later), false);
});

await test("downgrade: future plans stay stored but lock; the next shift still plans; Pro features off", async () => {
  const w = world();
  await startProTrial(w.trialDeps, USER, "paywall", "x");
  const upcoming = await listUpcomingShifts(w.deps, USER);
  assert.equal(upcoming.canPlanAhead, true, "trial unlocks Plan Ahead");
  // The furthest shift in the window — still upcoming (and not "next") when the trial ends.
  const future = upcoming.shifts.at(-1)!;
  assert.ok(!future.isNext && Date.parse(future.shift.start) > NOW.getTime() + PRO_TRIAL_DAYS * DAY);
  await fillShiftPlan(w.deps, USER, { shiftKey: future.shift.key, mode: "fill" }, picker);

  w.setNow(new Date(NOW.getTime() + PRO_TRIAL_DAYS * DAY));
  const locked = await failure(getShiftPlan(w.deps, USER, future.shift.key));
  assert.deepEqual(locked, { status: 403, code: "plan_ahead_required" });
  const stored = await w.plans.getPlan(USER, future.shift.key);
  assert.ok(stored.exists && stored.slots.length > 0, "future plan kept, not deleted");

  const next = await getShiftPlan(w.deps, USER);
  assert.ok(next.shift, "next-shift planning still works on Free");
  const res = await fillShiftPlan(w.deps, USER, { shiftKey: next.shift!.key, mode: "fill" }, picker);
  assert.ok(res.results.some((r) => r.ok));

  const features = PLAN_BASE_FEATURES[await w.plan(USER)];
  for (const f of ["plan_ahead", "run_it_back", "nutrition_goals", "meal_memory", "ingredient_preferences"] as const) {
    assert.ok(!features.includes(f), `${f} off after expiry`);
  }
  assert.ok(features.includes("meal_history"), "meal history keeps logging on Free");
});

await test("subscribe after expiry restores Pro (and the locked future plan) without a new trial", async () => {
  const w = world();
  await startProTrial(w.trialDeps, USER, "paywall", "x");
  const future = (await listUpcomingShifts(w.deps, USER)).shifts.at(-1)!;
  await fillShiftPlan(w.deps, USER, { shiftKey: future.shift.key, mode: "fill" }, picker);
  w.setNow(new Date(NOW.getTime() + 20 * DAY));
  assert.equal(await w.plan(USER), "personal");
  assert.equal((await failure(getShiftPlan(w.deps, USER, future.shift.key))).code, "plan_ahead_required");

  w.setSubscription(stripeSub("active"));
  assert.equal(await w.plan(USER), "firefighter_plus");
  const restored = await getShiftPlan(w.deps, USER, future.shift.key);
  assert.ok(restored.complete, "the plan made during the trial is back, intact");
  assert.deepEqual(
    proTrialEligibility({ record: await w.trials.get(USER), subscription: stripeSub("active"), now: NOW }),
    { eligible: false, reason: "trial_used" },
  );

  w.setSubscription(stripeSub("cancelled"));
  assert.equal(await w.plan(USER), "personal", "a cancelled subscription after an expired trial is Free");
});

await test("an active trial still grants Pro when the account's own row is plain Free (self-select personal)", () => {
  const trial = { ...proTrialWindow(NOW), user_id: USER } as ProTrialRecord;
  const freeRow: UserSubscription = { ...stripeSub("active"), plan_id: "personal", source: "self_select" };
  assert.equal(personalPlanFromSources({ subscription: freeRow, trial, now: NOW }), "firefighter_plus");
  assert.equal(personalPlanFromSources({ subscription: freeRow, trial, now: new Date(NOW.getTime() + 15 * DAY) }), "personal");
});

console.log("Analytics");

await test("trial analytics events are registered", () => {
  for (const e of ["premium_trial_started", "premium_trial_expired", "premium_trial_day_viewed", "premium_trial_upgrade_clicked"]) {
    assert.ok((ANALYTICS_EVENT_TYPES as readonly string[]).includes(e), e);
  }
});

console.log(`\n${passed} pro-trial tests passed`);
