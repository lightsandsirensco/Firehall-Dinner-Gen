/**
 * Deterministic personal schedule engine.
 *
 * Algorithm: the pattern is a repeating cycle of ON/OFF blocks laid out on
 * the LOCAL wall clock of the schedule's timezone, starting at
 * anchorDate + startTime. Cycle k, ON block b starts at
 *   anchorWall + k * cycleLength + offset(b)
 * in wall time. Only after positions are computed in wall time is each start
 * and end converted to a real instant (timezone.ts wallToInstant). So a
 * 24/48 rotation starting at 07:00 always starts at 07:00 local, including
 * across DST; the shift that spans a DST change simply lasts 23 or 25 real
 * hours (reported as elapsedMinutes).
 *
 * Overrides never touch the pattern. Cancel/modify target one generated
 * occurrence by its key (scheduled local start); extra shifts are standalone.
 */
import type {
  PersonalSchedule,
  ScheduleBlock,
  ScheduleOverride,
  ShiftInstance,
  ShiftRange,
} from "./types.js";
import {
  formatLocalDateTime,
  instantToWall,
  isValidTimeZone,
  parseLocalDate,
  parseLocalDateTime,
  parseLocalTime,
  wallToInstant,
} from "./timezone.js";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const SCHEDULE_LIMITS = {
  minBlockMinutes: 15,
  maxBlockMinutes: 30 * 24 * 60,
  maxBlocks: 64,
  maxCycleMinutes: 366 * 24 * 60,
  minCrewSize: 1,
  maxCrewSize: 200,
  /** A modified shift may move at most this far from its scheduled start. */
  maxModifyShiftMinutes: 7 * 24 * 60,
  maxExtraShiftMinutes: 7 * 24 * 60,
} as const;

/** Wall-time padding when generating, so moved/DST-adjacent shifts are never missed at range edges. */
const GENERATION_PAD_MS = SCHEDULE_LIMITS.maxModifyShiftMinutes * MINUTE_MS + DAY_MS;

export class ScheduleError extends Error {}

export function validatePersonalSchedule(s: PersonalSchedule): string[] {
  const errors: string[] = [];
  if (!isValidTimeZone(s.timezone)) errors.push("timezone must be a valid IANA zone");
  if (parseLocalDate(s.anchorDate) == null) errors.push("anchorDate must be YYYY-MM-DD");
  if (parseLocalTime(s.startTime) == null) errors.push("startTime must be HH:MM (24h)");
  if (
    !Number.isInteger(s.defaultCrewSize) ||
    s.defaultCrewSize < SCHEDULE_LIMITS.minCrewSize ||
    s.defaultCrewSize > SCHEDULE_LIMITS.maxCrewSize
  ) {
    errors.push(`defaultCrewSize must be an integer ${SCHEDULE_LIMITS.minCrewSize}-${SCHEDULE_LIMITS.maxCrewSize}`);
  }
  if (!Array.isArray(s.blocks) || s.blocks.length === 0) {
    errors.push("blocks must contain at least one ON and one OFF block");
    return errors;
  }
  if (s.blocks.length > SCHEDULE_LIMITS.maxBlocks) errors.push(`at most ${SCHEDULE_LIMITS.maxBlocks} blocks`);
  let total = 0;
  for (const [i, b] of s.blocks.entries()) {
    if (b.kind !== "on" && b.kind !== "off") errors.push(`blocks[${i}].kind must be "on" or "off"`);
    if (
      !Number.isInteger(b.minutes) ||
      b.minutes < SCHEDULE_LIMITS.minBlockMinutes ||
      b.minutes > SCHEDULE_LIMITS.maxBlockMinutes
    ) {
      errors.push(
        `blocks[${i}].minutes must be an integer ${SCHEDULE_LIMITS.minBlockMinutes}-${SCHEDULE_LIMITS.maxBlockMinutes}`,
      );
    }
    total += Number.isFinite(b.minutes) ? b.minutes : 0;
  }
  if (!s.blocks.some((b) => b.kind === "on")) errors.push("pattern needs at least one ON block");
  if (!s.blocks.some((b) => b.kind === "off")) errors.push("pattern needs at least one OFF block");
  if (total > SCHEDULE_LIMITS.maxCycleMinutes) errors.push("cycle may not exceed 366 days");
  return errors;
}

