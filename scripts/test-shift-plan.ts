/**
 * Shift Planner v2 — plannable shift, meal-slot plan state, auto-fill,
 * persistence across reloads, and the real curated selection pipeline.
 * Run: npx tsx scripts/test-shift-plan.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { PersonalSchedule } from "../shared/schedule/types.ts";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.ts";
import {
  applySlotPatch,
  autofillTargets,
  buildSlotGenerateRequest,
  defaultSlotState,
  isPlanComplete,
  plannableShift,
  slotSelectionProfile,
} from "../shared/shift-plan/plan.ts";
import { shiftPlanFillSchema, shiftPlanSlotPatchSchema } from "../shared/shift-plan/schema.ts";
import { pickBreakfast, type BreakfastCandidate } from "../shared/shift-plan/breakfast.ts";
import type { PlannedMealSlot, PlannedRecipe, ShiftPlanView } from "../shared/shift-plan/types.ts";
import { createMemoryShiftPlanRepo, type ShiftPlanRepo } from "../server/shift-plan/store.ts";
import {
  ShiftPlanError,
  fillShiftPlan,
  getShiftPlan,
  patchShiftPlanSlot,
  type ShiftPlanDeps,
  type SlotPicker,
} from "../server/shift-plan/service.ts";

const TZ = "America/Toronto";
const USER = "user-a";
let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function schedule(onHours: number, offHours: number, startTime = "07:00", crew = 6): PersonalSchedule {
  return {
    timezone: TZ,
    anchorDate: "2026-10-08",
    startTime,
    blocks: [
      { kind: "on", minutes: onHours * 60 },
      { kind: "off", minutes: offHours * 60 },
    ],
    defaultCrewSize: crew,
  };
}

/** 23:30 local the evening before the anchor — the previous 07:00 shift (pattern repeats backwards) has ended. */
const NOW = new Date("2026-10-08T03:30:00Z");

const RECIPES: Record<string, PlannedRecipe> = Object.fromEntries(
  ["eggs-a", "eggs-b", "eggs-c", "lunch-a", "lunch-b", "lunch-c", "dinner-a", "dinner-b", "dinner-c", "manual-pick"].map(
    (slug) => [slug, { slug, title: slug.toUpperCase(), imageUrl: `/images/thumbs/${slug}.webp`, totalMinutes: 30, path: `/recipes/${slug}` }],
  ),
);

function makeDeps(s: PersonalSchedule | null, repo: ShiftPlanRepo, now = NOW): ShiftPlanDeps {
  return {
    repo,
    loadSchedule: async () => (s ? { schedule: s, overrides: [], mealPreferences: {} } : null),
    resolveRecipe: (slug) => RECIPES[slug] ?? null,
    isSelectableSlug: (slug) => slug in RECIPES,
    now: () => now,
  };
}

/** Deterministic fake: breakfast → eggs-*, everything else by type; honors avoid lists like the real picker. */
function fakePicker(log: Array<{ key: string; crew: number; hard: string[]; soft: string[] }> = []): SlotPicker {
  return async (slot, avoid) => {
    log.push({ key: slot.key, crew: slot.crewSize, hard: avoid.hard, soft: avoid.soft });
    const prefix = slotSelectionProfile(slot).mealType === "breakfast" ? "eggs" : slot.type === "lunch" ? "lunch" : "dinner";
    const pool = ["a", "b", "c"].map((x) => `${prefix}-${x}`);
    return (
      pool.find((s) => !avoid.hard.includes(s) && !avoid.soft.includes(s)) ??
      pool.find((s) => !avoid.hard.includes(s)) ??
      null
    );
  };
}

const types = (v: ShiftPlanView) => v.slots.map((s) => `${s.type}@${s.plannedLocal.slice(11)}${s.dayIndex > 1 ? `/d${s.dayIndex}` : ""}`);

console.log("Plannable shift + slots");

