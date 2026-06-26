import { apiRequest } from "@/lib/queryClient";
import { trackSyncCompleted, trackSyncFailed } from "@/lib/analytics";
import {
  mergeHallFavorites,
  mergeHallHistory,
  mergeHallProfile,
  mergeSavedMeals,
  mergeWheelStreak,
} from "@shared/sync/merge";
import type { HallFavoritesSnapshot } from "@shared/hall-favorites/types";
import type { HallHistorySnapshot, HallProfile } from "@shared/hall-profile/types";
import type { WheelStreakSnapshot } from "@shared/wheel-streak/types";
import type { SyncPullResponse, SyncSnapshotRow } from "@shared/sync/types";
import {
  expandSyncSnapshotsForPush,
  normalizeSyncSnapshots,
  type CanonicalPersonalSyncKey,
  type LegacySyncSnapshotKey,
} from "@shared/sync/types";
import {
  applyHallFavoritesSnapshot,
  applyHallHistorySnapshot,
  applyHallProfileSnapshot,
  applySavedMeals,
  applyWheelStreakSnapshot,
  collectLocalSnapshots,
  fromSavedMealRows,
  getLocalSavedMeals,
  snapshotByKey,
  toSavedMealRows,
} from "./local-snapshots";

const DIRTY_KEY = "fh_sync_dirty_v1";
const SYNC_LOCK_KEY = "fh_sync_inflight";

export type SyncTrigger = "sign_in" | "background" | "online" | "change" | "manual";

export interface SyncRunResult {
  ok: boolean;
  offline?: boolean;
  skipped?: boolean;
  domains?: string[];
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function markDirty(): void {
  try {
    sessionStorage.setItem(DIRTY_KEY, "1");
  } catch {
    /* ignore */
  }
}

function clearDirty(): void {
  try {
    sessionStorage.removeItem(DIRTY_KEY);
  } catch {
    /* ignore */
  }
}

function isDirty(): boolean {
  try {
    return sessionStorage.getItem(DIRTY_KEY) === "1";
  } catch {
    return false;
  }
}

export function scheduleCloudSync(trigger: SyncTrigger = "change", delayMs = 1500): void {
  if (!isOnline()) {
    markDirty();
    return;
  }
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void runCloudSync(trigger);
  }, delayMs);
}

function snapshotJson(
  rows: SyncSnapshotRow[],
  canonical: CanonicalPersonalSyncKey,
  legacy: LegacySyncSnapshotKey,
): unknown | undefined {
  return (
    snapshotByKey(rows, canonical)?.snapshot_json ?? snapshotByKey(rows, legacy)?.snapshot_json
  );
}

function mergeSnapshots(localRows: SyncSnapshotRow[], remoteRows: SyncSnapshotRow[]): SyncSnapshotRow[] {
  const normalizedRemote = normalizeSyncSnapshots(remoteRows);
  const localFav = snapshotJson(localRows, "personal_favorites", "hall_favorites") as HallFavoritesSnapshot;
  const remoteFav = snapshotJson(normalizedRemote, "personal_favorites", "hall_favorites") as
    | HallFavoritesSnapshot
    | undefined;
  const localHist = snapshotJson(localRows, "personal_meal_history", "hall_history") as HallHistorySnapshot;
  const remoteHist = snapshotJson(normalizedRemote, "personal_meal_history", "hall_history") as
    | HallHistorySnapshot
    | undefined;
  const localWheel = snapshotByKey(localRows, "wheel_streak")?.snapshot_json as WheelStreakSnapshot;
  const remoteWheel = snapshotByKey(normalizedRemote, "wheel_streak")?.snapshot_json as
    | WheelStreakSnapshot
    | undefined;
  const localProfile = snapshotJson(localRows, "cooking_preferences", "hall_profile") as HallProfile;
  const remoteProfile = snapshotJson(normalizedRemote, "cooking_preferences", "hall_profile") as
    | HallProfile
    | undefined;

  const merged: SyncSnapshotRow[] = [];

  if (localFav) {
    const favorites = remoteFav ? mergeHallFavorites(localFav, remoteFav) : localFav;
    merged.push({
      data_key: "personal_favorites",
      snapshot_json: favorites,
      updated_at: favorites.updatedAt,
    });
  }

  if (localHist) {
    const history = remoteHist ? mergeHallHistory(localHist, remoteHist) : localHist;
    merged.push({
      data_key: "personal_meal_history",
      snapshot_json: history,
      updated_at: history.updatedAt,
    });
  }

  if (localWheel) {
    const wheel = remoteWheel ? mergeWheelStreak(localWheel, remoteWheel) : localWheel;
    merged.push({
      data_key: "wheel_streak",
      snapshot_json: wheel,
      updated_at: wheel.updatedAt,
    });
  }

  if (localProfile) {
    const profile = remoteProfile ? mergeHallProfile(localProfile, remoteProfile) : localProfile;
    merged.push({
      data_key: "cooking_preferences",
      snapshot_json: profile,
      updated_at: profile.updatedAt,
    });
  }

  return merged;
}

