/**
 * Hall Pantry — this fire hall's shared "we always have this" staples list.
 *
 * Device-local and scoped by the same client-side hallId concept already
 * used for Hall Favorites (`hall-profile-store.ts`) — no server hall
 * membership or auth required, consistent with that precedent.
 */

import {
  PANTRY_SCHEMA_VERSION,
  createPantryProfile,
  type PantryProfile,
} from "@shared/shopping";
import { getHallProfile } from "@/lib/hall-profile-store";

const STORAGE_KEY = "firehall_hall_pantry_v1";

export const HALL_PANTRY_CHANGED_EVENT = "hall-pantry-changed";

interface StoredHallPantry extends PantryProfile {
  hallId: string;
}

function dispatchChanged(): void {
  try {
    window.dispatchEvent(new Event(HALL_PANTRY_CHANGED_EVENT));
  } catch {
    /* non-browser environment */
  }
}

function defaultSnapshot(hallId: string): StoredHallPantry {
  return { ...createPantryProfile(), hallId };
}

function parseSnapshot(raw: string, hallId: string): StoredHallPantry {
  try {
    const parsed = JSON.parse(raw) as StoredHallPantry;
    if (parsed?.schemaVersion !== PANTRY_SCHEMA_VERSION) return defaultSnapshot(hallId);
    if (parsed.hallId !== hallId) return defaultSnapshot(hallId);
    if (!parsed.items || typeof parsed.items !== "object") return defaultSnapshot(hallId);
    return parsed;
  } catch {
    return defaultSnapshot(hallId);
  }
}

export function getHallPantry(): PantryProfile {
  const hallId = getHallProfile().hallId;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSnapshot(hallId);
    return parseSnapshot(raw, hallId);
  } catch {
    return defaultSnapshot(hallId);
  }
}

export function saveHallPantry(profile: PantryProfile): void {
  const hallId = getHallProfile().hallId;
  try {
    const stored: StoredHallPantry = { ...profile, hallId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    dispatchChanged();
  } catch {
    /* quota / private mode */
  }
}

export function resetHallPantry(): PantryProfile {
  const fresh = createPantryProfile();
  saveHallPantry(fresh);
  return fresh;
}

/** Account migration seam: implement the same shape against a server API later. */
export interface HallPantryStore {
  getProfile(): PantryProfile;
  saveProfile(profile: PantryProfile): void;
  resetProfile(): PantryProfile;
}

export const localHallPantryStore: HallPantryStore = {
  getProfile: getHallPantry,
  saveProfile: saveHallPantry,
  resetProfile: resetHallPantry,
};
