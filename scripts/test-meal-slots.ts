/**
 * Deterministic meal-slot generation from shift instances.
 * Run: npx tsx scripts/test-meal-slots.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  blocksFromHours,
  generateMealSlots,
  getShiftsInRange,
  mealSlotPreferencesSchema,
  mealSlotsForShift,
  parseLocalDateTime,
  resolveMealWindow,
  wallToInstant,
  type MealSlot,
  type MealSlotPreferences,
  type PersonalSchedule,
} from "../shared/schedule/index.ts";

const TZ = "America/Toronto";
let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function shift(startLocal: string, hours: number, crewSize = 6, timezone = TZ) {
  const startWall = parseLocalDateTime(startLocal)!;
  const start = wallToInstant(startWall, timezone).instantMs;
  const end = wallToInstant(startWall + hours * 3_600_000, timezone).instantMs;
  return { start: new Date(start), end: new Date(end), timezone, crewSize, shiftKey: startLocal };
}

type Row = [type: string, local: string, day: number, optional: boolean];
const rows = (slots: MealSlot[]): Row[] => slots.map((s) => [s.type, s.plannedLocal, s.dayIndex, s.optional]);

/** Invariants every generated plan must satisfy. */
function assertInvariants(slots: MealSlot[], input: ReturnType<typeof shift>, prefs: MealSlotPreferences = {}) {
  const startMs = input.start.getTime();
  const endMs = input.end.getTime();
  const buffer = (prefs.departureBufferMinutes ?? 60) * 60_000;
  const keys = new Set<string>();
  for (const [i, s] of slots.entries()) {
    const t = Date.parse(s.plannedTime);
    assert.ok(t >= startMs && t <= endMs - buffer, `${s.key} inside the usable shift span`);
    if (i > 0) assert.ok(t >= Date.parse(slots[i - 1]!.plannedTime), "chronological order");
    assert.equal(keys.has(s.key), false, `duplicate key ${s.key}`);
    keys.add(s.key);
    assert.equal(s.crewSize, input.crewSize, "crew size inherited from shift");
    assert.equal(s.skipped, false);
    assert.equal(s.byo, false);
    assert.equal(s.customLabel, null);
    if (s.type === "late_night" && prefs.meals?.late_night?.mode !== "required") {
      assert.equal(s.optional, true, "late night optional by default");
    }
  }
  const lastBreakfast = slots.filter((s) => s.type === "breakfast").at(-1);
  if (lastBreakfast) {
    assert.ok(
      endMs - Date.parse(lastBreakfast.plannedTime) > buffer,
      "no breakfast squeezed in just before leaving",
    );
  }
  const perDay = new Map<string, number>();
  for (const s of slots) {
    const k = `${s.mealDate}|${s.customMealId ?? s.type}`;
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  assert.ok([...perDay.values()].every((n) => n === 1), "each meal type at most once per meal day");
}

const FULL_DAY = (date: string, day: number): Row[] => [
  ["breakfast", `${date}T07:30`, day, false],
  ["lunch", `${date}T12:00`, day, false],
  ["dinner", `${date}T18:00`, day, false],
  ["late_night", `${date}T23:30`, day, true],
];

console.log("Scenarios");

test("24h @ 0700: Breakfast → Lunch → Dinner → optional Late Night; no second breakfast", () => {
  const input = shift("2026-01-05T07:00", 24);
  const slots = generateMealSlots(input);
  assert.deepEqual(rows(slots), FULL_DAY("2026-01-05", 1));
  assert.equal(slots.some((s) => s.mealDate === "2026-01-06"), false);
  assert.ok(slots.every((s) => !s.adjusted));
  assertInvariants(slots, input);
});

test("24h @ 1100: Lunch → Dinner → Late Night (day 1), Breakfast next morning (day 2)", () => {
  const input = shift("2026-01-05T11:00", 24);
  const slots = generateMealSlots(input);
  assert.deepEqual(rows(slots), [
    ["lunch", "2026-01-05T12:00", 1, false],
    ["dinner", "2026-01-05T18:00", 1, false],
    ["late_night", "2026-01-05T23:30", 1, true],
    ["breakfast", "2026-01-06T07:30", 2, false],
  ]);
  assert.equal(slots.filter((s) => s.type === "lunch").length, 1, "no lunch on the way out at 11:00");
  assertInvariants(slots, input);
});

test("48h @ 0700: meal cycle repeats for two days, no breakfast on day 3", () => {
  const input = shift("2026-01-05T07:00", 48);
  const slots = generateMealSlots(input);
  assert.deepEqual(rows(slots), [...FULL_DAY("2026-01-05", 1), ...FULL_DAY("2026-01-06", 2)]);
  assertInvariants(slots, input);
});

test("72h @ 0700: three full meal cycles", () => {
  const input = shift("2026-01-05T07:00", 72);
  const slots = generateMealSlots(input);
  assert.deepEqual(rows(slots), [
    ...FULL_DAY("2026-01-05", 1),
    ...FULL_DAY("2026-01-06", 2),
    ...FULL_DAY("2026-01-07", 3),
  ]);
  assertInvariants(slots, input);
});

test("12h @ 0700: Breakfast → Lunch → Dinner, no late night", () => {
  const input = shift("2026-01-05T07:00", 12);
  const slots = generateMealSlots(input);
  assert.deepEqual(rows(slots), [
    ["breakfast", "2026-01-05T07:30", 1, false],
    ["lunch", "2026-01-05T12:00", 1, false],
    ["dinner", "2026-01-05T18:00", 1, false],
  ]);
  assertInvariants(slots, input);
});

test("12h @ 1900: Dinner (pushed to 19:30, optional) → Late Night; no morning breakfast", () => {
  const input = shift("2026-01-05T19:00", 12);
  const slots = generateMealSlots(input);
  assert.deepEqual(rows(slots), [
    ["dinner", "2026-01-05T19:30", 1, true],
    ["late_night", "2026-01-05T23:30", 1, true],
  ]);
  assert.equal(slots[0]!.adjusted, true);
  assertInvariants(slots, input);
});

test("10h @ 0800: Breakfast (pushed to 08:30, optional) → Lunch; dinner is after leaving", () => {
  const input = shift("2026-01-05T08:00", 10);
  const slots = generateMealSlots(input);
  assert.deepEqual(rows(slots), [
    ["breakfast", "2026-01-05T08:30", 1, true],
    ["lunch", "2026-01-05T12:00", 1, false],
  ]);
  assertInvariants(slots, input);
});

test("14h night (18:00 → 08:00): Dinner → Late Night, no breakfast before leaving at 08:00", () => {
  const input = shift("2026-01-05T18:00", 14);
  const slots = generateMealSlots(input);
  assert.deepEqual(rows(slots), [
    ["dinner", "2026-01-05T18:30", 1, true],
    ["late_night", "2026-01-05T23:30", 1, true],
  ]);
  assertInvariants(slots, input);
});

test("custom duration (9.5h @ 10:30): Lunch → Dinner", () => {
  const input = shift("2026-01-05T10:30", 9.5);
  const slots = generateMealSlots(input);
  assert.deepEqual(rows(slots), [
    ["lunch", "2026-01-05T12:00", 1, false],
    ["dinner", "2026-01-05T18:00", 1, false],
  ]);
  assertInvariants(slots, input);
});

test("custom preferences: custom meals, late night required/off, custom windows", () => {
  const input = shift("2026-01-05T07:00", 24);
  const prefs: MealSlotPreferences = {
    meals: {
      breakfast: { defaultTime: "08:00" },
      late_night: { mode: "required", defaultTime: "00:30" },
    },
    custom: [
      { id: "coffee", label: "Coffee & Snack", time: "15:00", optional: true },
      { id: "midnight", label: "Midnight Rations", time: "02:00" },
    ],
  };
  const slots = generateMealSlots(input, prefs);
  assert.deepEqual(
    slots.map((s) => [s.type, s.label, s.plannedLocal, s.dayIndex, s.optional]),
    [
      ["breakfast", "Breakfast", "2026-01-05T08:00", 1, false],
      ["lunch", "Lunch", "2026-01-05T12:00", 1, false],
      ["custom", "Coffee & Snack", "2026-01-05T15:00", 1, true],
      ["dinner", "Dinner", "2026-01-05T18:00", 1, false],
      ["late_night", "Late Night", "2026-01-06T00:30", 1, false],
      ["custom", "Midnight Rations", "2026-01-06T02:00", 1, false],
    ],
  );
  assert.equal(slots[2]!.key, "2026-01-05T07:00|custom:coffee|2026-01-05");
  assertInvariants(slots, input, prefs);

  const noLate = generateMealSlots(input, { meals: { late_night: { mode: "off" } } });
  assert.equal(noLate.some((s) => s.type === "late_night"), false);
  const optionalDinner = generateMealSlots(input, { meals: { dinner: { mode: "optional" } } });
  assert.equal(optionalDinner.find((s) => s.type === "dinner")!.optional, true);
  const requiredPushed = generateMealSlots(shift("2026-01-05T19:00", 12), { meals: { dinner: { mode: "required" } } });
  assert.deepEqual(rows(requiredPushed)[0], ["dinner", "2026-01-05T19:30", 1, false]);
});

test("custom grace/buffer change eligibility (buffer 0 still never pulls breakfast earlier)", () => {
  const input = shift("2026-01-05T07:00", 24);
  const zero = generateMealSlots(input, { arrivalGraceMinutes: 0, departureBufferMinutes: 0 });
  assert.deepEqual(rows(zero), FULL_DAY("2026-01-05", 1), "07:30 breakfast next day is after 07:00 end");
  const late = generateMealSlots(shift("2026-01-05T07:00", 12), { departureBufferMinutes: 90 });
  assert.equal(late.some((s) => s.type === "dinner"), false, "18:00 dinner is inside a 90-min departure buffer");
});

console.log("Day attribution, DST, integration");

test("late night after midnight belongs to the evening before", () => {
  const slots = generateMealSlots(shift("2026-01-05T19:00", 12), { meals: { late_night: { defaultTime: "01:00" } } });
  const late = slots.find((s) => s.type === "late_night")!;
  assert.equal(late.plannedLocal, "2026-01-06T01:00");
  assert.equal(late.mealDate, "2026-01-05");
  assert.equal(late.dayIndex, 1);
});

test("48h across spring forward keeps local meal times; no breakfast on the way out", () => {
  const input = shift("2026-03-07T07:00", 48);
  const slots = generateMealSlots(input);
  assert.deepEqual(rows(slots), [...FULL_DAY("2026-03-07", 1), ...FULL_DAY("2026-03-08", 2)]);
  assert.equal(slots[4]!.plannedTime, "2026-03-08T11:30:00.000Z", "07:30 EDT");
  assertInvariants(slots, input);
});

test("24h @ 0700 across fall back", () => {
  const input = shift("2026-10-31T07:00", 24);
  const slots = generateMealSlots(input);
  assert.deepEqual(rows(slots), FULL_DAY("2026-10-31", 1));
  assertInvariants(slots, input);
});

test("mealSlotsForShift: uses generated shifts, inherits crew overrides, skips cancelled", () => {
  const sched: PersonalSchedule = {
    timezone: TZ,
    anchorDate: "2026-01-05",
    startTime: "07:00",
    blocks: blocksFromHours([["on", 24], ["off", 48]]),
    defaultCrewSize: 5,
  };
  const shifts = getShiftsInRange(
    sched,
    [
      { id: "m", kind: "modify", shiftKey: "2026-01-08T07:00", crewSize: 9 },
      { id: "c", kind: "cancel", shiftKey: "2026-01-11T07:00" },
    ],
    { from: new Date("2026-01-05T00:00:00Z"), to: new Date("2026-01-12T00:00:00Z") },
    { includeCancelled: true },
  );
  const [first, modified, cancelled] = shifts;
  assert.deepEqual(mealSlotsForShift(first!).map((s) => s.crewSize), [5, 5, 5, 5]);
  assert.deepEqual(mealSlotsForShift(modified!).map((s) => s.crewSize), [9, 9, 9, 9]);
  assert.equal(cancelled!.status, "cancelled");
  assert.deepEqual(mealSlotsForShift(cancelled!), []);
  assert.equal(mealSlotsForShift(first!)[0]!.key, "2026-01-05T07:00|breakfast|2026-01-05");
});

test("deterministic: same input → identical output", () => {
  const input = shift("2026-01-05T07:00", 72);
  assert.deepEqual(generateMealSlots(input), generateMealSlots(input));
});

test("degenerate shifts produce no slots", () => {
  assert.deepEqual(generateMealSlots({ ...shift("2026-01-05T07:00", 1) }), []);
  const s = shift("2026-01-05T07:00", 24);
  assert.deepEqual(generateMealSlots({ ...s, end: s.start }), []);
});

console.log("Preferences");

test("resolveMealWindow handles midnight-crossing windows and bad input", () => {
  assert.deepEqual(resolveMealWindow("late_night", { windowStart: "21:00", windowEnd: "01:00", defaultTime: "00:00" }), {
    start: 21 * 60,
    defaultTime: 24 * 60,
    end: 25 * 60,
  });
  assert.deepEqual(resolveMealWindow("lunch", { defaultTime: "16:00" }), resolveMealWindow("lunch"), "default outside window falls back");
  assert.deepEqual(resolveMealWindow("dinner", { windowStart: "06:00", windowEnd: "23:00" }), resolveMealWindow("dinner"), "over-long window falls back");
});

test("preference schema", () => {
  assert.equal(mealSlotPreferencesSchema.safeParse({}).success, true);
  assert.equal(
    mealSlotPreferencesSchema.safeParse({
      meals: { late_night: { mode: "off" }, breakfast: { defaultTime: "08:00" } },
      custom: [{ id: "coffee", label: "Coffee", time: "15:00" }],
      departureBufferMinutes: 90,
    }).success,
    true,
  );
  assert.equal(mealSlotPreferencesSchema.safeParse({ meals: { brunch: {} } }).success, false);
  assert.equal(mealSlotPreferencesSchema.safeParse({ meals: { lunch: { defaultTime: "25:00" } } }).success, false);
  assert.equal(
    mealSlotPreferencesSchema.safeParse({ custom: [{ id: "a", label: "A", time: "10:00" }, { id: "a", label: "B", time: "11:00" }] }).success,
    false,
  );
});

test("migration 0013 persists preferences only (no generated slots)", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "server/db/pg-migrations/0013_user_meal_slot_preferences.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_meal_slot_preferences/);
  assert.match(sql, /ON DELETE CASCADE/);
  assert.doesNotMatch(sql, /CREATE TABLE IF NOT EXISTS \w*meal_slots\b/);
  assert.doesNotMatch(sql, /\bDROP\b/i);
});

console.log(`\n${passed} meal-slot tests passed`);
