/**
 * My Schedule setup flow logic (Phase 5).
 * Run: npx tsx scripts/test-schedule-setup.ts
 */
import assert from "node:assert/strict";
import {
  ANALYTICS_EVENT_TYPES,
} from "../shared/analytics/events.ts";
import {
  SCHEDULE_PRESETS,
  getSchedulePreset,
  getShiftsInRange,
  personalScheduleInputSchema,
  validateOverrideForSchedule,
  wallToInstant,
  parseLocalDateTime,
  type PersonalSchedule,
  type ScheduleOverride,
} from "../shared/schedule/index.ts";
import {
  MORE_ROTATION_PRESET_IDS,
  ROTATION_CHOICES,
  anchorDateFromKnownShift,
  blocksFromCustomSteps,
  customPatternProblems,
  describeCycle,
  extraShiftInput,
  formFromSchedule,
  matchPreset,
  modifyShiftInput,
  presetsForChoice,
  scheduleFromForm,
  upcomingShifts,
  workBlockOptions,
  type ScheduleFormValues,
} from "../shared/schedule/setup.ts";
import { formatShiftTimes, localDateInZone, shiftDayParts } from "../client/src/lib/schedule-format.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function form(overrides: Partial<ScheduleFormValues> & Pick<ScheduleFormValues, "blocks">): ScheduleFormValues {
  return {
    presetId: null,
    knownDate: "2026-10-08",
    knownBlockIndex: 0,
    startTime: "07:00",
    timezone: "America/Toronto",
    defaultCrewSize: 6,
    ...overrides,
  };
}

/** Shifts that start on `date` (local) within a ±10-day window. */
function shiftsStartingOn(s: PersonalSchedule, date: string, overrides: ScheduleOverride[] = []) {
  const center = wallToInstant(parseLocalDateTime(`${date}T12:00`)!, s.timezone).instantMs;
  return getShiftsInRange(s, overrides, {
    from: new Date(center - 10 * 86_400_000),
    to: new Date(center + 10 * 86_400_000),
  }, { includeCancelled: true }).filter((x) => x.startLocal.startsWith(date));
}

console.log("Rotation choices");

test("primary choices: 24/48, 24/72, 48/96, 12-hour, 10/14, Custom — all real presets", () => {
  assert.deepEqual(
    ROTATION_CHOICES.map((c) => c.label),
    ["24 on / 48 off", "24 on / 72 off", "48 on / 96 off", "12-hour rotation", "10/14", "Custom"],
  );
  for (const c of ROTATION_CHOICES) {
    assert.equal(presetsForChoice(c).length, c.presetIds.length, `${c.id} presets resolve`);
  }
  assert.equal(presetsForChoice(ROTATION_CHOICES.find((c) => c.id === "12h")!).length, 3);
  const covered = new Set([...ROTATION_CHOICES.flatMap((c) => c.presetIds), ...MORE_ROTATION_PRESET_IDS]);
  assert.equal(covered.size, SCHEDULE_PRESETS.length, "every preset reachable");
});

test("labels describe the pattern, never a department nickname", () => {
  for (const c of ROTATION_CHOICES) assert.doesNotMatch(c.label, /kelly|pitman|detroit|dupont|panama/i);
  for (const p of SCHEDULE_PRESETS) assert.doesNotMatch(p.label, /kelly|pitman|detroit|dupont|panama/i);
});

console.log("Anchor from a known working day");

test("every preset × every shift in the rotation: the known shift starts that day at the right time", () => {
  for (const preset of SCHEDULE_PRESETS) {
    for (const startTime of ["07:00", "08:00", "19:00"]) {
      for (const option of workBlockOptions(preset.blocks, startTime)) {
        const schedule = scheduleFromForm(
          form({ blocks: preset.blocks, presetId: preset.id, knownBlockIndex: option.blockIndex, startTime }),
        )!;
        assert.equal(personalScheduleInputSchema.safeParse(schedule).success, true);
        const hit = shiftsStartingOn(schedule, "2026-10-08").find((s) => s.blockIndex === option.blockIndex);
        assert.ok(hit, `${preset.id} @ ${startTime}: block ${option.blockIndex} starts on the known date`);
        assert.equal(hit.startLocal, `2026-10-08T${option.startsAt}`);
      }
    }
  }
});

