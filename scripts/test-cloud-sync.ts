#!/usr/bin/env tsx
/**
 * Validates cloud sync store — snapshot upsert, LWW, merge helpers.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb, upsertEmailUser } from "../server/auth/auth-store.js";
import { bindUserSyncDb, listUserSnapshots, upsertUserSnapshots } from "../server/sync/store.js";
import { syncSavedRecipes } from "../server/auth/auth-store.js";
import {
  mergeHallHistory,
  mergeSavedMeals,
} from "../shared/sync/merge.js";

const MIGRATION_014 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "014_user_accounts.sql"),
  "utf8",
);
const MIGRATION_017 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "017_user_cloud_sync.sql"),
  "utf8",
);

const tmpDb = path.join(os.tmpdir(), `fh-cloud-sync-${Date.now()}.db`);

async function main(): Promise<void> {
  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_014);
  db.exec(MIGRATION_017);
  bindAuthDb(db);
  bindUserSyncDb(db);

  const user = upsertEmailUser("sync@firehall.test").user;

  const older = {
    data_key: "hall_history" as const,
    snapshot_json: {
      schemaVersion: 1,
      hallId: "hall-a",
      entries: [{ id: "e1", type: "meal_cooked", at: "2026-01-01T12:00:00.000Z", title: "Chili", source: "test" }],
      updatedAt: "2026-01-01T12:00:00.000Z",
    },
    updated_at: "2026-01-01T12:00:00.000Z",
  };

  const newer = {
    data_key: "hall_history" as const,
    snapshot_json: {
      schemaVersion: 1,
      hallId: "hall-a",
      entries: [{ id: "e2", type: "wheel_result", at: "2026-02-01T12:00:00.000Z", title: "Tacos", source: "test" }],
      updatedAt: "2026-02-01T12:00:00.000Z",
    },
    updated_at: "2026-02-01T12:00:00.000Z",
  };

  upsertUserSnapshots(user.user_id, [older]);
  upsertUserSnapshots(user.user_id, [newer]);

  const stored = listUserSnapshots(user.user_id);
  assert.equal(stored.length, 1);
  const history = stored[0].snapshot_json as { entries: Array<{ id: string }> };
  assert.equal(history.entries[0].id, "e2");

  const merged = mergeHallHistory(
    older.snapshot_json as import("../shared/hall-profile/types.js").HallHistorySnapshot,
    newer.snapshot_json as import("../shared/hall-profile/types.js").HallHistorySnapshot,
  );
  assert.equal(merged.entries.length, 2);

  syncSavedRecipes(
    user.user_id,
    [{ recipe_key: "a", recipe_json: { title: "A" }, saved_at: "2026-01-01T00:00:00.000Z" }],
    { replace: true },
  );
  syncSavedRecipes(
    user.user_id,
    [{ recipe_key: "b", recipe_json: { title: "B" }, saved_at: "2026-02-01T00:00:00.000Z" }],
    { replace: true },
  );
  const meals = mergeSavedMeals(
    [{ id: "a", savedAt: "2026-01-01T00:00:00.000Z", recipe: { title: "A" } }],
    [{ id: "b", savedAt: "2026-02-01T00:00:00.000Z", recipe: { title: "B" } }],
  );
  assert.equal(meals.length, 2);

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[test-cloud-sync] OK");
}

main().catch((err) => {
  console.error("[test-cloud-sync] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
