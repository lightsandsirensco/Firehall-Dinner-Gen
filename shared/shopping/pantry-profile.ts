/**
 * Smart Shopping — Pantry (Personal or Hall).
 *
 * A pantry is a map of canonical ingredient key -> StockLevel. It powers
 * both the "Personal Pantry" (this device's firefighter) and the "Hall
 * Pantry" (this fire hall's canteen staples) — same shape, same helpers.
 * Untracked keys default to "never" (must buy), so a fresh pantry with no
 * entries behaves exactly like no pantry at all.
 */

import { COMMON_STAPLES } from "./common-staples";
import { PANTRY_SCHEMA_VERSION, stockLevelHidesItem, type PantryProfile, type StockLevel } from "./types";

/** New pantries start pre-seeded with common staples marked "always" — invisible by default. */
export function createPantryProfile(): PantryProfile {
  const items: Record<string, StockLevel> = {};
  for (const staple of COMMON_STAPLES) {
    items[staple.key] = "always";
  }
  return {
    schemaVersion: PANTRY_SCHEMA_VERSION,
    items,
    updatedAt: new Date().toISOString(),
  };
}

/** A pantry with no entries at all — distinct from "reset to defaults". */
export function createEmptyPantryProfile(): PantryProfile {
  return { schemaVersion: PANTRY_SCHEMA_VERSION, items: {}, updatedAt: new Date().toISOString() };
}

/** "Allow resetting" — back to the sensible common-staple defaults, discarding custom edits. */
export function resetPantryProfile(): PantryProfile {
  return createPantryProfile();
}

export function getStockLevel(profile: PantryProfile, canonicalKey: string): StockLevel {
  return profile.items[canonicalKey] ?? "never";
}

export function isStapleOwned(profile: PantryProfile, canonicalKey: string): boolean {
  return stockLevelHidesItem(getStockLevel(profile, canonicalKey));
}

export function setStockLevel(profile: PantryProfile, canonicalKey: string, level: StockLevel): PantryProfile {
  const key = canonicalKey.trim();
  if (!key) return profile;
  return {
    ...profile,
    items: { ...profile.items, [key]: level },
    updatedAt: new Date().toISOString(),
  };
}

export function removeStockLevel(profile: PantryProfile, canonicalKey: string): PantryProfile {
  if (!(canonicalKey in profile.items)) return profile;
  const items = { ...profile.items };
  delete items[canonicalKey];
  return { ...profile, items, updatedAt: new Date().toISOString() };
}

const CYCLE_ORDER: StockLevel[] = ["never", "always", "usually"];

/** Quick-tap cycle for a single shopping-list item: never -> always -> usually -> never. */
export function cycleStockLevel(profile: PantryProfile, canonicalKey: string): PantryProfile {
  const current = getStockLevel(profile, canonicalKey);
  const next = CYCLE_ORDER[(CYCLE_ORDER.indexOf(current) + 1) % CYCLE_ORDER.length];
  return setStockLevel(profile, canonicalKey, next);
}

/** Legacy helpers kept for callers that just want an on/off toggle (defaults new marks to "always"). */
export function markStapleOwned(profile: PantryProfile, canonicalKey: string): PantryProfile {
  return setStockLevel(profile, canonicalKey, "always");
}

export function unmarkStapleOwned(profile: PantryProfile, canonicalKey: string): PantryProfile {
  return setStockLevel(profile, canonicalKey, "never");
}

export function toggleStapleOwned(profile: PantryProfile, canonicalKey: string): PantryProfile {
  return isStapleOwned(profile, canonicalKey)
    ? unmarkStapleOwned(profile, canonicalKey)
    : markStapleOwned(profile, canonicalKey);
}

export interface PantryEntry {
  key: string;
  level: StockLevel;
}

/** All explicit entries, sorted alphabetically — for rendering a pantry settings list. */
export function listPantryEntries(profile: PantryProfile): PantryEntry[] {
  return Object.entries(profile.items)
    .map(([key, level]) => ({ key, level }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
