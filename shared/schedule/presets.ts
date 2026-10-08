/**
 * Schedule presets — shortcuts that fill in `blocks` (and a suggested start
 * time). The engine never reads preset ids or labels; a saved schedule is
 * just its blocks. Department-specific names (Kelly, Pitman, Detroit, …) mean
 * different rotations in different places, so presets are described by what
 * they do, not by a name.
 */
import type { ScheduleBlock } from "./types.js";

/** Build blocks from [kind, hours] steps; adjacent OFF steps merge (adjacent ON stay separate shifts). */
export function blocksFromHours(steps: ReadonlyArray<readonly ["on" | "off", number]>): ScheduleBlock[] {
  const out: ScheduleBlock[] = [];
  for (const [kind, hours] of steps) {
    const minutes = Math.round(hours * 60);
    if (minutes <= 0) continue;
    const last = out[out.length - 1];
    if (kind === "off" && last?.kind === "off") last.minutes += minutes;
    else out.push({ kind, minutes });
  }
  return out;
}

/**
 * Day-based helper: one letter per calendar day — "W" works `shiftHours`
 * from the start time, "O" is a day off. "WWOOWWWOOWWOOO" = 2-2-3.
 */
export function blocksFromDayCodes(codes: string, shiftHours: number): ScheduleBlock[] {
  const steps: Array<["on" | "off", number]> = [];
  for (const ch of codes.toUpperCase()) {
    if (ch === "W") steps.push(["on", shiftHours], ["off", 24 - shiftHours]);
    else if (ch === "O") steps.push(["off", 24]);
  }
  return blocksFromHours(steps);
}

export interface SchedulePreset {
  id: string;
  label: string;
  description: string;
  suggestedStartTime: string;
  blocks: ScheduleBlock[];
}

export const SCHEDULE_PRESETS: readonly SchedulePreset[] = [
  {
    id: "24on-48off",
    label: "24 on / 48 off",
    description: "One 24-hour shift, then two days off. 3-day cycle.",
    suggestedStartTime: "07:00",
    blocks: blocksFromHours([["on", 24], ["off", 48]]),
  },
  {
    id: "24on-72off",
    label: "24 on / 72 off",
    description: "One 24-hour shift, then three days off. 4-day cycle.",
    suggestedStartTime: "07:00",
    blocks: blocksFromHours([["on", 24], ["off", 72]]),
  },
  {
    id: "48on-96off",
    label: "48 on / 96 off",
    description: "One 48-hour shift, then four days off. 6-day cycle.",
    suggestedStartTime: "07:00",
    blocks: blocksFromHours([["on", 48], ["off", 96]]),
  },
  {
    id: "24-24-24-96",
    label: "24 on / 24 off ×3, then 96 off",
    description: "Three 24s separated by a day off, then four days off. 9-day cycle.",
    suggestedStartTime: "07:00",
    blocks: blocksFromHours([
      ["on", 24],
      ["off", 24],
      ["on", 24],
      ["off", 24],
      ["on", 24],
      ["off", 96],
    ]),
  },
  {
    id: "12h-2-2-3",
    label: "12-hour 2-2-3",
    description: "12-hour day shifts: 2 on, 2 off, 3 on, 2 off, 2 on, 3 off. 14-day cycle.",
    suggestedStartTime: "07:00",
    blocks: blocksFromDayCodes("WWOOWWWOOWWOOO", 12),
  },
  {
    id: "12h-4on-4off",
    label: "12-hour 4 on / 4 off",
    description: "Four 12-hour day shifts, then four days off. 8-day cycle.",
    suggestedStartTime: "07:00",
    blocks: blocksFromDayCodes("WWWWOOOO", 12),
  },
  {
    id: "12h-2d-2n-4off",
    label: "12-hour 2 days, 2 nights, 4 off",
    description: "Two 12-hour days, two 12-hour nights, then four days off. 8-day cycle.",
    suggestedStartTime: "07:00",
    blocks: blocksFromHours([
      ["on", 12],
      ["off", 12],
      ["on", 12],
      ["off", 12],
      ["off", 12],
      ["on", 12],
      ["off", 12],
      ["on", 12],
      ["off", 96],
    ]),
  },
  {
    id: "10-14-2d-2n-4off",
    label: "10/14: 2 days, 2 nights, 4 off",
    description: "Two 10-hour days, two 14-hour nights, then four days off. 8-day cycle.",
    suggestedStartTime: "08:00",
    blocks: blocksFromHours([
      ["on", 10],
      ["off", 14],
      ["on", 10],
      ["off", 14],
      ["off", 10],
      ["on", 14],
      ["off", 10],
      ["on", 14],
      ["off", 96],
    ]),
  },
  {
    id: "8h-5on-2off",
    label: "8-hour 5 on / 2 off",
    description: "Five 8-hour shifts on consecutive days, then two days off. 7-day cycle.",
    suggestedStartTime: "08:00",
    blocks: blocksFromDayCodes("WWWWWOO", 8),
  },
];

export function getSchedulePreset(id: string): SchedulePreset | undefined {
  return SCHEDULE_PRESETS.find((p) => p.id === id);
}