await test("12h day shift: breakfast, lunch, dinner — no late night", async () => {
  const v = await getShiftPlan(makeDeps(schedule(12, 12), createMemoryShiftPlanRepo()), USER);
  assert.equal(v.shift?.key, "2026-10-08T07:00");
  assert.equal(v.shift?.scheduledMinutes, 720);
  assert.deepEqual(types(v), ["breakfast@07:30", "lunch@12:00", "dinner@18:00"]);
  assert.equal(v.started, false);
  assert.equal(v.complete, false);
});

await test("12h night shift: dinner pushed to arrival (shorter cook time) + optional late night", async () => {
  const noon = new Date("2026-10-08T16:00:00Z");
  const v = await getShiftPlan(makeDeps(schedule(12, 12, "19:00"), createMemoryShiftPlanRepo(), noon), USER);
  assert.equal(v.shift?.key, "2026-10-08T19:00");
  assert.deepEqual(types(v), ["dinner@19:30", "late_night@23:30"]);
  const dinner = v.slots[0]!;
  assert.equal(dinner.adjusted, true);
  assert.equal(slotSelectionProfile(dinner).time_available, "30-45", "pushed dinner gets one notch less time");
  assert.equal(v.slots[1]!.optional, true);
});

await test("24h shift: four meals, no second breakfast before going home", async () => {
  const v = await getShiftPlan(makeDeps(schedule(24, 48), createMemoryShiftPlanRepo()), USER);
  assert.equal(v.shift?.scheduledMinutes, 1440);
  assert.deepEqual(types(v), ["breakfast@07:30", "lunch@12:00", "dinner@18:00", "late_night@23:30"]);
});

await test("48h shift: two full meal days", async () => {
  const v = await getShiftPlan(makeDeps(schedule(48, 96), createMemoryShiftPlanRepo()), USER);
  assert.equal(v.shift?.scheduledMinutes, 2880);
  assert.deepEqual(types(v), [
    "breakfast@07:30",
    "lunch@12:00",
    "dinner@18:00",
    "late_night@23:30",
    "breakfast@07:30/d2",
    "lunch@12:00/d2",
    "dinner@18:00/d2",
    "late_night@23:30/d2",
  ]);
});

await test("shift under way is the one planned; no schedule → hasSchedule false", async () => {
  const s = schedule(24, 48);
  const midShift = new Date("2026-10-08T20:00:00Z");
  assert.equal(plannableShift(s, [], midShift)?.key, "2026-10-08T07:00");
  const none = await getShiftPlan(makeDeps(null, createMemoryShiftPlanRepo()), USER);
  assert.deepEqual([none.hasSchedule, none.shift], [false, null]);
});

console.log("Plan actions + persistence");

await test("auto-fill whole 24h shift: every slot filled, no repeats, plan created once", async () => {
  const repo = createMemoryShiftPlanRepo();
  const deps = makeDeps(schedule(24, 48), repo);
  const shiftKey = "2026-10-08T07:00";
  const res = await fillShiftPlan(deps, USER, { shiftKey, mode: "fill" }, fakePicker());
  assert.equal(res.created, true);
  assert.equal(res.results.every((r) => r.ok), true);
  const slugs = res.plan.slots.map((s) => s.recipe?.slug);
  assert.deepEqual(slugs, ["eggs-a", "lunch-a", "dinner-a", "dinner-b"], "late night avoids tonight's dinner");
  assert.equal(res.plan.complete, true);
  assert.equal(res.plan.slots.every((s) => s.selectionSource === "auto" && !s.locked), true);
  const again = await fillShiftPlan(deps, USER, { shiftKey, mode: "fill" }, fakePicker());
  assert.equal(again.created, false);
});

