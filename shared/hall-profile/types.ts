/**
 * Hall Profile + Hall History — device-local today, account-syncable later.
 */

export const HALL_PROFILE_SCHEMA_VERSION = 1 as const;
export const HALL_HISTORY_SCHEMA_VERSION = 1 as const;

export const HALL_REPEAT_COOLDOWN_DAYS = 7;

export interface HallProfile {
  schemaVersion: typeof HALL_PROFILE_SCHEMA_VERSION;
  /**
   * Stable device/client id for local snapshots — NOT membership `hall_id`.
   * Prefer thinking of this as `clientId` when reading product docs.
   */
  hallId: string;
  hallName?: string;
  /** e.g. "A Shift", "B Platoon" */
  shiftLabel?: string;
  defaultCrewSize: number;
  updatedAt: string;
}

export type HallHistoryEntryType =
  | "meal_cooked"
  | "meal_generated"
  | "wheel_result"
  | "hall_vote";

export interface HallHistoryEntry {
  id: string;
  type: HallHistoryEntryType;
  /** ISO timestamp — when the meal was cooked or event occurred */
  at: string;
  title: string;
  recipeSlug?: string;
  recipePath?: string;
  crewSize?: number;
  /** Snapshot from profile at record time */
  shiftLabel?: string;
  hallName?: string;
  source: string;
  meta?: {
    voteId?: string;
    optionCount?: number;
    winnerName?: string;
    segmentIndex?: number;
  };
}

export interface HallHistorySnapshot {
  schemaVersion: typeof HALL_HISTORY_SCHEMA_VERSION;
  hallId: string;
  entries: HallHistoryEntry[];
  updatedAt: string;
}

/** Account migration: implement for localStorage now, remote API later. */
export interface HallHistoryStore {
  getSnapshot(): HallHistorySnapshot;
  getEntries(): HallHistoryEntry[];
  appendEntry(
    input: Omit<HallHistoryEntry, "id" | "at"> & { at?: string },
  ): HallHistoryEntry;
  replaceSnapshot(snapshot: HallHistorySnapshot): void;
}

export interface HallProfileStore {
  getProfile(): HallProfile;
  updateProfile(patch: Partial<Pick<HallProfile, "hallName" | "shiftLabel" | "defaultCrewSize">>): HallProfile;
}
