export const SYNC_SNAPSHOT_KEYS = [
  /** @deprecated Legacy key — use personal_favorites */
  "hall_favorites",
  /** @deprecated Legacy key — use personal_meal_history */
  "hall_history",
  "wheel_streak",
  /** @deprecated Legacy key — use cooking_preferences */
  "hall_profile",
  "personal_favorites",
  "personal_meal_history",
  "cooking_preferences",
] as const;

export type SyncSnapshotKey = (typeof SYNC_SNAPSHOT_KEYS)[number];

export type LegacySyncSnapshotKey = "hall_favorites" | "hall_history" | "hall_profile";

export type CanonicalPersonalSyncKey =
  | "personal_favorites"
  | "personal_meal_history"
  | "cooking_preferences"
  | "wheel_streak";

/** Map legacy sync keys to personal-first canonical keys. */
export const SYNC_KEY_TO_CANONICAL: Record<LegacySyncSnapshotKey, CanonicalPersonalSyncKey> = {
  hall_favorites: "personal_favorites",
  hall_history: "personal_meal_history",
  hall_profile: "cooking_preferences",
};

export const SYNC_KEY_TO_LEGACY: Record<
  Exclude<CanonicalPersonalSyncKey, "wheel_streak">,
  LegacySyncSnapshotKey
> = {
  personal_favorites: "hall_favorites",
  personal_meal_history: "hall_history",
  cooking_preferences: "hall_profile",
};

export interface SyncSnapshotRow {
  data_key: SyncSnapshotKey;
  snapshot_json: unknown;
  updated_at: string;
}

export interface SyncPullResponse {
  snapshots: SyncSnapshotRow[];
}

export interface SyncPushPayload {
  snapshots: SyncSnapshotRow[];
}

export interface SyncPushResult {
  ok: true;
  upserted: number;
  snapshots: SyncSnapshotRow[];
}

function isLegacySyncKey(key: string): key is LegacySyncSnapshotKey {
  return key === "hall_favorites" || key === "hall_history" || key === "hall_profile";
}

function isCanonicalPersonalKey(key: string): key is CanonicalPersonalSyncKey {
  return (
    key === "personal_favorites" ||
    key === "personal_meal_history" ||
    key === "cooking_preferences" ||
    key === "wheel_streak"
  );
}

/** Prefer canonical personal keys; fall back to legacy hall_* keys on pull. */
export function normalizeSyncSnapshots(rows: SyncSnapshotRow[]): SyncSnapshotRow[] {
  const byCanonical = new Map<CanonicalPersonalSyncKey, SyncSnapshotRow>();

  for (const row of rows) {
    if (isCanonicalPersonalKey(row.data_key)) {
      const existing = byCanonical.get(row.data_key);
      if (!existing || row.updated_at >= existing.updated_at) {
        byCanonical.set(row.data_key, row);
      }
      continue;
    }
    if (isLegacySyncKey(row.data_key)) {
      const canonical = SYNC_KEY_TO_CANONICAL[row.data_key];
      const existing = byCanonical.get(canonical);
      const migrated: SyncSnapshotRow = {
        ...row,
        data_key: canonical,
      };
      if (!existing || migrated.updated_at >= existing.updated_at) {
        byCanonical.set(canonical, migrated);
      }
    }
  }

  return Array.from(byCanonical.values()).sort((a, b) => a.data_key.localeCompare(b.data_key));
}

/** Dual-write legacy keys so older clients keep syncing during migration. */
export function expandSyncSnapshotsForPush(rows: SyncSnapshotRow[]): SyncSnapshotRow[] {
  const expanded = new Map<string, SyncSnapshotRow>();

  for (const row of rows) {
    expanded.set(row.data_key, row);
    if (row.data_key === "personal_favorites") {
      expanded.set("hall_favorites", { ...row, data_key: "hall_favorites" });
    } else if (row.data_key === "personal_meal_history") {
      expanded.set("hall_history", { ...row, data_key: "hall_history" });
    } else if (row.data_key === "cooking_preferences") {
      expanded.set("hall_profile", { ...row, data_key: "hall_profile" });
    } else if (isLegacySyncKey(row.data_key)) {
      const canonical = SYNC_KEY_TO_CANONICAL[row.data_key];
      expanded.set(canonical, { ...row, data_key: canonical });
    }
  }

  return Array.from(expanded.values());
}