await test("refresh persistence: a fresh load (new deps, same store) returns the saved plan", async () => {
  const repo = createMemoryShiftPlanRepo();
  const shiftKey = "2026-10-08T07:00";
  await fillShiftPlan(makeDeps(schedule(24, 48), repo), USER, { shiftKey, mode: "fill" }, fakePicker());
  const lunchKey = `${shiftKey}|lunch|2026-10-08`;
  await patchShiftPlanSlot(makeDeps(schedule(24, 48), repo), USER, { shiftKey, slotKey: lunchKey, crewSizeOverride: 3 });
  const reloaded = await getShiftPlan(makeDeps(schedule(24, 48), repo), USER);
  assert.equal(reloaded.started, true);
  assert.deepEqual(
    reloaded.slots.map((s) => [s.recipe?.slug, s.crewSize]),
    [["eggs-a", 6], ["lunch-a", 3], ["dinner-a", 6], ["dinner-b", 6]],
  );
  const other = await getShiftPlan(makeDeps(schedule(24, 48), repo), "user-b");
  assert.equal(other.started, false, "plans are per user");
  assert.equal(other.slots.every((s) => s.recipe == null), true);
});

await test("individual crew-size override: only that meal, reaches the picker, reset when equal to shift", async () => {
  const repo = createMemoryShiftPlanRepo();
  const deps = makeDeps(schedule(24, 48), repo);
  const shiftKey = "2026-10-08T07:00";
  const lateKey = `${shiftKey}|late_night|2026-10-08`;
  const r1 = await patchShiftPlanSlot(deps, USER, { shiftKey, slotKey: lateKey, crewSizeOverride: 2 });
  assert.equal(r1.created, true);
  const late = r1.plan.slots.find((s) => s.key === lateKey)!;
  assert.deepEqual([late.crewSize, late.shiftCrewSize, late.crewSizeOverride], [2, 6, 2]);
  assert.equal(r1.plan.slots.filter((s) => s.key !== lateKey).every((s) => s.crewSize === 6), true);

  const log: Array<{ key: string; crew: number; hard: string[]; soft: string[] }> = [];
  await fillShiftPlan(deps, USER, { shiftKey, mode: "fill" }, fakePicker(log));
  assert.equal(log.find((l) => l.key === lateKey)?.crew, 2);
  assert.equal(buildSlotGenerateRequest(buildGenerateRequestInput(), late).crew_size, 2);

  const r2 = await patchShiftPlanSlot(deps, USER, { shiftKey, slotKey: lateKey, crewSizeOverride: 6 });
  assert.equal(r2.plan.slots.find((s) => s.key === lateKey)!.crewSizeOverride, null);
});

await test("skipped meal: not auto-filled, counts as decided, undo restores the recipe", async () => {
  const repo = createMemoryShiftPlanRepo();
  const deps = makeDeps(schedule(12, 12), repo);
  const shiftKey = "2026-10-08T07:00";
  const lunchKey = `${shiftKey}|lunch|2026-10-08`;
  await fillShiftPlan(deps, USER, { shiftKey, mode: "fill" }, fakePicker());
  const skipped = await patchShiftPlanSlot(deps, USER, { shiftKey, slotKey: lunchKey, skipped: true });
  const lunch = skipped.plan.slots.find((s) => s.key === lunchKey)!;
  assert.deepEqual([lunch.skipped, lunch.byo], [true, false]);
  assert.equal(skipped.plan.complete, true);

  const log: Array<{ key: string; crew: number; hard: string[]; soft: string[] }> = [];
  await fillShiftPlan(deps, USER, { shiftKey, mode: "fill" }, fakePicker(log));
  assert.equal(log.some((l) => l.key === lunchKey), false, "auto-fill leaves skipped meals alone");

  const byo = await patchShiftPlanSlot(deps, USER, { shiftKey, slotKey: lunchKey, byo: true });
  assert.deepEqual(
    [byo.plan.slots.find((s) => s.key === lunchKey)!.skipped, byo.plan.slots.find((s) => s.key === lunchKey)!.byo],
    [false, true],
    "skip and BYO are exclusive",
  );
  const undone = await patchShiftPlanSlot(deps, USER, { shiftKey, slotKey: lunchKey, byo: false });
  assert.equal(undone.plan.slots.find((s) => s.key === lunchKey)!.recipe?.slug, "lunch-a");
});

