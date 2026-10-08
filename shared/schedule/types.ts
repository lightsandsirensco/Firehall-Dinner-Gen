/**
 * Personal firefighter schedule — repeating pattern + one-off overrides.
 *
 * Nothing here stores future shifts: instances are generated deterministically
 * from the pattern and overrides (see engine.ts). Presets only produce a
 * `blocks` array; the engine never interprets a preset id or name.
 */

/** One contiguous ON or OFF period of the repeating cycle, in wall-clock minutes. */
export interface ScheduleBlock {
  kind: "on" | "off";
  minutes: number;
}

export interface PersonalSchedule {
  /** IANA zone, e.g. "America/Toronto". Shift clock times are local to this zone. */
  timezone: string;
  /** "YYYY-MM-DD" — the local date on which cycle position 0 begins. */
  anchorDate: string;
  /** "HH:MM" — local clock time at which cycle position 0 begins. */
  startTime: string;
  /** Repeating ON/OFF sequence. Cycle length = sum of block minutes. */
  blocks: ScheduleBlock[];
  defaultCrewSize: number;
  /** Informational only — which shortcut produced `blocks`, if any. */
  presetId?: string | null;
}

export type ScheduleOverrideKind = "extra" | "cancel" | "modify";

interface OverrideBase {
  id: string;
  note?: string | null;
}

/** Add Extra Shift — a work period outside the pattern. Local wall times in the schedule's zone. */
export interface ExtraShiftOverride extends OverrideBase {
  kind: "extra";
  startLocal: string;
  endLocal: string;
  crewSize?: number | null;
}

/** Not Working This Shift — cancels one generated occurrence. */
export interface CancelShiftOverride extends OverrideBase {
  kind: "cancel";
  shiftKey: string;
}

/** Modified start/end and/or temporary crew size for one generated occurrence. */
export interface ModifyShiftOverride extends OverrideBase {
  kind: "modify";
  shiftKey: string;
  startLocal?: string | null;
  endLocal?: string | null;
  crewSize?: number | null;
}

export type ScheduleOverride = ExtraShiftOverride | CancelShiftOverride | ModifyShiftOverride;

export type ShiftStatus = "scheduled" | "modified" | "cancelled";

export interface ShiftInstance {
  /**
   * Stable occurrence key. Pattern shifts: the scheduled local start
   * ("YYYY-MM-DDTHH:MM"); extra shifts: "extra:<override id>". Overrides
   * reference pattern shifts by this key.
   */
  key: string;
  source: "pattern" | "extra";
  status: ShiftStatus;
  /** ISO-8601 UTC instants. */
  start: string;
  end: string;
  /**
   * Local clock readings in `timezone` ("YYYY-MM-DDTHH:MM") of the real
   * start/end. Equal to the key except when a start falls in a DST gap
   * (02:30 on spring-forward night is reported as 03:30).
   */
  startLocal: string;
  endLocal: string;
  timezone: string;
  /** Wall-clock length (what the roster says, e.g. 1440 for a 24). */
  scheduledMinutes: number;
  /** Real elapsed minutes — differs from scheduledMinutes by ±60 across a DST change. */
  elapsedMinutes: number;
  crewSize: number;
  crewSizeOverridden: boolean;
  overrideId?: string;
  /** Pattern shifts only. */
  cycleIndex?: number;
  blockIndex?: number;
}

export interface ShiftRange {
  /** Inclusive start instant. */
  from: Date;
  /** Exclusive end instant. */
  to: Date;
}