interface CompiledOnBlock {
  blockIndex: number;
  offsetMs: number;
  durationMs: number;
}

export interface CompiledSchedule {
  timezone: string;
  anchorWall: number;
  cycleMs: number;
  onBlocks: CompiledOnBlock[];
  defaultCrewSize: number;
}

export function compileSchedule(s: PersonalSchedule): CompiledSchedule {
  const errors = validatePersonalSchedule(s);
  if (errors.length) throw new ScheduleError(errors.join("; "));
  const anchorWall = parseLocalDate(s.anchorDate)! + parseLocalTime(s.startTime)! * MINUTE_MS;
  const onBlocks: CompiledOnBlock[] = [];
  let offset = 0;
  s.blocks.forEach((b, blockIndex) => {
    const durationMs = b.minutes * MINUTE_MS;
    if (b.kind === "on") onBlocks.push({ blockIndex, offsetMs: offset, durationMs });
    offset += durationMs;
  });
  return { timezone: s.timezone, anchorWall, cycleMs: offset, onBlocks, defaultCrewSize: s.defaultCrewSize };
}

export function cycleMinutes(blocks: ScheduleBlock[]): number {
  return blocks.reduce((sum, b) => sum + b.minutes, 0);
}

interface WallOccurrence {
  key: string;
  startWall: number;
  endWall: number;
  cycleIndex: number;
  blockIndex: number;
}

function occurrencesInWallRange(c: CompiledSchedule, fromWall: number, toWall: number): WallOccurrence[] {
  const out: WallOccurrence[] = [];
  const firstCycle = Math.floor((fromWall - c.anchorWall) / c.cycleMs) - 1;
  const lastCycle = Math.floor((toWall - c.anchorWall) / c.cycleMs);
  for (let k = firstCycle; k <= lastCycle; k += 1) {
    const cycleStart = c.anchorWall + k * c.cycleMs;
    for (const b of c.onBlocks) {
      const startWall = cycleStart + b.offsetMs;
      const endWall = startWall + b.durationMs;
      if (endWall > fromWall && startWall < toWall) {
        out.push({ key: formatLocalDateTime(startWall), startWall, endWall, cycleIndex: k, blockIndex: b.blockIndex });
      }
    }
  }
  return out;
}

/** The generated pattern occurrence with this key, or null if the pattern never starts a shift then. */
export function findPatternOccurrence(
  schedule: PersonalSchedule,
  shiftKey: string,
): { cycleIndex: number; blockIndex: number; startLocal: string; endLocal: string } | null {
  const wall = parseLocalDateTime(shiftKey);
  if (wall == null) return null;
  const c = compileSchedule(schedule);
  const hit = occurrencesInWallRange(c, wall, wall + 1).find((o) => o.startWall === wall);
  if (!hit) return null;
  return {
    cycleIndex: hit.cycleIndex,
    blockIndex: hit.blockIndex,
    startLocal: formatLocalDateTime(hit.startWall),
    endLocal: formatLocalDateTime(hit.endWall),
  };
}

/**
 * Semantic check of an override against the current schedule, before saving.
 * Returns an error message, or null when valid.
 */