await test("manual selection locks the meal; auto-fill keeps it; explicit swap replaces it", async () => {
  const repo = createMemoryShiftPlanRepo();
  const deps = makeDeps(schedule(12, 12), repo);
  const shiftKey = "2026-10-08T07:00";
  const dinnerKey = `${shiftKey}|dinner|2026-10-08`;
  const picked = await patchShiftPlanSlot(deps, USER, { shiftKey, slotKey: dinnerKey, recipeSlug: "manual-pick" });
  const dinner = picked.plan.slots.find((s) => s.key === dinnerKey)!;
  assert.deepEqual([dinner.recipe?.slug, dinner.selectionSource, dinner.locked], ["manual-pick", "manual", true]);

  const log: Array<{ key: string; crew: number; hard: string[]; soft: string[] }> = [];
  const filled = await fillShiftPlan(deps, USER, { shiftKey, mode: "fill" }, fakePicker(log));
  assert.equal(log.some((l) => l.key === dinnerKey), false);
  assert.equal(filled.plan.slots.find((s) => s.key === dinnerKey)!.recipe?.slug, "manual-pick");
  assert.ok(log.every((l) => l.soft.includes("manual-pick")), "other slots avoid the locked dinner");

  const swapLog: Array<{ key: string; crew: number; hard: string[]; soft: string[] }> = [];
  const swapped = await fillShiftPlan(
    deps,
    USER,
    { shiftKey, mode: "swap", slotKeys: [dinnerKey], excludeSlugs: ["dinner-a"] },
    fakePicker(swapLog),
  );
  assert.deepEqual(swapLog[0]!.hard, ["manual-pick", "dinner-a"], "swap never re-serves current or seen");
  assert.equal(swapped.results[0]!.previousSlug, "manual-pick");
  assert.equal(swapped.plan.slots.find((s) => s.key === dinnerKey)!.recipe?.slug, "dinner-b");

  const unlocked = await patchShiftPlanSlot(deps, USER, { shiftKey, slotKey: dinnerKey, locked: false });
  assert.equal(unlocked.plan.slots.find((s) => s.key === dinnerKey)!.locked, false);
});

await test("pick one slot fills only that slot", async () => {
  const deps = makeDeps(schedule(24, 48), createMemoryShiftPlanRepo());
  const shiftKey = "2026-10-08T07:00";
  const lunchKey = `${shiftKey}|lunch|2026-10-08`;
  const res = await fillShiftPlan(deps, USER, { shiftKey, mode: "fill", slotKeys: [lunchKey] }, fakePicker());
  assert.deepEqual(res.plan.slots.map((s) => s.recipe?.slug ?? null), [null, "lunch-a", null, null]);
  assert.equal(res.plan.complete, false);
});

await test("optional late night may stay open and the plan is still complete", async () => {
  const deps = makeDeps(schedule(24, 48), createMemoryShiftPlanRepo());
  const shiftKey = "2026-10-08T07:00";
  const keys = ["breakfast", "lunch", "dinner"].map((t) => `${shiftKey}|${t}|2026-10-08`);
  const res = await fillShiftPlan(deps, USER, { shiftKey, mode: "fill", slotKeys: keys }, fakePicker());
  assert.equal(res.plan.slots.at(-1)!.recipe, null);
  assert.equal(res.plan.complete, true);
});

await test("guards: stale shift → 409, unknown slot → 404, non-catalog recipe → 400, swap needs a slot", async () => {
  const deps = makeDeps(schedule(24, 48), createMemoryShiftPlanRepo());
  const shiftKey = "2026-10-08T07:00";
  const status = async (p: Promise<unknown>) => {
    try {
      await p;
      return 200;
    } catch (err) {
      assert.ok(err instanceof ShiftPlanError);
      return err.status;
    }
  };
  assert.equal(await status(fillShiftPlan(deps, USER, { shiftKey: "2026-10-11T07:00", mode: "fill" }, fakePicker())), 409);
  assert.equal(await status(patchShiftPlanSlot(deps, USER, { shiftKey, slotKey: "nope", skipped: true })), 404);
  assert.equal(
    await status(patchShiftPlanSlot(deps, USER, { shiftKey, slotKey: `${shiftKey}|lunch|2026-10-08`, recipeSlug: "not-real" })),
    400,
  );
  assert.equal(await status(fillShiftPlan(deps, USER, { shiftKey, mode: "swap" }, fakePicker())), 400);
  const noSchedule = makeDeps(null, createMemoryShiftPlanRepo());
  assert.equal(await status(fillShiftPlan(noSchedule, USER, { shiftKey, mode: "fill" }, fakePicker())), 404);
});