test("10/14 nights: picking night 1 puts an 18:00 night on that date", () => {
  const p = getSchedulePreset("10-14-2d-2n-4off")!;
  const opts = workBlockOptions(p.blocks, "08:00");
  assert.deepEqual(opts.map((o) => o.startsAt), ["08:00", "08:00", "18:00", "18:00"]);
  assert.deepEqual(opts.map((o) => o.label), [
    "Day shift 1 · starts 08:00 · 10h",
    "Day shift 2 · starts 08:00 · 10h",
    "Night shift 1 · starts 18:00 · 14h",
    "Night shift 2 · starts 18:00 · 14h",
  ]);
  const schedule = scheduleFromForm(form({ blocks: p.blocks, knownBlockIndex: opts[2]!.blockIndex, startTime: "08:00" }))!;
  assert.equal(schedule.anchorDate, "2026-10-06");
  const [night] = shiftsStartingOn(schedule, "2026-10-08");
  assert.equal(night!.startLocal, "2026-10-08T18:00");
  assert.equal(night!.scheduledMinutes, 14 * 60);
});

test("night block crossing midnight: shift that starts 05:00 on the known date", () => {
  const blocks = blocksFromCustomSteps([{ kind: "on", hours: 10 }, { kind: "on", hours: 10 }, { kind: "off", hours: 76 }]);
  const opts = workBlockOptions(blocks, "19:00");
  assert.equal(opts[1]!.startsAt, "05:00");
  const schedule = scheduleFromForm(form({ blocks, knownBlockIndex: 1, startTime: "19:00" }))!;
  assert.equal(schedule.anchorDate, "2026-10-07");
  assert.ok(shiftsStartingOn(schedule, "2026-10-08").some((s) => s.startLocal === "2026-10-08T05:00"));
});

test("a past known date lines up future shifts", () => {
  const p = getSchedulePreset("24on-48off")!;
  const schedule = scheduleFromForm(form({ blocks: p.blocks, knownDate: "2025-01-01" }))!;
  assert.equal(schedule.anchorDate, "2025-01-01");
  const all = getShiftsInRange(schedule, [], {
    from: new Date("2026-10-01T00:00:00Z"),
    to: new Date("2026-10-10T00:00:00Z"),
  });
  for (const s of all) {
    const days = (Date.UTC(+s.startLocal.slice(0, 4), +s.startLocal.slice(5, 7) - 1, +s.startLocal.slice(8, 10)) -
      Date.UTC(2025, 0, 1)) / 86_400_000;
    assert.equal(days % 3, 0, "every third day from the known shift");
  }
});

console.log("Timezones and DST");

test("other timezones keep local start times (Kolkata, Chatham, St. John's, Honolulu)", () => {
  const p = getSchedulePreset("24on-72off")!;
  for (const tz of ["Asia/Kolkata", "Pacific/Chatham", "America/St_Johns", "Pacific/Honolulu"]) {
    const schedule = scheduleFromForm(form({ blocks: p.blocks, timezone: tz }))!;
    assert.equal(personalScheduleInputSchema.safeParse(schedule).success, true, tz);
    const [s] = shiftsStartingOn(schedule, "2026-10-08");
    assert.equal(s!.startLocal, "2026-10-08T07:00", tz);
  }
});

