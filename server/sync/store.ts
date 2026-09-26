/**
 * Cloud sync snapshots — Postgres-backed (see PRODUCTION DATABASE MIGRATION
 * PLAN). No SQLite fallback; initUserSyncStore() fails closed if
 * DATABASE_URL is unset.
 */
import { verifyPgConnection } from "../db/pg-client.js";
import { pgAll, pgTx } from "../db/pg-sql.js";
import type { SyncSnapshotKey, SyncSnapshotRow } from "../../shared/sync/types.js";
import { normalizeSyncSnapshots } from "../../shared/sync/types.js";

export async function initUserSyncStore(): Promise<void> {
  await verifyPgConnection();
}

export async function listUserSnapshots(userId: string): Promise<SyncSnapshotRow[]> {
  const rows = await pgAll<{ data_key: string; snapshot_json: string; updated_at: Date }>(
    `SELECT data_key, snapshot_json, updated_at
     FROM user_data_snapshots
     WHERE user_id = $1
     ORDER BY data_key`,
    [userId],
  );

  return normalizeSyncSnapshots(
    rows.map((row) => ({
      data_key: row.data_key as SyncSnapshotKey,
      snapshot_json: JSON.parse(row.snapshot_json),
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    })),
  );
}

export async function upsertUserSnapshots(
  userId: string,
  snapshots: SyncSnapshotRow[],
): Promise<{ upserted: number; snapshots: SyncSnapshotRow[] }> {
  let upserted = 0;
  await pgTx(async (tx) => {
    for (const snap of snapshots) {
      await tx.run(
        `INSERT INTO user_data_snapshots (user_id, data_key, snapshot_json, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, data_key) DO UPDATE SET
           snapshot_json = CASE
             WHEN excluded.updated_at >= user_data_snapshots.updated_at THEN excluded.snapshot_json
             ELSE user_data_snapshots.snapshot_json
           END,
           updated_at = CASE
             WHEN excluded.updated_at >= user_data_snapshots.updated_at THEN excluded.updated_at
             ELSE user_data_snapshots.updated_at
           END`,
        [userId, snap.data_key, JSON.stringify(snap.snapshot_json), snap.updated_at],
      );
      upserted++;
    }
  });

  return { upserted, snapshots: await listUserSnapshots(userId) };
}

/**
 * @deprecated Cloud sync is Postgres-only now. No-op compatibility stub kept
 * only so existing test scripts that call bindUserSyncDb() still compile.
 */
export function bindUserSyncDb(_database: unknown): void {
  console.warn(
    "[sync/store] bindUserSyncDb() is a no-op — cloud sync is Postgres-only now. " +
      "Set DATABASE_URL to a test database to exercise this store.",
  );
}