export function validateOverrideForSchedule(
  schedule: PersonalSchedule,
  input:
    | { kind: "extra"; startLocal: string; endLocal: string }
    | { kind: "cancel"; shiftKey: string }
    | { kind: "modify"; shiftKey: string; startLocal?: string | null; endLocal?: string | null; crewSize?: number | null },
): string | null {
  if (input.kind === "extra") {
    const start = parseLocalDateTime(input.startLocal);
    const end = parseLocalDateTime(input.endLocal);
    if (start == null || end == null) return "Extra shift needs a local start and end";
    if (end <= start) return "Extra shift must end after it starts";
    if (end - start > SCHEDULE_LIMITS.maxExtraShiftMinutes * MINUTE_MS) return "Extra shift may be at most 7 days";
    return null;
  }

  const occurrence = findPatternOccurrence(schedule, input.shiftKey);
  if (!occurrence) return "That shift is not part of your schedule";
  if (input.kind === "cancel") return null;

  if (input.startLocal == null && input.endLocal == null && input.crewSize == null) {
    return "Nothing to change";
  }
  const scheduledStart = parseLocalDateTime(occurrence.startLocal)!;
  const scheduledEnd = parseLocalDateTime(occurrence.endLocal)!;
  const start = input.startLocal ? parseLocalDateTime(input.startLocal) : scheduledStart;
  const end = input.endLocal ? parseLocalDateTime(input.endLocal) : scheduledEnd;
  if (start == null || end == null) return "Invalid local date-time";
  if (end <= start) return "Shift must end after it starts";
  if (!withinModifyLimit(scheduledStart, start) || !withinModifyLimit(scheduledEnd, end)) {
    return "A one-off change can move a shift by at most 7 days";
  }
  return null;
}

function buildInstance(
  c: CompiledSchedule,
  base: {
    key: string;
    source: ShiftInstance["source"];
    status: ShiftInstance["status"];
    startWall: number;
    endWall: number;
    crewSize?: number | null;
    overrideId?: string;
    cycleIndex?: number;
    blockIndex?: number;
  },
): ShiftInstance | null {
  const startMs = wallToInstant(base.startWall, c.timezone).instantMs;
  const endMs = wallToInstant(base.endWall, c.timezone).instantMs;
  if (!(endMs > startMs)) return null;
  const crewOverridden = base.crewSize != null;
  return {
    key: base.key,
    source: base.source,
    status: base.status,
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    startLocal: formatLocalDateTime(instantToWall(startMs, c.timezone)),
    endLocal: formatLocalDateTime(instantToWall(endMs, c.timezone)),
    timezone: c.timezone,
    scheduledMinutes: Math.round((base.endWall - base.startWall) / MINUTE_MS),
    elapsedMinutes: Math.round((endMs - startMs) / MINUTE_MS),
    crewSize: crewOverridden ? base.crewSize! : c.defaultCrewSize,
    crewSizeOverridden: crewOverridden,
    ...(base.overrideId ? { overrideId: base.overrideId } : {}),
    ...(base.cycleIndex != null ? { cycleIndex: base.cycleIndex, blockIndex: base.blockIndex } : {}),
  };
}

function withinModifyLimit(scheduledWall: number, nextWall: number): boolean {
  return Math.abs(nextWall - scheduledWall) <= SCHEDULE_LIMITS.maxModifyShiftMinutes * MINUTE_MS;
}

export interface ShiftQueryOptions {
  /** Include "Not Working This Shift" occurrences (status "cancelled"). Default false. */
  includeCancelled?: boolean;
}

/**
 * All shifts overlapping [range.from, range.to), sorted by start. Pattern
 * shifts with overrides applied, plus extra shifts. Overrides whose key no
 * longer matches the pattern (e.g. after the pattern was edited) are ignored.
 */