function applyMergedToLocal(merged: SyncSnapshotRow[]): void {
  for (const row of merged) {
    if (row.data_key === "personal_favorites" || row.data_key === "hall_favorites") {
      applyHallFavoritesSnapshot(row.snapshot_json as HallFavoritesSnapshot);
    } else if (row.data_key === "personal_meal_history" || row.data_key === "hall_history") {
      applyHallHistorySnapshot(row.snapshot_json as HallHistorySnapshot);
    } else if (row.data_key === "wheel_streak") {
      applyWheelStreakSnapshot(row.snapshot_json as WheelStreakSnapshot);
    } else if (row.data_key === "cooking_preferences" || row.data_key === "hall_profile") {
      applyHallProfileSnapshot(row.snapshot_json as HallProfile);
    }
  }
}

async function pullRemoteSnapshots(): Promise<SyncSnapshotRow[]> {
  const res = await fetch("/api/auth/sync", { credentials: "include" });
  if (!res.ok) throw new Error(`sync pull ${res.status}`);
  const data = (await res.json()) as SyncPullResponse;
  return normalizeSyncSnapshots(data.snapshots ?? []);
}

async function pushSnapshots(snapshots: SyncSnapshotRow[]): Promise<void> {
  await apiRequest("PUT", "/api/auth/sync", {
    snapshots: expandSyncSnapshotsForPush(snapshots),
  });
}

async function syncSavedRecipes(): Promise<void> {
  const local = getLocalSavedMeals();
  const res = await fetch("/api/auth/saves", { credentials: "include" });
  let remote = local;
  if (res.ok) {
    const data = (await res.json()) as {
      recipes: Array<{ recipe_key: string; recipe_json: unknown; saved_at: string }>;
    };
    remote = fromSavedMealRows(data.recipes ?? []);
  }
  const merged = mergeSavedMeals(local, remote);
  applySavedMeals(merged as ReturnType<typeof getLocalSavedMeals>);
  await apiRequest("PUT", "/api/auth/saves", {
    recipes: toSavedMealRows(merged as ReturnType<typeof getLocalSavedMeals>),
    replace: true,
  });
}

export async function runCloudSync(trigger: SyncTrigger = "background"): Promise<SyncRunResult> {
  if (syncing) return { ok: true, skipped: true };
  if (!isOnline()) {
    markDirty();
    return { ok: false, offline: true };
  }

  syncing = true;
  const started = Date.now();
  const domains: string[] = [];

  try {
    const localRows = collectLocalSnapshots();
    const remoteRows = await pullRemoteSnapshots();
    const merged = mergeSnapshots(localRows, remoteRows);

    applyMergedToLocal(merged);
    await pushSnapshots(merged);
    domains.push(
      "personal_favorites",
      "personal_meal_history",
      "wheel_streak",
      "cooking_preferences",
    );

    await syncSavedRecipes();
    domains.push("saved_recipes");

    clearDirty();
    trackSyncCompleted({
      trigger,
      duration_ms: Date.now() - started,
      domains: domains.join(","),
    });
    return { ok: true, domains };
  } catch (err) {
    markDirty();
    trackSyncFailed({
      trigger,
      reason: err instanceof Error ? err.message.slice(0, 120) : "unknown",
    });
    return { ok: false };
  } finally {
    syncing = false;
    try {
      sessionStorage.removeItem(SYNC_LOCK_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function hasPendingSync(): boolean {
  return isDirty();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (isDirty()) scheduleCloudSync("online", 500);
  });
  window.addEventListener("beforeunload", () => {
    if (isDirty() && isOnline()) {
      void runCloudSync("background");
    }
  });
}
