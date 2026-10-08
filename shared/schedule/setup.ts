/**
 * Pure helpers behind the My Schedule setup flow: rotation choices, turning
 * "a shift I know I'm working" into the engine's anchor, and building
 * one-off override inputs. No I/O.
 */
import { SCHEDULE_PRESETS, blocksFromHours, getSchedulePreset, type SchedulePreset } from "./presets.js";
import { formatLocalDateTime, parseLocalDate, parseLocalDateTime, parseLocalTime } from "./timezone.js";
import type { PersonalSchedule, ScheduleBlock, ShiftInstance } from "./types.js";

const MINUTE_MS = 60_000;
const DAY_MINUTES = 24 * 60;

export interface RotationChoice {
  id: string;
  label: string;
  description: string;
  /** One preset → picked directly; several → user picks a variant. Empty → custom. */
  presetIds: string[];
}

export const ROTATION_CHOICES: readonly RotationChoice[] = [
  { id: "24on-48off", label: "24 on / 48 off", description: "One 24-hour shift, then two days off.", presetIds: ["24on-48off"] },
  { id: "24on-72off", label: "24 on / 72 off", description: "One 24-hour shift, then three days off.", presetIds: ["24on-72off"] },
  { id: "48on-96off", label: "48 on / 96 off", description: "One 48-hour shift, then four days off.", presetIds: ["48on-96off"] },
  {
    id: "12h",
    label: "12-hour rotation",
    description: "12-hour days and/or nights.",
    presetIds: ["12h-2d-2n-4off", "12h-4on-4off", "12h-2-2-3"],
  },
  {
    id: "10-14",
    label: "10/14",
    description: "Two 10-hour days, two 14-hour nights, then four off.",
    presetIds: ["10-14-2d-2n-4off"],
  },
  { id: "custom", label: "Custom", description: "Build your own on/off pattern in hours.", presetIds: [] },
];

/** Less common presets, offered behind "More rotations". */
export const MORE_ROTATION_PRESET_IDS: readonly string[] = SCHEDULE_PRESETS.map((p) => p.id).filter(
  (id) => !ROTATION_CHOICES.some((c) => c.presetIds.includes(id)),
);

export function presetsForChoice(choice: RotationChoice): SchedulePreset[] {
  return choice.presetIds.map((id) => getSchedulePreset(id)).filter((p): p is SchedulePreset => !!p);
}

export function blocksEqual(a: readonly ScheduleBlock[], b: readonly ScheduleBlock[]): boolean {
  return a.length === b.length && a.every((x, i) => x.kind === b[i]!.kind && x.minutes === b[i]!.minutes);
}