await test("a slot with nothing eligible reports failure and stays empty", async () => {
  const deps = makeDeps(schedule(12, 12), createMemoryShiftPlanRepo());
  const shiftKey = "2026-10-08T07:00";
  const res = await fillShiftPlan(deps, USER, { shiftKey, mode: "fill" }, async (slot) =>
    slot.type === "breakfast" ? null : "dinner-a",
  );
  assert.deepEqual(res.results.map((r) => r.ok), [false, true, true]);
  assert.equal(res.plan.slots[0]!.recipe, null);
});

console.log("Pure rules");

await test("applySlotPatch / autofillTargets / completion", () => {
  const base = defaultSlotState("k");
  const manual = applySlotPatch(base, { recipeSlug: "x" }, 6);
  assert.deepEqual([manual.selectionSource, manual.locked], ["manual", true]);
  const auto = applySlotPatch(base, { recipeSlug: "x", selectionSource: "auto" }, 6);
  assert.equal(auto.locked, false);
  assert.equal(applySlotPatch(manual, { recipeSlug: null }, 6).locked, false, "clearing unlocks");
  assert.equal(applySlotPatch(base, { locked: true }, 6).locked, false, "empty slot can't lock");
  const skippedPick = applySlotPatch({ ...base, skipped: true }, { recipeSlug: "x" }, 6);
  assert.equal(skippedPick.skipped, false, "choosing a recipe un-skips");

  const slot = (o: Partial<PlannedMealSlot>) => ({ key: o.key ?? "s", locked: false, skipped: false, byo: false, recipe: null, optional: false, ...o }) as PlannedMealSlot;
  const slots = [slot({ key: "a", locked: true }), slot({ key: "b", skipped: true }), slot({ key: "c", byo: true }), slot({ key: "d" })];
  assert.deepEqual(autofillTargets(slots).map((s) => s.key), ["d"]);
  assert.deepEqual(autofillTargets(slots, ["a", "b"]).map((s) => s.key), ["a"], "explicit pick may touch a locked slot");
  assert.equal(isPlanComplete([]), false);
  assert.equal(isPlanComplete([slot({ optional: true })]), false, "nothing decided");
});

await test("slot request keeps hard restrictions, resets session choices, clamps crew", () => {
  const base = buildGenerateRequestInput({
    allergens_to_avoid: ["peanuts"],
    dietary_restrictions: ["glutenFree"],
    foods_to_avoid: ["mushrooms"],
    appliances: ["oven"],
    protein: "chicken",
    time_window: "under_30",
    meal_style: "bbq",
  });
  const slot = { type: "breakfast" as const, plannedLocal: "2026-10-08T07:30", adjusted: false, crewSize: 40 };
  const req = buildSlotGenerateRequest(base, slot, ["seen-a", "seen-a"]);
  assert.deepEqual(req.allergens_to_avoid, ["peanuts"]);
  assert.deepEqual(req.dietary_restrictions, ["glutenFree"]);
  assert.deepEqual(req.foods_to_avoid, ["mushrooms"]);
  assert.deepEqual(req.appliances, ["oven"]);
  assert.deepEqual([req.protein, req.time_window, req.meal_style], ["any", "any", "any"]);
  assert.deepEqual([req.meal_format, req.time_available, req.enforce_time_bucket], ["breakfast", "20-30", true]);
  assert.equal(req.crew_size, 20);
  assert.equal(buildSlotGenerateRequest(base, { ...slot, crewSize: 1 }).crew_size, 2);
  assert.deepEqual(req.session_feedback?.avoid_slugs, ["seen-a"]);
  const veg = buildSlotGenerateRequest(buildGenerateRequestInput({ protein: "vegetarian" }), slot);
  assert.deepEqual([veg.protein, veg.vegetarian_swap_needed], ["vegetarian", true]);
  const dinner = buildSlotGenerateRequest(base, { type: "dinner", plannedLocal: "2026-10-08T18:00", adjusted: false, crewSize: 6 });
  assert.deepEqual([dinner.firehall_category, dinner.time_available], ["crew_favorites", "45-60"]);
  const custom = slotSelectionProfile({ type: "custom", plannedLocal: "2026-10-09T02:00", adjusted: false });
  assert.equal(custom.mealType, "late_night");
});

