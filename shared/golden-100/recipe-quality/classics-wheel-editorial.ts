/**
 * Shared editorial blocks for Classics Wheel flagship recipes.
 */

import type { GoldenRecipePageStep } from "../recipe-page-schema.js";

export const CALL_INTERRUPTION_STEP = (
  stepNumber: number,
  proteinLabel = "proteins",
): GoldenRecipePageStep => ({
  stepNumber,
  title: "Hold for call interruptions",
  instruction: `If tones drop mid-cook: turn off direct heat and cover ${proteinLabel} — hold at 140°F in a warm cabinet or 200°F oven, never below 140°F for more than 30 minutes cumulative. Log hold time on the pan with a grease pencil. If tones drop after service, cover hot food and keep sides on low heat or ice as appropriate. On return, spot-check proteins at safe internal temp before reopening the line.`,
  minutes: 5,
  heatLevel: "low",
});

export const LEFTOVERS_PACK_DOWN_STEP = (
  stepNumber: number,
  proteinLabel = "proteins",
): GoldenRecipePageStep => ({
  stepNumber,
  title: "Pack down leftovers safely",
  instruction: `Cool ${proteinLabel} and hot components in a shallow baking dish within two hours — food left out too long isn't safe to eat. Label with date; reheat proteins to 165°F minimum before second shift. Store cold components separately so textures survive overnight.`,
  minutes: 10,
  heatLevel: "",
});

export function buildStructuredTonightSpread(
  main: string,
  sides: string[],
  condiments: string[] = [],
): string[] {
  const lines = [`Main: ${main}`, `Sides: ${sides.join(", ")}`];
  if (condiments.length) lines.push(`Condiments: ${condiments.join(", ")}`);
  lines.push("Set hot components closest to the crew; cold crunch and toppings at the far end of the line.");
  lines.push("Keep a backup tray at 200°F for firefighters returning from a run.");
  return lines;
}

export function standardLeftovers(proteinLabel: string, extra?: string[]): string[] {
  return [
    `Cool ${proteinLabel} in shallow pans within two hours; label with date and reheat to 165°F before second shift.`,
    "Store cold sides separately — hot and cold stacked overnight ruins texture.",
    ...(extra ?? []),
  ];
}

export const BANNED_STEP_PHRASES =
  /cook until done|prepare ingredients|finish and serve|set the line|rest briefly|gather ingredients and equipment|preheat ovens and surfaces/i;