export function getShiftsInRange(
  schedule: PersonalSchedule,
  overrides: readonly ScheduleOverride[],
  range: ShiftRange,
  options: ShiftQueryOptions = {},
): ShiftInstance[] {
  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();
  if (!(toMs > fromMs)) return [];
  const c = compileSchedule(schedule);

  const byKey = new Map<string, ScheduleOverride>();
  for (const o of overrides) {
    if (o.kind !== "extra") byKey.set(o.shiftKey, o);
  }

  const fromWall = instantToWall(fromMs, c.timezone) - GENERATION_PAD_MS;
  const toWall = instantToWall(toMs, c.timezone) + GENERATION_PAD_MS;
  const instances: ShiftInstance[] = [];

  for (const occ of occurrencesInWallRange(c, fromWall, toWall)) {
    const override = byKey.get(occ.key);
    let startWall = occ.startWall;
    let endWall = occ.endWall;
    let status: ShiftInstance["status"] = "scheduled";
    let crewSize: number | null | undefined;

    if (override?.kind === "cancel") {
      status = "cancelled";
    } else if (override?.kind === "modify") {
      const nextStart = override.startLocal ? parseLocalDateTime(override.startLocal) : null;
      const nextEnd = override.endLocal ? parseLocalDateTime(override.endLocal) : null;
      const candidateStart = nextStart ?? startWall;
      const candidateEnd = nextEnd ?? endWall;
      if (
        candidateEnd > candidateStart &&
        withinModifyLimit(occ.startWall, candidateStart) &&
        withinModifyLimit(occ.endWall, candidateEnd)
      ) {
        startWall = candidateStart;
        endWall = candidateEnd;
      }
      crewSize = override.crewSize;
      status = "modified";
    }

    const instance = buildInstance(c, {
      key: occ.key,
      source: "pattern",
      status,
      startWall,
      endWall,
      crewSize,
      overrideId: override?.id,
      cycleIndex: occ.cycleIndex,
      blockIndex: occ.blockIndex,
    });
    if (instance) instances.push(instance);
  }

  for (const o of overrides) {
    if (o.kind !== "extra") continue;
    const startWall = parseLocalDateTime(o.startLocal);
    const endWall = parseLocalDateTime(o.endLocal);
    if (startWall == null || endWall == null || endWall <= startWall) continue;
    if (endWall - startWall > SCHEDULE_LIMITS.maxExtraShiftMinutes * MINUTE_MS) continue;
    const instance = buildInstance(c, {
      key: `extra:${o.id}`,
      source: "extra",
      status: "scheduled",
      startWall,
      endWall,
      crewSize: o.crewSize,
      overrideId: o.id,
    });
    if (instance) instances.push(instance);
  }

  return instances
    .filter((s) => Date.parse(s.end) > fromMs && Date.parse(s.start) < toMs)
    .filter((s) => options.includeCancelled || s.status !== "cancelled")
    .sort((a, b) => a.start.localeCompare(b.start) || a.key.localeCompare(b.key));
}

/** How far ahead getNextShift will look before giving up (e.g. every shift cancelled). */
const NEXT_SHIFT_HORIZON_MS = 2 * 366 * DAY_MS;

/**
 * The next working shift that starts at or after `now`. With
 * `includeInProgress`, a shift already under way at `now` is returned first.
 * Cancelled occurrences are skipped.
 */
export function getNextShift(
  schedule: PersonalSchedule,
  overrides: readonly ScheduleOverride[],
  now: Date,
  options: { includeInProgress?: boolean } = {},
): ShiftInstance | null {
  const c = compileSchedule(schedule);
  const nowMs = now.getTime();
  let windowMs = Math.max(c.cycleMs, DAY_MS) + 2 * DAY_MS;
  let fromMs = nowMs;
  while (fromMs - nowMs < NEXT_SHIFT_HORIZON_MS) {
    const toMs = fromMs + windowMs;
    const hit = getShiftsInRange(schedule, overrides, { from: new Date(fromMs), to: new Date(toMs) }).find((s) =>
      options.includeInProgress ? Date.parse(s.end) > nowMs : Date.parse(s.start) >= nowMs,
    );
    if (hit) return hit;
    fromMs = toMs;
    windowMs *= 2;
  }
  return null;
}

/** The working shift under way at `now`, if any. */
export function getCurrentShift(
  schedule: PersonalSchedule,
  overrides: readonly ScheduleOverride[],
  now: Date,
): ShiftInstance | null {
  const nowMs = now.getTime();
  return (
    getShiftsInRange(schedule, overrides, { from: now, to: new Date(nowMs + 1) }).find(
      (s) => Date.parse(s.start) <= nowMs && Date.parse(s.end) > nowMs,
    ) ?? null
  );
}