await test("API schemas", () => {
  assert.equal(shiftPlanSlotPatchSchema.safeParse({ shiftKey: "k", slotKey: "s", recipeSlug: "Chicken-Tacos" }).success, true);
  assert.equal(shiftPlanSlotPatchSchema.safeParse({ shiftKey: "k", slotKey: "s", recipeSlug: "../etc" }).success, false);
  assert.equal(shiftPlanSlotPatchSchema.safeParse({ shiftKey: "k", slotKey: "s", crewSizeOverride: 0 }).success, false);
  assert.equal(shiftPlanSlotPatchSchema.safeParse({ shiftKey: "k", slotKey: "s", userId: "x" }).success, false, "strict");
  assert.equal(shiftPlanFillSchema.safeParse({ shiftKey: "k", mode: "fill", base: {} }).success, true);
  assert.equal(shiftPlanFillSchema.safeParse({ shiftKey: "k", mode: "auto", base: {} }).success, false);
});

await test("migration 0014 creates the plan + slot tables", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "server/db/pg-migrations/0014_user_shift_plans.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_shift_plans/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_shift_plan_slots/);
  assert.match(sql, /REFERENCES users\(user_id\) ON DELETE CASCADE/);
  for (const col of ["recipe_slug", "selection_source", "locked", "skipped", "byo", "crew_size_override"]) {
    assert.match(sql, new RegExp(`\\b${col}\\b`));
  }
});

console.log("Real curated pipeline (no AI)");

const { initCacheStore } = await import("../server/cache-store.ts");
const { initCuratedRecipeStore } = await import("../server/curated-recipe-store.ts");
const { getApprovedCatalog } = await import("../server/approved-catalog-cache.ts");
const { createSlotPicker } = await import("../server/shift-plan/picker.ts");
const { flushSqliteToDisk, releaseSqliteTimersForTests } = await import("../server/sqlite.ts");
await initCacheStore();
await initCuratedRecipeStore();

const catalog = new Map(getApprovedCatalog().recipes.map((r) => [r.slug, r]));

async function fillWithRealPipeline(s: PersonalSchedule, base = buildGenerateRequestInput()) {
  const deps = makeDeps(s, createMemoryShiftPlanRepo());
  deps.resolveRecipe = (slug) => ({ slug, title: slug, imageUrl: null, totalMinutes: null, path: `/recipes/${slug}` });
  const shiftKey = (await getShiftPlan(deps, USER)).shift!.key;
  const picker = createSlotPicker({ base, recentSlugs: [], sessionKey: "test-shift-plan" });
  return fillShiftPlan(deps, USER, { shiftKey, mode: "fill" }, picker);
}

await test("48h shift auto-fills all 8 meals from the catalog with no repeats", async () => {
  const res = await fillWithRealPipeline(schedule(48, 96));
  const slugs = res.plan.slots.map((s) => s.recipe?.slug);
  assert.equal(slugs.length, 8);
  assert.equal(slugs.every(Boolean), true, `all filled: ${JSON.stringify(res.results)}`);
  assert.equal(new Set(slugs).size, 8, "no meal repeats within the shift");
  for (const slug of slugs) assert.ok(catalog.has(slug!), `${slug} is a browsable catalog recipe`);
  const breakfasts = res.plan.slots.filter((s) => s.type === "breakfast").map((s) => catalog.get(s.recipe!.slug)!);
  assert.ok(breakfasts.every((b) => b.mealFormat === "breakfast"), "breakfast slots get breakfasts");
});