/** Preset whose blocks match exactly, preferring the saved presetId. */
export function matchPreset(blocks: readonly ScheduleBlock[], presetId?: string | null): SchedulePreset | null {
  const byId = presetId ? getSchedulePreset(presetId) : undefined;
  if (byId && blocksEqual(byId.blocks, blocks)) return byId;
  return SCHEDULE_PRESETS.find((p) => blocksEqual(p.blocks, blocks)) ?? null;
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function cycleLengthMinutes(blocks: readonly ScheduleBlock[]): number {
  return blocks.reduce((sum, b) => sum + b.minutes, 0);
}

/** "24h on · 48h off · repeats every 3 days" */
export function describeCycle(blocks: readonly ScheduleBlock[]): string {
  const parts = blocks.map((b) => `${formatHours(b.minutes)} ${b.kind}`);
  const total = cycleLengthMinutes(blocks);
  const days = total / DAY_MINUTES;
  const repeat = Number.isInteger(days) ? `${days} day${days === 1 ? "" : "s"}` : formatHours(total);
  return `${parts.join(" · ")} · repeats every ${repeat}`;
}

function addMinutesToTime(hhmm: string, minutes: number): string {
  const base = parseLocalTime(hhmm) ?? 0;
  const t = (((base + minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export interface WorkBlockOption {
  blockIndex: number;
  /** Minutes from cycle start. */
  offsetMinutes: number;
  minutes: number;
  /** Local "HH:MM" this shift starts, given the rotation start time. */
  startsAt: string;
  label: string;
}

/** The ON blocks of a cycle, labeled so a user can say which one they know they're working. */
export function workBlockOptions(blocks: readonly ScheduleBlock[], startTime: string): WorkBlockOption[] {
  const out: WorkBlockOption[] = [];
  let offset = 0;
  blocks.forEach((b, blockIndex) => {
    if (b.kind === "on") {
      const startsAt = addMinutesToTime(startTime, offset);
      out.push({ blockIndex, offsetMinutes: offset, minutes: b.minutes, startsAt, label: "" });
    }
    offset += b.minutes;
  });
  const counts = { Day: 0, Night: 0 };
  for (const o of out) {
    const hour = Math.floor(parseLocalTime(o.startsAt)! / 60);
    const kind = hour >= 4 && hour < 14 ? "Day" : "Night";
    counts[kind] += 1;
    o.label = `${kind} shift ${counts[kind]} · starts ${o.startsAt} · ${formatHours(o.minutes)}`;
  }
  return out;
}

/**
 * Anchor date for a pattern, given one shift the user knows they work:
 * the ON block (by index) that STARTS on `knownDate`. The rotation start time
 * stays `startTime`; only the anchor date moves. Wall-clock arithmetic, so
 * DST never shifts it.
 */
export function anchorDateFromKnownShift(input: {
  knownDate: string;
  blockIndex: number;
  startTime: string;
  blocks: readonly ScheduleBlock[];
}): string | null {
  const day = parseLocalDate(input.knownDate);
  const start = parseLocalTime(input.startTime);
  const option = workBlockOptions(input.blocks, input.startTime).find((o) => o.blockIndex === input.blockIndex);
  if (day == null || start == null || !option) return null;
  const shiftStartWall = day + (parseLocalTime(option.startsAt)! * MINUTE_MS);
  const anchorWall = shiftStartWall - option.offsetMinutes * MINUTE_MS;
  return formatLocalDateTime(anchorWall).slice(0, 10);
}

export interface ScheduleFormValues {
  blocks: ScheduleBlock[];
  presetId: string | null;
  knownDate: string;
  knownBlockIndex: number;
  startTime: string;
  timezone: string;
  defaultCrewSize: number;
}

export function scheduleFromForm(v: ScheduleFormValues): PersonalSchedule | null {
  const anchorDate = anchorDateFromKnownShift({
    knownDate: v.knownDate,
    blockIndex: v.knownBlockIndex,
    startTime: v.startTime,
    blocks: v.blocks,
  });
  if (!anchorDate) return null;
  return {
    timezone: v.timezone,
    anchorDate,
    startTime: v.startTime,
    blocks: v.blocks,
    defaultCrewSize: v.defaultCrewSize,
    presetId: v.presetId,
  };
}

/** Form values that reproduce a saved schedule (the anchor is the first ON block). */
export function formFromSchedule(s: PersonalSchedule): ScheduleFormValues {
  const first = workBlockOptions(s.blocks, s.startTime)[0];
  const preset = matchPreset(s.blocks, s.presetId);
  let knownDate = s.anchorDate;
  if (first) {
    const wall = parseLocalDate(s.anchorDate)! + (parseLocalTime(s.startTime)! + first.offsetMinutes) * MINUTE_MS;
    knownDate = formatLocalDateTime(wall).slice(0, 10);
  }
  return {
    blocks: s.blocks,
    presetId: preset?.id ?? null,
    knownDate,
    knownBlockIndex: first?.blockIndex ?? 0,
    startTime: s.startTime,
    timezone: s.timezone,
    defaultCrewSize: s.defaultCrewSize,
  };
}

export interface CustomStep {
  kind: "on" | "off";
  hours: number;
}

export function blocksFromCustomSteps(steps: readonly CustomStep[]): ScheduleBlock[] {
  return blocksFromHours(steps.map((s) => [s.kind, s.hours] as const));
}

export function customStepsFromBlocks(blocks: readonly ScheduleBlock[]): CustomStep[] {
  return blocks.map((b) => ({ kind: b.kind, hours: b.minutes / 60 }));
}

/** Problems with a custom pattern, in plain words. */
export function customPatternProblems(steps: readonly CustomStep[]): string[] {
  const problems: string[] = [];
  if (steps.some((s) => !Number.isFinite(s.hours) || s.hours <= 0)) problems.push("Every step needs some hours.");
  if (steps.some((s) => s.hours > 720)) problems.push("A single step can be at most 720 hours.");
  if (!steps.some((s) => s.kind === "on")) problems.push("Add at least one work period.");
  if (!steps.some((s) => s.kind === "off")) problems.push("Add at least one day off.");
  if (steps.reduce((sum, s) => sum + (s.hours || 0), 0) > 366 * 24) problems.push("The cycle can be at most a year.");
  return problems;
}

/** POST body for Add Extra Shift. */
export function extraShiftInput(input: {
  date: string;
  startTime: string;
  hours: number;
  crewSize?: number | null;
}): { kind: "extra"; startLocal: string; endLocal: string; crewSize: number | null } | null {
  const startWall = parseLocalDateTime(`${input.date}T${input.startTime}`);
  if (startWall == null || !(input.hours > 0)) return null;
  return {
    kind: "extra",
    startLocal: formatLocalDateTime(startWall),
    endLocal: formatLocalDateTime(startWall + Math.round(input.hours * 60) * MINUTE_MS),
    crewSize: input.crewSize ?? null,
  };
}

/**
 * POST body for editing one generated shift, or null when nothing changed.
 * Sends the full start/end/crew: a new change replaces the shift's previous
 * one, so partial bodies would silently revert earlier edits.
 */
export function modifyShiftInput(
  shift: Pick<ShiftInstance, "key" | "startLocal" | "endLocal" | "crewSize">,
  next: { startLocal: string; hours: number; crewSize: number },
): { kind: "modify"; shiftKey: string; startLocal: string; endLocal: string; crewSize: number } | null {
  const startWall = parseLocalDateTime(next.startLocal);
  if (startWall == null || !(next.hours > 0)) return null;
  const startLocal = formatLocalDateTime(startWall);
  const endLocal = formatLocalDateTime(startWall + Math.round(next.hours * 60) * MINUTE_MS);
  const changed = startLocal !== shift.startLocal || endLocal !== shift.endLocal || next.crewSize !== shift.crewSize;
  return changed ? { kind: "modify", shiftKey: shift.key, startLocal, endLocal, crewSize: next.crewSize } : null;
}

/** Shifts not yet over at `now`, in order, capped at `count`. */
export function upcomingShifts<T extends Pick<ShiftInstance, "end" | "start">>(
  shifts: readonly T[],
  now: Date,
  count: number,
): T[] {
  return shifts.filter((s) => Date.parse(s.end) > now.getTime()).slice(0, count);
}
