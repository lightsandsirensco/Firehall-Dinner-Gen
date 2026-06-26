#!/usr/bin/env tsx
import assert from "node:assert/strict";
import {
  expandSyncSnapshotsForPush,
  normalizeSyncSnapshots,
} from "../shared/sync/types.ts";

function main(): void {
  const legacy = {
    data_key: "hall_history" as const,
    snapshot_json: { schemaVersion: 1, hallId: "c1", entries: [], updatedAt: "2026-01-01T00:00:00.000Z" },
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const canonical = {
    data_key: "personal_meal_history" as const,
    snapshot_json: {
      schemaVersion: 1,
      hallId: "c1",
      entries: [{ id: "e1", type: "meal_cooked", at: "2026-02-01T00:00:00.000Z", title: "Chili", source: "t" }],
      updatedAt: "2026-02-01T00:00:00.000Z",
    },
    updated_at: "2026-02-01T00:00:00.000Z",
  };

  const normalized = normalizeSyncSnapshots([legacy, canonical]);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].data_key, "personal_meal_history");
  assert.equal((normalized[0].snapshot_json as { entries: unknown[] }).entries.length, 1);

  const expanded = expandSyncSnapshotsForPush([canonical]);
  assert.ok(expanded.some((r) => r.data_key === "hall_history"));
  assert.ok(expanded.some((r) => r.data_key === "personal_meal_history"));

  console.log("[test-sync-keys] OK");
}

main();
