#!/usr/bin/env tsx
/**
 * Validates cloud sync — user_data_snapshots key handling, legacy-key
 * normalization, saved-recipe sync, merge helpers — against the real
 * Postgres migrations (PGlite). The SQLite 044 table-rebuild this suite used
 * to exercise is not part of the Postgres schema (0001 ships the widened CHECK).
 */
import "./lib/pglite-test-db.js";
import assert from "node:assert/strict";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";
import { listSavedRecipes, syncSavedRecipes, upsertEmailUser } from "../server/auth/auth-store.js";
import { listUserSnapshots, upsertUserSnapshots } from "../server/sync/store.js";
import { mergeHallHistory, mergeSavedMeals } from "../shared/sync/merge.js";
import { SYNC_SNAPSHOT_KEYS } from "../shared/sync/types.js";
import type { HallHistorySnapshot } from "../shared/hall-profile/types.js";

async function main(): Promise<void> {
  const user = (await upsertEmailUser("sync@firehall.test")).user;

  // Legacy keys written by older clients are read back under their canonical names.
  await upsertUserSnapshots(user.user_id, [
    {
      data_key: "hall_profile",
      snapshot_json: { schemaVersion: 1, crewSize: 6, updatedAt: "2025-12-01T00:00:00.000Z" },
      updated_at: "2025-12-01T00:00:00.000Z",
    },
  ]);
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
  await upsertUserSnapshots(user.user_id, [older]);
  await upsertUserSnapshots(user.user_id, [newer]);

  const stored = await listUserSnapshots(user.user_id);
  const profile = stored.find((r) => r.data_key === "cooking_preferences");
  assert.equal((profile?.snapshot_json as { crewSize: number }).crewSize, 6, "hall_profile reads back as cooking_preferences");
  const history = stored.find((r) => r.data_key === "personal_meal_history");
  assert.equal((history?.snapshot_json as { entries: Array<{ id: string }> }).entries[0].id, "e2", "newest write wins");

  const merged = mergeHallHistory(older.snapshot_json as HallHistorySnapshot, newer.snapshot_json as HallHistorySnapshot);
  assert.equal(merged.entries.length, 2);

  // Every key any client emits must be writable and readable.
  for (const key of SYNC_SNAPSHOT_KEYS) {
    await upsertUserSnapshots(user.user_id, [
      { data_key: key, snapshot_json: { marker: key, updatedAt: "2026-04-01T00:00:00.000Z" }, updated_at: "2026-04-01T00:00:00.000Z" },
    ]);
  }
  const allKeyRows = await listUserSnapshots(user.user_id);
  for (const key of SYNC_SNAPSHOT_KEYS) {
    if (key === "wheel_streak" || key.startsWith("personal_") || key === "cooking_preferences") {
      assert.ok(allKeyRows.find((r) => r.data_key === key), `expected snapshot for key ${key}`);
    }
  }

  // Unknown keys are rejected by the database CHECK constraint.
  await assert.rejects(
    () =>
      upsertUserSnapshots(user.user_id, [
        {
          data_key: "not_a_real_key" as unknown as (typeof SYNC_SNAPSHOT_KEYS)[number],
          snapshot_json: { x: 1 },
          updated_at: "2026-04-03T00:00:00.000Z",
        },
      ]),
    /check constraint/i,
  );

  // Saved recipes: replace mode keeps only the latest set.
  await syncSavedRecipes(user.user_id, [{ recipe_key: "a", recipe_json: { title: "A" }, saved_at: "2026-01-01T00:00:00.000Z" }], { replace: true });
  await syncSavedRecipes(user.user_id, [{ recipe_key: "b", recipe_json: { title: "B" }, saved_at: "2026-02-01T00:00:00.000Z" }], { replace: true });
  assert.deepEqual((await listSavedRecipes(user.user_id)).map((r) => r.recipe_key), ["b"]);

  const meals = mergeSavedMeals(
    [{ id: "a", savedAt: "2026-01-01T00:00:00.000Z", recipe: { title: "A" } }],
    [{ id: "b", savedAt: "2026-02-01T00:00:00.000Z", recipe: { title: "B" } }],
  );
  assert.equal(meals.length, 2);

  releaseSqliteTimersForTests();
  console.log("[test-cloud-sync] OK");
}

main().catch((err) => {
  console.error("[test-cloud-sync] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
