/**
 * Classics Wheel personality — kitchen-table humor and shift-life one-liners.
 */

import { hashSeed } from "@shared/meal-rotation/weighted-pick";

const SPIN_SUSPENSE = [
  "The crew is watching…",
  "Kitchen table rules apply.",
  "No take-backs once it lands.",
  "Somebody's about to be on dishes.",
  "This is how halls actually decide.",
];

const LAND_ONE_LINERS = [
  "That's dinner. Argue later.",
  "Every hall ends up here eventually.",
  "Classic move. Nobody's mad.",
  "The rookie's learning tonight.",
  "This always hits after a rough shift.",
  "You know this smell already.",
  "Hall-tested. Argument over.",
];

const ROOKIE_JOKES = [
  "Rookie pick — but honestly, solid.",
  "Even the probie can pull this off.",
  "New guy friendly. Veterans still eat it.",
];

const SHIFT_LINES = [
  "Heavy call night? This works.",
  "Post-tone comfort food.",
  "Feeds ten without drama.",
  "One pot, one crew, one argument about spice.",
];

export function pickWheelSuspense(seed: string): string {
  return SPIN_SUSPENSE[hashSeed(`suspense:${seed}`) % SPIN_SUSPENSE.length]!;
}

export function pickWheelLandLine(seed: string, isRookieFriendly?: boolean): string {
  if (isRookieFriendly && hashSeed(`rookie:${seed}`) % 3 === 0) {
    return ROOKIE_JOKES[hashSeed(`rj:${seed}`) % ROOKIE_JOKES.length]!;
  }
  if (hashSeed(`shift:${seed}`) % 4 === 0) {
    return SHIFT_LINES[hashSeed(`sl:${seed}`) % SHIFT_LINES.length]!;
  }
  return LAND_ONE_LINERS[hashSeed(`land:${seed}`) % LAND_ONE_LINERS.length]!;
}

export function pickWheelIntro(seed: string): string {
  const intros = [
    "Tonight's hall meal:",
    "The wheel says:",
    "Kitchen table verdict:",
    "Crew pick locked in:",
  ];
  return intros[hashSeed(`intro:${seed}`) % intros.length]!;
}
