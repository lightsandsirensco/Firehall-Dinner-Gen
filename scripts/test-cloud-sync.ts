#!/usr/bin/env tsx
/**
 * Validates cloud sync store — snapshot upsert, LWW, merge helpers, and the
 * user_data_snapshots CHECK constraint (all canonical + legacy sync keys,
 * migration 044 table-rebuild preserving existing rows).
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
import { SYNC_SNAPSHOT_KEYS } from "../shared/sync/types.js";

const MIGRATION_014 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "014_user_accounts.sql"),
  "utf8",
);
const MIGRATION_017 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "017_user_cloud_sync.sql"),
  "utf8",
);
const MIGRATION_044 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "044_user_data_snapshots_canonical_keys.sql"),
  "utf8",
);

const tmpDb = path.join(os.tmpdir(), `fh-cloud-sync-${Date.now()}.db`);

async function main(): Promise<void> {
  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_014);
  db.exec(MIGRATION_017); // pre-fix schema: CHECK only allows the 4 legacy hall_* keys
  bindAuthDb(db);
  bindUserSyncDb(db);

  const user = upsertEmailUser("sync@firehall.test").user;

  // --- Seed a row under the OLD (pre-044) schema, to prove the migration 044
  // table-rebuild preserves existing data (regression proof #4). ---
  const preMigrationRow = {
    data_key: "hall_profile" as const,
    snapshot_json: { schemaVersion: 1, crewSize: 6, updatedAt: "2025-12-01T00:00:00.000Z" },
    updated_at: "2025-12-01T00:00:00.000Z",
  };
  upsertUserSnapshots(user.user_id, [preMigrationRow]);

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
  const historyRow = stored.find((r) => r.data_key === "personal_meal_history");
  const history = historyRow?.snapshot_json as { entries: Array<{ id: string }> };
  assert.equal(history.entries[0].id, "e2");

  const merged = mergeHallHistory(
    older.snapshot_json as import("../shared/hall-profile/types.js").HallHistorySnapshot,
    newer.snapshot_json as import("../shared/hall-profile/types.js").HallHistorySnapshot,
  );
  assert.equal(merged.entries.length, 2);

  // --- Reproduce the reported bug BEFORE applying the fix migration: pushing
  // the canonical `personal_meal_history` key must fail against the old schema. ---
  assert.throws(
    () =>
      upsertUserSnapshots(user.user_id, [
        {
          data_key: "personal_meal_history",
          snapshot_json: { schemaVersion: 1, entries: [], updatedAt: "2026-03-01T00:00:00.000Z" },
          updated_at: "2026-03-01T00:00:00.000Z",
        },
      ]),
    /CHECK constraint failed/,
    "expected personal_meal_history to be rejected by the pre-fix CHECK constraint",
  );

  // --- Apply the fix: table-rebuild migration widening the CHECK constraint. ---
  db.exec(MIGRATION_044);

  // Regression proof #4: rows written before the migration must survive the rebuild.
  const afterMigration = listUserSnapshots(user.user_id);
  const preservedProfile = afterMigration.find((r) => r.data_key === "cooking_preferences");
  assert.ok(preservedProfile, "pre-migration hall_profile row must survive as cooking_preferences");
  assert.equal((preservedProfile!.snapshot_json as { crewSize: number }).crewSize, 6);
  const preservedHistory = afterMigration.find((r) => r.data_key === "personal_meal_history");
  assert.ok(preservedHistory, "pre-migration hall_history row must survive as personal_meal_history");
  assert.equal((preservedHistory!.snapshot_json as { entries: Array<{ id: string }> }).entries[0].id, "e2");

  // Regression proof #1 + #2: every SYNC_SNAPSHOT_KEYS entry (every key any
  // client emits today, and every key the server is meant to accept) must be
  // writable and readable post-migration.
  for (const key of SYNC_SNAPSHOT_KEYS) {
    const payload = { marker: key, updatedAt: "2026-04-01T00:00:00.000Z" };
    upsertUserSnapshots(user.user_id, [
      { data_key: key, snapshot_json: payload, updated_at: "2026-04-01T00:00:00.000Z" },
    ]);
  }
  const allKeyRows = listUserSnapshots(user.user_id);
  for (const key of SYNC_SNAPSHOT_KEYS) {
    // Legacy keys normalize to their canonical counterpart on read; only
    // assert presence for keys that remain their own canonical identity
    // (wheel_streak has no legacy alias) plus the canonical ones directly.
    if (key === "wheel_streak" || key.startsWith("personal_") || key === "cooking_preferences") {
      const row = allKeyRows.find((r) => r.data_key === key);
      assert.ok(row, `expected snapshot for key ${key} after migration`);
    }
  }

  // Regression proof #5: personal_meal_history specifically, end to end.
  const historyPayload = {
    schemaVersion: 1,
    entries: [{ id: "post-fix-1", type: "meal_cooked", at: "2026-04-02T00:00:00.000Z", title: "Burritos", source: "test" }],
    updatedAt: "2026-04-02T00:00:00.000Z",
  };
  upsertUserSnapshots(user.user_id, [
    { data_key: "personal_meal_history", snapshot_json: historyPayload, updated_at: "2026-04-02T00:00:00.000Z" },
  ]);
  const finalHistory = listUserSnapshots(user.user_id).find((r) => r.data_key === "personal_meal_history");
  assert.ok(finalHistory, "personal_meal_history must be readable after write");
  assert.equal(
    (finalHistory!.snapshot_json as { entries: Array<{ id: string }> }).entries[0].id,
    "post-fix-1",
  );

  // Regression proof #3: unknown/invalid keys must still be rejected post-migration.
  assert.throws(
    () =>
      upsertUserSnapshots(user.user_id, [
        {
          data_key: "not_a_real_key" as unknown as (typeof SYNC_SNAPSHOT_KEYS)[number],
          snapshot_json: { x: 1 },
          updated_at: "2026-04-03T00:00:00.000Z",
        },
      ]),
    /CHECK constraint failed/,
    "expected an unknown data_key to still be rejected after the migration",
  );

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