test("known date on spring-forward / fall-back day: 07:00 stays 07:00, 24h wall shift", () => {
  const p = getSchedulePreset("24on-48off")!;
  for (const day of ["2026-03-08", "2026-11-01"]) {
    const schedule = scheduleFromForm(form({ blocks: p.blocks, knownDate: day }))!;
    const [s] = shiftsStartingOn(schedule, day);
    assert.equal(s!.startLocal, `${day}T07:00`);
    assert.equal(s!.scheduledMinutes, 24 * 60);
  }
  const before = scheduleFromForm(form({ blocks: p.blocks, knownDate: "2026-03-07" }))!;
  const [s] = shiftsStartingOn(before, "2026-03-07");
  assert.equal(s!.elapsedMinutes, 23 * 60, "spring-forward shift is 23 real hours");
  assert.equal(s!.endLocal, "2026-03-08T07:00");
});

test("display formatting ignores the device zone", () => {
  assert.deepEqual(shiftDayParts("2026-10-08T07:00"), { weekday: "Thu", day: "8", month: "Oct" });
  assert.equal(formatShiftTimes("2026-10-08T07:00", "2026-10-09T07:00"), "07:00 → 07:00 Fri");
  assert.equal(formatShiftTimes("2026-10-08T07:00", "2026-10-08T19:00"), "07:00 → 19:00");
  assert.equal(localDateInZone("Pacific/Kiritimati", 0, new Date("2026-10-08T12:00:00Z")), "2026-10-09");
  assert.equal(localDateInZone("Pacific/Pago_Pago", 1, new Date("2026-10-08T12:00:00Z")), "2026-10-09");
});

console.log("Editing an existing schedule");

test("formFromSchedule → scheduleFromForm round-trips for every preset", () => {
  for (const p of SCHEDULE_PRESETS) {
    const saved: PersonalSchedule = {
      timezone: "America/Vancouver",
      anchorDate: "2026-02-03",
      startTime: p.suggestedStartTime,
      blocks: p.blocks,
      defaultCrewSize: 9,
      presetId: p.id,
    };
    const f = formFromSchedule(saved);
    assert.equal(f.presetId, p.id);
    assert.deepEqual(scheduleFromForm(f), saved, p.id);
  }
});

test("existing schedule without presetId: detected preset, else custom", () => {
  const p = getSchedulePreset("48on-96off")!;
  assert.equal(matchPreset(p.blocks, null)?.id, "48on-96off");
  const custom = blocksFromCustomSteps([{ kind: "on", hours: 24 }, { kind: "off", hours: 24 }, { kind: "on", hours: 24 }, { kind: "off", hours: 120 }]);
  assert.equal(matchPreset(custom, null), null);
  const f = formFromSchedule({ timezone: "America/Toronto", anchorDate: "2026-01-01", startTime: "08:00", blocks: custom, defaultCrewSize: 4 });
  assert.equal(f.presetId, null);
  assert.equal(f.knownDate, "2026-01-01");
});

test("custom pattern validation in plain words", () => {
  assert.deepEqual(customPatternProblems([{ kind: "on", hours: 24 }, { kind: "off", hours: 48 }]), []);
  assert.ok(customPatternProblems([{ kind: "on", hours: 24 }]).includes("Add at least one day off."));
  assert.ok(customPatternProblems([{ kind: "off", hours: 24 }]).includes("Add at least one work period."));
  assert.ok(customPatternProblems([{ kind: "on", hours: 0 }, { kind: "off", hours: 24 }]).length > 0);
  assert.equal(describeCycle(blocksFromCustomSteps([{ kind: "on", hours: 24 }, { kind: "off", hours: 48 }])), "24h on · 48h off · repeats every 3 days");
});

console.log("One-off changes");

const base: PersonalSchedule = scheduleFromForm(form({ blocks: getSchedulePreset("24on-48off")!.blocks, presetId: "24on-48off" }))!;

test("extra shift input: local start/end by wall hours (DST-safe)", () => {
  assert.deepEqual(extraShiftInput({ date: "2026-10-09", startTime: "07:00", hours: 24, crewSize: null }), {
    kind: "extra",
    startLocal: "2026-10-09T07:00",
    endLocal: "2026-10-10T07:00",
    crewSize: null,
  });
  assert.equal(extraShiftInput({ date: "2026-03-07", startTime: "19:00", hours: 12 })!.endLocal, "2026-03-08T07:00");
  assert.equal(extraShiftInput({ date: "", startTime: "07:00", hours: 24 }), null);
  const body = extraShiftInput({ date: "2026-10-09", startTime: "07:00", hours: 24 })!;
  assert.equal(validateOverrideForSchedule(base, body), null);
});

