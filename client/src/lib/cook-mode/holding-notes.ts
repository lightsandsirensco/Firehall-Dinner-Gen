import type { CookModeStep } from "./types";

const HOLD_PATTERN =
  /\b(hold|holding|pause|interruption|interrupt|tones?|call|140\s*°|200\s*°|warm|rest|cover|foil|hotel pan|sheet pan)\b/i;

export const STATION_HOLD_DEFAULTS = [
  "Tones go off? Kill active burners first, then cover and hold — don't leave raw protein on the counter.",
  "Oven hold: 200°F (93°C) with foil keeps most plates hot 20–30 minutes without overcooking.",
  "Protein safe hold: above 140°F (60°C) — warm sheet pan, low oven, or covered hotel pan.",
  "Back on scene? Quick doneness check before you plate — splash stock or water if anything looks dry.",
] as const;

export function extractHoldingGuidance(
  steps: CookModeStep[],
  proTips: string[] = [],
): string[] {
  const fromSteps = steps
    .filter((s) => HOLD_PATTERN.test(`${s.title} ${s.instruction}`))
    .map((s) => {
      const label = s.title.trim();
      const snippet = s.instruction.trim();
      return label ? `Step ${s.stepNumber} — ${label}: ${snippet}` : snippet;
    });

  const fromTips = proTips.filter((t) => HOLD_PATTERN.test(t));

  const combined = [...fromSteps, ...fromTips];
  const unique = [...new Set(combined.map((s) => s.trim()))].filter(Boolean);
  return unique.slice(0, 6);
}

export function buildHoldingPanelNotes(
  steps: CookModeStep[],
  proTips: string[] = [],
  extra: string[] = [],
): string[] {
  const recipeSpecific = extractHoldingGuidance(steps, proTips);
  const merged = [...recipeSpecific, ...extra, ...STATION_HOLD_DEFAULTS];
  return [...new Set(merged.map((s) => s.trim()))].filter(Boolean).slice(0, 8);
}
