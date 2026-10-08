/**
 * Smart Shopping — device-local persistence.
 *
 * Mirrors the `hall-favorites-store` pattern: versioned localStorage
 * snapshots, a pub/sub change event for React hooks, and a small interface
 * object so a server-backed implementation can be swapped in later without
 * touching call sites.
 */

import {
  createShoppingSession,
  createEmptyHistory,
  createPantryProfile,
  restorePantryProfile,
  restoreShoppingHistory,
  restoreShoppingSession,
  restoreUndoStack,
  serializeShoppingSession,
  type ShoppingSession,
  type ShoppingHistory,
  type PantryProfile,
} from "@shared/shopping";

const SESSION_KEY = "firehall_shopping_session_v1";
const HISTORY_KEY = "firehall_shopping_history_v1";
const PANTRY_KEY = "firehall_pantry_profile_v1";
const UNDO_KEY = "firehall_shopping_undo_v1";

export const SHOPPING_SESSION_CHANGED_EVENT = "shopping-session-changed";

function dispatchChanged(): void {
  try {
    window.dispatchEvent(new Event(SHOPPING_SESSION_CHANGED_EVENT));
  } catch {
    /* non-browser environment */
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — fail silently, in-memory state still works this tab */
  }
}

export function getShoppingSession(): ShoppingSession {
  return restoreShoppingSession(readJson<unknown>(SESSION_KEY)) ?? createShoppingSession();
}

export function saveShoppingSession(session: ShoppingSession): void {
  try {
    localStorage.setItem(SESSION_KEY, serializeShoppingSession(session));
  } catch {
    /* quota / private mode — fail silently, in-memory state still works this tab */
  }
  dispatchChanged();
}

export function startNewShoppingSession(): ShoppingSession {
  const fresh = createShoppingSession();
  saveShoppingSession(fresh);
  saveUndoStack([]);
  return fresh;
}

export function getShoppingHistory(): ShoppingHistory {
  return restoreShoppingHistory(readJson<unknown>(HISTORY_KEY)) ?? createEmptyHistory();
}

export function saveShoppingHistory(history: ShoppingHistory): void {
  writeJson(HISTORY_KEY, history);
  dispatchChanged();
}

export function getPantryProfile(): PantryProfile {
  return restorePantryProfile(readJson<unknown>(PANTRY_KEY)) ?? createPantryProfile();
}

export function savePantryProfile(profile: PantryProfile): void {
  writeJson(PANTRY_KEY, profile);
  dispatchChanged();
}

export function resetPantryProfile(): PantryProfile {
  const fresh = createPantryProfile();
  savePantryProfile(fresh);
  return fresh;
}

export function getUndoStack(): ShoppingSession[] {
  return restoreUndoStack(readJson<unknown>(UNDO_KEY));
}

export function saveUndoStack(stack: ShoppingSession[]): void {
  writeJson(UNDO_KEY, stack);
}

/** Account migration seam: implement the same shape against a server API later. */
export interface ShoppingStore {
  getSession(): ShoppingSession;
  saveSession(session: ShoppingSession): void;
  getHistory(): ShoppingHistory;
  saveHistory(history: ShoppingHistory): void;
  getPantryProfile(): PantryProfile;
  savePantryProfile(profile: PantryProfile): void;
}

export const localShoppingStore: ShoppingStore = {
  getSession: getShoppingSession,
  saveSession: saveShoppingSession,
  getHistory: getShoppingHistory,
  saveHistory: saveShoppingHistory,
  getPantryProfile,
  savePantryProfile,
};
