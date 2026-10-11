/**
 * Shift (/shift) — which "tonight" shortcut, if any, the signed-in home shows.
 *
 *   current_meal — a meal was deliberately picked for tonight: link to /tonight.
 *   pick         — tonight is relevant (no upcoming shift, on shift now, or the
 *                  shift starts soon): offer Pick Tonight (/generator).
 *   null         — the user is planning a shift that is still a while off.
 */
export type TonightShortcut = "current_meal" | "pick" | null;

/** A shift starting within this window counts as "tonight". */
export const PICK_TONIGHT_LEAD_MS = 12 * 60 * 60 * 1000;

export function tonightShortcut(input: {
  hasTonightPick: boolean;
  /** Viewing a later shift via Plan Ahead (?shift=…). */
  planAhead: boolean;
  shift: { start: string; end: string } | null;
  now?: number;
}): TonightShortcut {
  if (input.hasTonightPick) return "current_meal";
  if (input.planAhead) return null;
  if (!input.shift) return "pick";
  const now = input.now ?? Date.now();
  const start = Date.parse(input.shift.start);
  const end = Date.parse(input.shift.end);
  if (!Number.isFinite(start)) return "pick";
  if (start <= now && (!Number.isFinite(end) || now < end)) return "pick";
  return start - now <= PICK_TONIGHT_LEAD_MS ? "pick" : null;
}
