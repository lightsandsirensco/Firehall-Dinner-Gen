/**
 * Personal schedule engine — patterns, overrides, timezones/DST.
 * Run: npx tsx scripts/test-schedule-engine.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SCHEDULE_PRESETS,
  blocksFromDayCodes,
  blocksFromHours,
  cycleMinutes,
  findPatternOccurrence,
  getCurrentShift,
  getNextShift,
  getSchedulePreset,
  getShiftsInRange,
  personalScheduleInputSchema,
  scheduleOverrideInputSchema,
  validateOverrideForSchedule,
  validatePersonalSchedule,
  wallToInstant,
  type PersonalSchedule,
  type ScheduleOverride,
  type ShiftInstance,
} from "../shared/schedule/index.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const TORONTO = "America/Toronto";
const at = (iso: string) => new Date(iso);
const range = (from: string, to: string) => ({ from: at(from), to: at(to) });
const starts = (shifts: ShiftInstance[]) => shifts.map((s) => s.startLocal);

function schedule(partial: Partial<PersonalSchedule> & Pick<PersonalSchedule, "blocks">): PersonalSchedule {
  return {
    timezone: "UTC",
    anchorDate: "2026-01-01",
    startTime: "07:00",
    defaultCrewSize: 4,
    ...partial,
  };
}

const s2448 = schedule({ blocks: blocksFromHours([["on", 24], ["off", 48]]) });
const s2472 = schedule({ blocks: blocksFromHours([["on", 24], ["off", 72]]) });
const s4896 = schedule({ blocks: blocksFromHours([["on", 48], ["off", 96]]) });

console.log("Rotations");

test("24/48: a 24 every third day at the same clock time", () => {
  const shifts = getShiftsInRange(s2448, [], range("2026-01-01T00:00:00Z", "2026-01-11T00:00:00Z"));
  assert.deepEqual(starts(shifts), [
    "2026-01-01T07:00",
    "2026-01-04T07:00",
    "2026-01-07T07:00",
    "2026-01-10T07:00",
  ]);
  for (const s of shifts) {
    assert.equal(s.scheduledMinutes, 1440);
    assert.equal(s.elapsedMinutes, 1440);
    assert.equal(s.crewSize, 4);
    assert.equal(s.status, "scheduled");
    assert.equal(s.source, "pattern");
  }
  assert.equal(shifts[1]!.end, "2026-01-05T07:00:00.000Z");
});

test("24/72: a 24 every fourth day", () => {
  const shifts = getShiftsInRange(s2472, [], range("2026-01-01T00:00:00Z", "2026-01-13T00:00:00Z"));
  assert.deepEqual(starts(shifts), ["2026-01-01T07:00", "2026-01-05T07:00", "2026-01-09T07:00"]);
});

test("48/96: a 48 every sixth day; a shift already in progress overlaps the range", () => {
  const shifts = getShiftsInRange(s4896, [], range("2026-01-02T00:00:00Z", "2026-01-14T00:00:00Z"));
  assert.deepEqual(starts(shifts), ["2026-01-01T07:00", "2026-01-07T07:00", "2026-01-13T07:00"]);
  assert.equal(shifts[0]!.scheduledMinutes, 2880);
  assert.equal(shifts[0]!.endLocal, "2026-01-03T07:00");
});

test("range boundaries: end is exclusive, a shift ending exactly at `from` is excluded", () => {
  const shifts = getShiftsInRange(s2448, [], range("2026-01-02T07:00:00Z", "2026-01-04T07:00:00Z"));
  assert.equal(shifts.length, 0);
  const touching = getShiftsInRange(s2448, [], range("2026-01-02T06:59:00Z", "2026-01-04T07:01:00Z"));
  assert.deepEqual(starts(touching), ["2026-01-01T07:00", "2026-01-04T07:00"]);
});

test("12-hour 4 on / 4 off: four 12s at 07:00 then four days off", () => {
  const sched = schedule({ blocks: getSchedulePreset("12h-4on-4off")!.blocks });
  const shifts = getShiftsInRange(sched, [], range("2026-01-01T00:00:00Z", "2026-01-17T00:00:00Z"));
  assert.deepEqual(starts(shifts), [
    "2026-01-01T07:00",
    "2026-01-02T07:00",
    "2026-01-03T07:00",
    "2026-01-04T07:00",
    "2026-01-09T07:00",
    "2026-01-10T07:00",
    "2026-01-11T07:00",
    "2026-01-12T07:00",
  ]);
  assert.ok(shifts.every((s) => s.scheduledMinutes === 720 && s.endLocal.endsWith("T19:00")));
});

test("12-hour 2 days / 2 nights / 4 off: nights cross midnight", () => {
  const sched = schedule({ blocks: getSchedulePreset("12h-2d-2n-4off")!.blocks });
  const shifts = getShiftsInRange(sched, [], range("2026-01-01T00:00:00Z", "2026-01-09T00:00:00Z"));
  assert.deepEqual(
    shifts.map((s) => [s.startLocal, s.endLocal]),
    [
      ["2026-01-01T07:00", "2026-01-01T19:00"],
      ["2026-01-02T07:00", "2026-01-02T19:00"],
      ["2026-01-03T19:00", "2026-01-04T07:00"],
      ["2026-01-04T19:00", "2026-01-05T07:00"],
    ],
  );
  const next = getShiftsInRange(sched, [], range("2026-01-09T00:00:00Z", "2026-01-10T00:00:00Z"));
  assert.deepEqual(starts(next), ["2026-01-09T07:00"], "cycle repeats every 8 days");
});

test("10/14: 10-hour days and 14-hour nights", () => {
  const sched = schedule({ startTime: "08:00", blocks: getSchedulePreset("10-14-2d-2n-4off")!.blocks });
  const shifts = getShiftsInRange(sched, [], range("2026-01-01T00:00:00Z", "2026-01-09T00:00:00Z"));
  assert.deepEqual(
    shifts.map((s) => [s.startLocal, s.endLocal, s.scheduledMinutes]),
    [
      ["2026-01-01T08:00", "2026-01-01T18:00", 600],
      ["2026-01-02T08:00", "2026-01-02T18:00", 600],
      ["2026-01-03T18:00", "2026-01-04T08:00", 840],
      ["2026-01-04T18:00", "2026-01-05T08:00", 840],
    ],
  );
});

test("8-hour 5 on / 2 off anchored on a Monday", () => {
  const sched = schedule({ anchorDate: "2026-01-05", startTime: "08:00", blocks: getSchedulePreset("8h-5on-2off")!.blocks });
  const shifts = getShiftsInRange(sched, [], range("2026-01-05T00:00:00Z", "2026-01-19T00:00:00Z"));
  assert.equal(shifts.length, 10);
  const weekdays = shifts.map((s) => new Date(s.start).getUTCDay());
  assert.ok(weekdays.every((d) => d >= 1 && d <= 5), "never on a weekend");
  assert.ok(shifts.every((s) => s.scheduledMinutes === 480));
});

test("custom sequence with odd durations (9.5h, 14h, back-to-back ONs)", () => {
  const sched = schedule({
    blocks: [
      { kind: "on", minutes: 570 },
      { kind: "on", minutes: 840 },
      { kind: "off", minutes: 2790 },
    ],
  });
  assert.equal(cycleMinutes(sched.blocks), 4200);
  const shifts = getShiftsInRange(sched, [], range("2026-01-01T00:00:00Z", "2026-01-07T00:00:00Z"));
  assert.deepEqual(
    shifts.map((s) => [s.startLocal, s.endLocal]),
    [
      ["2026-01-01T07:00", "2026-01-01T16:30"],
      ["2026-01-01T16:30", "2026-01-02T06:30"],
      ["2026-01-04T05:00", "2026-01-04T14:30"],
      ["2026-01-04T14:30", "2026-01-05T04:30"],
    ],
  );
  assert.deepEqual(
    shifts.map((s) => s.blockIndex),
    [0, 1, 0, 1],
  );
});

test("presets are shortcuts that produce valid blocks with the advertised cycle length", () => {
  const expectedDays: Record<string, number> = {
    "24on-48off": 3,
    "24on-72off": 4,
    "48on-96off": 6,
    "24-24-24-96": 9,
    "12h-2-2-3": 14,
    "12h-4on-4off": 8,
    "12h-2d-2n-4off": 8,
    "10-14-2d-2n-4off": 8,
    "8h-5on-2off": 7,
  };
  assert.equal(SCHEDULE_PRESETS.length, Object.keys(expectedDays).length);
  for (const p of SCHEDULE_PRESETS) {
    assert.equal(cycleMinutes(p.blocks), expectedDays[p.id]! * 1440, p.id);
    assert.deepEqual(validatePersonalSchedule(schedule({ blocks: p.blocks, startTime: p.suggestedStartTime })), [], p.id);
  }
  assert.deepEqual(blocksFromDayCodes("WWOO", 24), [
    { kind: "on", minutes: 1440 },
    { kind: "on", minutes: 1440 },
    { kind: "off", minutes: 2880 },
  ]);
});

test("2-2-3: 7 shifts per 14 days, alternating weekly", () => {
  const sched = schedule({ blocks: getSchedulePreset("12h-2-2-3")!.blocks });
  const shifts = getShiftsInRange(sched, [], range("2026-01-01T00:00:00Z", "2026-01-29T00:00:00Z"));
  assert.equal(shifts.length, 14);
  assert.deepEqual(starts(shifts).slice(0, 7).map((s) => s.slice(8, 10)), ["01", "02", "05", "06", "07", "10", "11"]);
});

console.log("Anchors and calendar");

test("anchor AFTER the queried range generates backwards correctly", () => {
  const sched = schedule({ anchorDate: "2026-06-01", blocks: s2448.blocks });
  const shifts = getShiftsInRange(sched, [], range("2026-01-01T00:00:00Z", "2026-01-10T00:00:00Z"));
  assert.deepEqual(starts(shifts), ["2026-01-02T07:00", "2026-01-05T07:00", "2026-01-08T07:00"]);
  assert.ok(shifts.every((s) => s.cycleIndex! < 0));
});

test("anchor long BEFORE the range; anchors one cycle apart produce identical shifts", () => {
  const a = getShiftsInRange(schedule({ anchorDate: "2020-01-01", blocks: s2448.blocks }), [], range("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"));
  const b = getShiftsInRange(schedule({ anchorDate: "2026-01-02", blocks: s2448.blocks }), [], range("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"));
  const c = getShiftsInRange(schedule({ anchorDate: "2026-01-05", blocks: s2448.blocks }), [], range("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"));
  assert.deepEqual(starts(a), starts(b));
  assert.deepEqual(starts(b), starts(c));
  assert.equal(a[0]!.startLocal, "2026-01-02T07:00");
});

test("leap day: 24/48 runs through Feb 29 in a leap year and skips it otherwise", () => {
  const leap = getShiftsInRange(schedule({ anchorDate: "2028-02-26", blocks: s2448.blocks }), [], range("2028-02-26T00:00:00Z", "2028-03-05T00:00:00Z"));
  assert.deepEqual(starts(leap), ["2028-02-26T07:00", "2028-02-29T07:00", "2028-03-03T07:00"]);
  const common = getShiftsInRange(schedule({ anchorDate: "2027-02-26", blocks: s2448.blocks }), [], range("2027-02-26T00:00:00Z", "2027-03-05T00:00:00Z"));
  assert.deepEqual(starts(common), ["2027-02-26T07:00", "2027-03-01T07:00", "2027-03-04T07:00"]);
  assert.ok(validatePersonalSchedule(schedule({ anchorDate: "2027-02-29", blocks: s2448.blocks })).length > 0);
  assert.deepEqual(validatePersonalSchedule(schedule({ anchorDate: "2028-02-29", blocks: s2448.blocks })), []);
});

test("multi-year range stays on rotation (no drift) — 24/48 over 3 years", () => {
  const shifts = getShiftsInRange(s2448, [], range("2026-01-01T00:00:00Z", "2029-01-01T00:00:00Z"));
  assert.equal(shifts.length, Math.ceil(1096 / 3));
  for (let i = 1; i < shifts.length; i += 1) {
    assert.equal(Date.parse(shifts[i]!.start) - Date.parse(shifts[i - 1]!.start), 3 * 86_400_000);
  }
});

console.log("Timezones and DST (America/Toronto)");

const toronto2448 = (anchorDate: string, startTime = "07:00"): PersonalSchedule =>
  schedule({ timezone: TORONTO, anchorDate, startTime, blocks: s2448.blocks });

test("spring forward: the 24 spanning the change keeps 07:00→07:00 and lasts 23 real hours", () => {
  const shifts = getShiftsInRange(toronto2448("2026-03-07"), [], range("2026-03-07T00:00:00Z", "2026-03-12T00:00:00Z"));
  assert.deepEqual(starts(shifts), ["2026-03-07T07:00", "2026-03-10T07:00"]);
  const [spanning, after] = shifts;
  assert.equal(spanning!.start, "2026-03-07T12:00:00.000Z", "07:00 EST");
  assert.equal(spanning!.end, "2026-03-08T11:00:00.000Z", "07:00 EDT");
  assert.equal(spanning!.endLocal, "2026-03-08T07:00");
  assert.equal(spanning!.scheduledMinutes, 1440);
  assert.equal(spanning!.elapsedMinutes, 1380);
  assert.equal(after!.start, "2026-03-10T11:00:00.000Z");
});

test("fall back: the 24 spanning the change keeps 07:00→07:00 and lasts 25 real hours", () => {
  const shifts = getShiftsInRange(toronto2448("2026-10-31"), [], range("2026-10-31T00:00:00Z", "2026-11-04T00:00:00Z"));
  const spanning = shifts[0]!;
  assert.equal(spanning.start, "2026-10-31T11:00:00.000Z", "07:00 EDT");
  assert.equal(spanning.end, "2026-11-01T12:00:00.000Z", "07:00 EST");
  assert.equal(spanning.elapsedMinutes, 1500);
  assert.equal(shifts[1]!.start, "2026-11-03T12:00:00.000Z");
});

test("12-hour nights across both DST changes: 11h and 13h", () => {
  const nights = schedule({
    timezone: TORONTO,
    anchorDate: "2026-03-07",
    startTime: "19:00",
    blocks: blocksFromHours([["on", 12], ["off", 12]]),
  });
  const spring = getShiftsInRange(nights, [], range("2026-03-07T12:00:00Z", "2026-03-09T12:00:00Z"));
  assert.deepEqual(
    spring.map((s) => [s.startLocal, s.endLocal, s.elapsedMinutes]),
    [
      ["2026-03-07T19:00", "2026-03-08T07:00", 660],
      ["2026-03-08T19:00", "2026-03-09T07:00", 720],
    ],
  );
  const fall = getShiftsInRange(nights, [], range("2026-10-31T11:00:00Z", "2026-11-01T18:00:00Z"));
  assert.deepEqual(
    fall.map((s) => [s.startLocal, s.endLocal, s.elapsedMinutes]),
    [["2026-10-31T19:00", "2026-11-01T07:00", 780]],
  );
});

test("a start time inside the spring-forward gap resolves forward (02:30 → 03:30 EDT)", () => {
  const sched = toronto2448("2026-03-08", "02:30");
  const [shift] = getShiftsInRange(sched, [], range("2026-03-08T00:00:00Z", "2026-03-09T00:00:00Z"));
  assert.equal(shift!.key, "2026-03-08T02:30", "key is the scheduled wall time");
  assert.equal(shift!.startLocal, "2026-03-08T03:30", "actual clock reading");
  assert.equal(shift!.start, "2026-03-08T07:30:00.000Z");
  assert.equal(shift!.elapsedMinutes, 1380);
  assert.equal(wallToInstant(Date.UTC(2026, 2, 8, 2, 30), TORONTO).resolution, "gap");
});

test("an ambiguous start in the fall-back overlap uses the earlier instant (01:30 EDT)", () => {
  const sched = toronto2448("2026-11-01", "01:30");
  const [shift] = getShiftsInRange(sched, [], range("2026-11-01T00:00:00Z", "2026-11-02T00:00:00Z"));
  assert.equal(shift!.start, "2026-11-01T05:30:00.000Z");
  assert.equal(shift!.elapsedMinutes, 1500);
  assert.equal(wallToInstant(Date.UTC(2026, 10, 1, 1, 30), TORONTO).resolution, "overlap");
  assert.equal(wallToInstant(Date.UTC(2026, 10, 1, 12, 0), TORONTO).resolution, "exact");
});

test("full year in Toronto: every 24/48 starts at 07:00 local, no drift through DST", () => {
  const shifts = getShiftsInRange(toronto2448("2026-01-01"), [], range("2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z"));
  assert.equal(shifts.length, 122);
  assert.ok(shifts.every((s) => s.startLocal.endsWith("T07:00") && s.endLocal.endsWith("T07:00")));
  const elapsed = shifts.map((s) => s.elapsedMinutes);
  assert.equal(elapsed.filter((m) => m === 1380).length + elapsed.filter((m) => m === 1500).length <= 2, true);
});

test("southern hemisphere (Australia/Sydney, DST ends 5 Apr 2026): 25-hour 24", () => {
  const sched = schedule({ timezone: "Australia/Sydney", anchorDate: "2026-04-04", blocks: s2448.blocks });
  const [shift] = getShiftsInRange(sched, [], range("2026-04-03T00:00:00Z", "2026-04-06T00:00:00Z"));
  assert.equal(shift!.startLocal, "2026-04-04T07:00");
  assert.equal(shift!.endLocal, "2026-04-05T07:00");
  assert.equal(shift!.elapsedMinutes, 1500);
});

test("range queries are instant-based regardless of the viewer: Toronto shifts in a UTC day", () => {
  const shifts = getShiftsInRange(toronto2448("2026-07-01"), [], range("2026-07-01T00:00:00Z", "2026-07-02T00:00:00Z"));
  assert.equal(shifts[0]!.start, "2026-07-01T11:00:00.000Z");
  assert.equal(shifts[0]!.timezone, TORONTO);
});

console.log("Overrides");

const extra: ScheduleOverride = {
  id: "x1",
  kind: "extra",
  startLocal: "2026-01-02T08:00",
  endLocal: "2026-01-02T20:00",
  crewSize: 6,
};
const cancel: ScheduleOverride = { id: "c1", kind: "cancel", shiftKey: "2026-01-04T07:00" };
const lateStart: ScheduleOverride = { id: "m1", kind: "modify", shiftKey: "2026-01-07T07:00", startLocal: "2026-01-07T09:00" };
const crewOnly: ScheduleOverride = { id: "m2", kind: "modify", shiftKey: "2026-01-10T07:00", crewSize: 9 };

test("Add Extra Shift appears alongside the pattern with its own crew size", () => {
  const shifts = getShiftsInRange(s2448, [extra], range("2026-01-01T00:00:00Z", "2026-01-05T00:00:00Z"));
  assert.deepEqual(starts(shifts), ["2026-01-01T07:00", "2026-01-02T08:00", "2026-01-04T07:00"]);
  const x = shifts[1]!;
  assert.equal(x.key, "extra:x1");
  assert.equal(x.source, "extra");
  assert.equal(x.crewSize, 6);
  assert.equal(x.crewSizeOverridden, true);
  assert.equal(x.scheduledMinutes, 720);
});

test("Not Working This Shift hides one occurrence; pattern and other shifts unchanged", () => {
  const before = JSON.stringify(s2448);
  const shifts = getShiftsInRange(s2448, [cancel], range("2026-01-01T00:00:00Z", "2026-01-11T00:00:00Z"));
  assert.deepEqual(starts(shifts), ["2026-01-01T07:00", "2026-01-07T07:00", "2026-01-10T07:00"]);
  const all = getShiftsInRange(s2448, [cancel], range("2026-01-01T00:00:00Z", "2026-01-11T00:00:00Z"), { includeCancelled: true });
  const cancelled = all.find((s) => s.key === "2026-01-04T07:00")!;
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.overrideId, "c1");
  assert.equal(JSON.stringify(s2448), before, "schedule object is never mutated");
});

test("modified start keeps the scheduled end; crew-only modify keeps times", () => {
  const shifts = getShiftsInRange(s2448, [lateStart, crewOnly], range("2026-01-06T00:00:00Z", "2026-01-12T00:00:00Z"));
  const late = shifts.find((s) => s.key === "2026-01-07T07:00")!;
  assert.equal(late.status, "modified");
  assert.equal(late.startLocal, "2026-01-07T09:00");
  assert.equal(late.endLocal, "2026-01-08T07:00");
  assert.equal(late.scheduledMinutes, 1320);
  assert.equal(late.crewSize, 4);
  const crew = shifts.find((s) => s.key === "2026-01-10T07:00")!;
  assert.equal(crew.startLocal, "2026-01-10T07:00");
  assert.equal(crew.crewSize, 9);
  assert.equal(crew.crewSizeOverridden, true);
});

test("modified end (held over) extends the shift", () => {
  const holdover: ScheduleOverride = { id: "m3", kind: "modify", shiftKey: "2026-01-04T07:00", endLocal: "2026-01-05T10:00" };
  const [shift] = getShiftsInRange(s2448, [holdover], range("2026-01-04T00:00:00Z", "2026-01-06T00:00:00Z"));
  assert.equal(shift!.endLocal, "2026-01-05T10:00");
  assert.equal(shift!.elapsedMinutes, 1620);
});

test("a shift moved INTO the range from outside is found; moved OUT is not", () => {
  const movedEarlier: ScheduleOverride = {
    id: "m4",
    kind: "modify",
    shiftKey: "2026-01-10T07:00",
    startLocal: "2026-01-08T07:00",
    endLocal: "2026-01-09T07:00",
  };
  const shifts = getShiftsInRange(s2448, [movedEarlier], range("2026-01-08T07:00:00Z", "2026-01-09T12:00:00Z"));
  assert.deepEqual(shifts.map((s) => s.key), ["2026-01-10T07:00"]);
  const original = getShiftsInRange(s2448, [movedEarlier], range("2026-01-10T00:00:00Z", "2026-01-11T00:00:00Z"));
  assert.deepEqual(original, []);
});

test("invalid modifications (end before start, moved > 7 days) leave the times as scheduled", () => {
  const backwards: ScheduleOverride = { id: "m5", kind: "modify", shiftKey: "2026-01-04T07:00", endLocal: "2026-01-04T06:00" };
  const tooFar: ScheduleOverride = { id: "m6", kind: "modify", shiftKey: "2026-01-07T07:00", startLocal: "2026-02-07T07:00", endLocal: "2026-02-08T07:00" };
  const shifts = getShiftsInRange(s2448, [backwards, tooFar], range("2026-01-04T00:00:00Z", "2026-01-09T00:00:00Z"));
  assert.deepEqual(starts(shifts), ["2026-01-04T07:00", "2026-01-07T07:00"]);
  assert.ok(shifts.every((s) => s.scheduledMinutes === 1440));
});

test("orphaned overrides (key not produced by the pattern) are ignored", () => {
  const orphan: ScheduleOverride = { id: "c9", kind: "cancel", shiftKey: "2026-01-05T07:00" };
  const shifts = getShiftsInRange(s2448, [orphan], range("2026-01-01T00:00:00Z", "2026-01-08T00:00:00Z"));
  assert.equal(shifts.length, 3);
});

test("findPatternOccurrence validates override keys", () => {
  assert.deepEqual(findPatternOccurrence(s2448, "2026-01-04T07:00"), {
    cycleIndex: 1,
    blockIndex: 0,
    startLocal: "2026-01-04T07:00",
    endLocal: "2026-01-05T07:00",
  });
  assert.equal(findPatternOccurrence(s2448, "2026-01-05T07:00"), null);
  assert.equal(findPatternOccurrence(s2448, "2026-01-04T08:00"), null);
  assert.equal(findPatternOccurrence(s2448, "not-a-key"), null);
  assert.equal(findPatternOccurrence(s2448, "2025-12-29T07:00")?.cycleIndex, -1);
});

test("overrides in a DST zone: cancel by local key, extra shift across spring forward", () => {
  const sched = toronto2448("2026-03-07");
  const shifts = getShiftsInRange(
    sched,
    [
      { id: "c", kind: "cancel", shiftKey: "2026-03-10T07:00" },
      { id: "x", kind: "extra", startLocal: "2026-03-08T00:00", endLocal: "2026-03-08T12:00" },
    ],
    range("2026-03-07T00:00:00Z", "2026-03-12T00:00:00Z"),
  );
  assert.deepEqual(shifts.map((s) => s.key), ["2026-03-07T07:00", "extra:x"]);
  assert.equal(shifts[1]!.elapsedMinutes, 660);
});

console.log("Next / current shift");

test("getNextShift from mid-rotation, during a shift, and with cancellations", () => {
  assert.equal(getNextShift(s2448, [], at("2026-01-02T12:00:00Z"))!.key, "2026-01-04T07:00");
  assert.equal(getNextShift(s2448, [], at("2026-01-04T07:00:00Z"))!.key, "2026-01-04T07:00", "start == now counts");
  assert.equal(getNextShift(s2448, [], at("2026-01-04T10:00:00Z"))!.key, "2026-01-07T07:00");
  assert.equal(
    getNextShift(s2448, [], at("2026-01-04T10:00:00Z"), { includeInProgress: true })!.key,
    "2026-01-04T07:00",
  );
  assert.equal(getNextShift(s2448, [cancel], at("2026-01-02T12:00:00Z"))!.key, "2026-01-07T07:00");
  assert.equal(getNextShift(s2448, [extra], at("2026-01-02T00:00:00Z"))!.key, "extra:x1");
});

test("getNextShift with anchor in the future and a long cycle", () => {
  const sched = schedule({ anchorDate: "2027-01-01", blocks: blocksFromHours([["on", 24], ["off", 24 * 29]]) });
  const next = getNextShift(sched, [], at("2026-01-01T00:00:00Z"))!;
  const fromAnchor = (Date.parse("2027-01-01T07:00:00Z") - Date.parse(next.start)) / 86_400_000;
  assert.equal(fromAnchor % 30, 0);
  assert.ok(Date.parse(next.start) >= Date.parse("2026-01-01T00:00:00Z"));
  assert.ok(Date.parse(next.start) < Date.parse("2026-01-31T00:00:00Z"));
});

test("getCurrentShift", () => {
  assert.equal(getCurrentShift(s2448, [], at("2026-01-04T20:00:00Z"))!.key, "2026-01-04T07:00");
  assert.equal(getCurrentShift(s2448, [], at("2026-01-05T07:00:00Z")), null, "end is exclusive");
  assert.equal(getCurrentShift(s2448, [cancel], at("2026-01-04T20:00:00Z")), null);
});

console.log("Validation");

test("schedule validation rejects bad input", () => {
  const bad = (p: Partial<PersonalSchedule>) => validatePersonalSchedule({ ...s2448, ...p });
  assert.ok(bad({ timezone: "Mars/Olympus" }).length);
  assert.ok(bad({ startTime: "24:00" }).length);
  assert.ok(bad({ anchorDate: "2026-13-01" }).length);
  assert.ok(bad({ defaultCrewSize: 0 }).length);
  assert.ok(bad({ blocks: [{ kind: "on", minutes: 1440 }] }).length, "needs an OFF block");
  assert.ok(bad({ blocks: [{ kind: "off", minutes: 1440 }] }).length, "needs an ON block");
  assert.ok(bad({ blocks: [{ kind: "on", minutes: 5 }, { kind: "off", minutes: 60 }] }).length);
  assert.ok(bad({ blocks: [{ kind: "on", minutes: 43200 }, { kind: "off", minutes: 43200 }, ...Array(12).fill({ kind: "off", minutes: 43200 })] }).length);
  assert.throws(() => getShiftsInRange({ ...s2448, timezone: "Nope/Zone" }, [], range("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z")));
});

test("API schemas: schedule input and each override kind", () => {
  assert.equal(personalScheduleInputSchema.safeParse({ ...s2448, presetId: "24on-48off" }).success, true);
  assert.equal(personalScheduleInputSchema.safeParse({ ...s2448, timezone: "Nope/Zone" }).success, false);
  assert.equal(scheduleOverrideInputSchema.safeParse({ kind: "extra", startLocal: "2026-01-02T08:00", endLocal: "2026-01-02T20:00" }).success, true);
  assert.equal(scheduleOverrideInputSchema.safeParse({ kind: "cancel", shiftKey: "2026-01-04T07:00" }).success, true);
  assert.equal(scheduleOverrideInputSchema.safeParse({ kind: "modify", shiftKey: "2026-01-04T07:00", crewSize: 7 }).success, true);
  assert.equal(scheduleOverrideInputSchema.safeParse({ kind: "cancel", shiftKey: "2026-01-04 07:00" }).success, false);
  assert.equal(scheduleOverrideInputSchema.safeParse({ kind: "modify", shiftKey: "2026-02-30T07:00" }).success, false);
});

test("validateOverrideForSchedule: occurrence must exist, times must be sane", () => {
  assert.equal(validateOverrideForSchedule(s2448, { kind: "cancel", shiftKey: "2026-01-04T07:00" }), null);
  assert.match(validateOverrideForSchedule(s2448, { kind: "cancel", shiftKey: "2026-01-05T07:00" })!, /not part/);
  assert.equal(
    validateOverrideForSchedule(s2448, { kind: "modify", shiftKey: "2026-01-04T07:00", startLocal: "2026-01-04T09:00" }),
    null,
  );
  assert.match(validateOverrideForSchedule(s2448, { kind: "modify", shiftKey: "2026-01-04T07:00" })!, /Nothing/);
  assert.match(
    validateOverrideForSchedule(s2448, { kind: "modify", shiftKey: "2026-01-04T07:00", endLocal: "2026-01-04T06:00" })!,
    /end after/,
  );
  assert.match(
    validateOverrideForSchedule(s2448, { kind: "modify", shiftKey: "2026-01-04T07:00", startLocal: "2026-01-20T07:00", endLocal: "2026-01-21T07:00" })!,
    /7 days/,
  );
  assert.equal(validateOverrideForSchedule(s2448, { kind: "extra", startLocal: "2026-01-02T08:00", endLocal: "2026-01-02T20:00" }), null);
  assert.match(validateOverrideForSchedule(s2448, { kind: "extra", startLocal: "2026-01-02T08:00", endLocal: "2026-01-02T08:00" })!, /end after/);
});

test("migration stores pattern + overrides only (no materialized shift rows)", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "server/db/pg-migrations/0012_user_schedules.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_schedules/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_schedule_overrides/);
  assert.match(sql, /kind IN \('extra', 'cancel', 'modify'\)/);
  assert.match(sql, /UNIQUE INDEX IF NOT EXISTS idx_user_schedule_overrides_occurrence/);
  assert.match(sql, /ON DELETE CASCADE/);
  assert.doesNotMatch(sql, /CREATE TABLE IF NOT EXISTS \w*shift_instances/);
  assert.doesNotMatch(sql, /\bDROP\b/i);
});

test("empty / inverted range returns nothing", () => {
  assert.deepEqual(getShiftsInRange(s2448, [], range("2026-01-05T00:00:00Z", "2026-01-01T00:00:00Z")), []);
});

console.log(`\n${passed} schedule engine tests passed`);