await test("dietary restriction is respected on every auto-filled meal (vegetarian)", async () => {
  const base = buildGenerateRequestInput({ dietary_restrictions: ["vegetarian"] });
  const res = await fillWithRealPipeline(schedule(24, 48), base);
  for (const slot of res.plan.slots) {
    if (!slot.recipe) continue;
    const entry = catalog.get(slot.recipe.slug);
    assert.equal(entry?.dietarySummary?.flags.vegetarian, true, `${slot.recipe.slug} is vegetarian`);
  }
  assert.ok(res.plan.slots.some((s) => s.recipe), "at least one vegetarian meal found");
});

await test("allergen (eggs) excluded from breakfast and every other meal", async () => {
  const base = buildGenerateRequestInput({ allergens_to_avoid: ["eggs"], dietary_restrictions: ["eggFree"] });
  const res = await fillWithRealPipeline(schedule(24, 48), base);
  for (const slot of res.plan.slots) {
    if (!slot.recipe) continue;
    assert.equal(catalog.get(slot.recipe.slug)?.dietarySummary?.flags.eggFree, true, `${slot.recipe.slug} is egg-free`);
  }
});

await test("breakfast picker: hard filters, time budget, shift duplicates, recency", () => {
  const veg = { confidence: "high", flags: { vegetarian: true, eggFree: false } } as unknown as BreakfastCandidate["dietarySummary"];
  const cands: BreakfastCandidate[] = [
    { slug: "slow-hash", totalMinutes: 90, dietarySummary: veg, avoidTags: [] },
    { slug: "quick-oats", totalMinutes: 15, dietarySummary: veg, avoidTags: ["mushrooms"] },
    { slug: "egg-wrap", totalMinutes: 20, avoidTags: [] },
    { slug: "toast", totalMinutes: 10, dietarySummary: veg, avoidTags: [] },
  ];
  const req = buildSlotGenerateRequest(buildGenerateRequestInput({ dietary_restrictions: ["vegetarian"] }), {
    type: "breakfast",
    plannedLocal: "2026-10-08T07:30",
    adjusted: false,
    crewSize: 6,
  });
  const none = { hard: [] as string[], soft: [] as string[] };
  const pickWith = (r = req, avoid = none, recent: string[] = []) => pickBreakfast(cands, r, { avoid, recentSlugs: recent, seed: "s" });
  for (let i = 0; i < 20; i++) {
    const slug = pickBreakfast(cands, req, { avoid: none, seed: `seed-${i}` });
    assert.ok(slug === "quick-oats" || slug === "toast", `${slug}: vegetarian (high confidence) and within 20-30 min`);
  }
  assert.equal(pickWith({ ...req, foods_to_avoid: ["mushrooms"] }), "toast", "foods to avoid");
  assert.equal(pickWith(req, { hard: ["toast", "quick-oats"], soft: [] }), "slow-hash", "relaxes time before failing");
  assert.equal(pickWith(req, { hard: ["quick-oats"], soft: ["toast"] }), "toast", "duplicate allowed only as a last resort");
  assert.equal(pickWith({ ...req, allergens_to_avoid: ["eggs"] }), null, "allergen maps to eggFree flag");
  const counts = new Map<string, number>();
  for (let i = 0; i < 200; i++) {
    const s = pickBreakfast(cands, req, { avoid: none, recentSlugs: ["toast"], seed: `r-${i}` })!;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  assert.ok((counts.get("quick-oats") ?? 0) > (counts.get("toast") ?? 0), "recently cooked is less likely");
});

await test("same inputs → same plan (deterministic)", async () => {
  const a = await fillWithRealPipeline(schedule(24, 48));
  const b = await fillWithRealPipeline(schedule(24, 48));
  assert.deepEqual(
    a.plan.slots.map((s) => s.recipe?.slug),
    b.plan.slots.map((s) => s.recipe?.slug),
  );
});

flushSqliteToDisk();
releaseSqliteTimersForTests();
console.log(`\n${passed} shift-plan tests passed`);
process.exit(0);