test("one-off edits never alter the recurring schedule", () => {
  const before = JSON.stringify(base);
  const [shift] = shiftsStartingOn(base, "2026-10-08");
  const modify = modifyShiftInput(shift!, { startLocal: "2026-10-08T08:00", hours: 24, crewSize: 6 })!;
  assert.equal(validateOverrideForSchedule(base, modify), null);
  const overrides: ScheduleOverride[] = [
    { id: "1", ...modify },
    { id: "2", kind: "cancel", shiftKey: "2026-10-11T07:00" },
    { id: "3", ...extraShiftInput({ date: "2026-10-09", startTime: "07:00", hours: 12 })! },
  ];
  const withOverrides = getShiftsInRange(base, overrides, {
    from: new Date("2026-10-07T00:00:00Z"),
    to: new Date("2026-10-20T00:00:00Z"),
  }, { includeCancelled: true });
  assert.equal(JSON.stringify(base), before, "pattern object unchanged");
  assert.deepEqual(
    withOverrides.map((s) => [s.startLocal, s.status, s.source]),
    [
      ["2026-10-08T08:00", "modified", "pattern"],
      ["2026-10-09T07:00", "scheduled", "extra"],
      ["2026-10-11T07:00", "cancelled", "pattern"],
      ["2026-10-14T07:00", "scheduled", "pattern"],
      ["2026-10-17T07:00", "scheduled", "pattern"],
    ],
  );
  const plain = getShiftsInRange(base, [], { from: new Date("2026-10-13T00:00:00Z"), to: new Date("2026-10-20T00:00:00Z") });
  assert.deepEqual(plain.map((s) => s.startLocal), ["2026-10-14T07:00", "2026-10-17T07:00"], "later shifts untouched");
});

test("modify body: null when unchanged; full values when anything changes (no silent revert)", () => {
  const [shift] = shiftsStartingOn(base, "2026-10-08");
  assert.equal(modifyShiftInput(shift!, { startLocal: shift!.startLocal, hours: 24, crewSize: shift!.crewSize }), null);
  assert.deepEqual(modifyShiftInput(shift!, { startLocal: shift!.startLocal, hours: 24, crewSize: 9 }), {
    kind: "modify",
    shiftKey: "2026-10-08T07:00",
    startLocal: "2026-10-08T07:00",
    endLocal: "2026-10-09T07:00",
    crewSize: 9,
  });
  const edited = getShiftsInRange(base, [{ id: "m", kind: "modify", shiftKey: shift!.key, crewSize: 9 }], {
    from: new Date("2026-10-08T00:00:00Z"),
    to: new Date("2026-10-09T00:00:00Z"),
  })[0]!;
  const second = modifyShiftInput(edited, { startLocal: "2026-10-08T09:00", hours: 22, crewSize: edited.crewSize })!;
  assert.equal(second.crewSize, 9, "earlier crew change kept when editing start time");
});

test("upcomingShifts keeps an in-progress shift and caps the count", () => {
  const all = getShiftsInRange(base, [], { from: new Date("2026-10-01T00:00:00Z"), to: new Date("2026-11-30T00:00:00Z") });
  const now = new Date("2026-10-08T20:00:00Z");
  const next = upcomingShifts(all, now, 8);
  assert.equal(next.length, 8);
  assert.equal(next[0]!.startLocal, "2026-10-08T07:00", "current shift first");
});

console.log("Analytics");

test("schedule events are registered", () => {
  for (const e of ["schedule_setup_started", "schedule_created", "schedule_updated", "extra_shift_added", "shift_override_created"]) {
    assert.ok((ANALYTICS_EVENT_TYPES as readonly string[]).includes(e), e);
  }
});

console.log(`\n${passed} schedule setup tests passed`);
