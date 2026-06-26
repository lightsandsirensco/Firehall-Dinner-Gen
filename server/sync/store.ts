import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import type { SyncSnapshotKey, SyncSnapshotRow } from "../../shared/sync/types.js";
import { normalizeSyncSnapshots } from "../../shared/sync/types.js";

let db: SqliteDatabase;

export async function initUserSyncStore(): Promise<void> {
  db = await getSharedLocalDb();
}

export function bindUserSyncDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error("User sync store not initialized — call initUserSyncStore() first");
  }
  return db;
}

export function listUserSnapshots(userId: string): SyncSnapshotRow[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT data_key, snapshot_json, updated_at
       FROM user_data_snapshots
       WHERE user_id = ?
       ORDER BY data_key`,
    )
    .all(userId) as Array<{ data_key: string; snapshot_json: string; updated_at: string }>;

  return normalizeSyncSnapshots(
    rows.map((row) => ({
      data_key: row.data_key as SyncSnapshotKey,
      snapshot_json: JSON.parse(row.snapshot_json),
      updated_at: row.updated_at,
    })),
  );
}

export function upsertUserSnapshots(
  userId: string,
  snapshots: SyncSnapshotRow[],
): { upserted: number; snapshots: SyncSnapshotRow[] } {
  const d = getDb();
  const stmt = d.prepare(
    `INSERT INTO user_data_snapshots (user_id, data_key, snapshot_json, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, data_key) DO UPDATE SET
       snapshot_json = CASE
         WHEN excluded.updated_at >= user_data_snapshots.updated_at THEN excluded.snapshot_json
         ELSE user_data_snapshots.snapshot_json
       END,
       updated_at = CASE
         WHEN excluded.updated_at >= user_data_snapshots.updated_at THEN excluded.updated_at
         ELSE user_data_snapshots.updated_at
       END`,
  );

  let upserted = 0;
  const tx = d.transaction(() => {
    for (const snap of snapshots) {
      stmt.run(userId, snap.data_key, JSON.stringify(snap.snapshot_json), snap.updated_at);
      upserted++;
    }
  });
  tx();

  return { upserted, snapshots: listUserSnapshots(userId) };
}
