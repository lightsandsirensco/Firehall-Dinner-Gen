#!/usr/bin/env tsx
/**
 * Shared station tablets: sign-out clears every account-owned local key (and
 * only those), and an unsaved default crew size never beats the account's
 * synced crew size on a new device.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ACCOUNT_LOCAL_KEYS, clearLocalAccountData } from "../client/src/lib/sync/clear-local-account.js";
import { DEFAULT_PROFILE_UPDATED_AT } from "../client/src/lib/hall-profile-store.js";
import { mergeHallProfile } from "../shared/sync/merge.js";
import { HALL_PROFILE_SCHEMA_VERSION, type HallProfile } from "../shared/hall-profile/types.js";

// Every listed key is a real key some client store writes (guards against renames drifting).
const libDir = path.resolve("client/src/lib");
const sources = fs
  .readdirSync(libDir, { recursive: true, withFileTypes: true })
  .filter((d) => d.isFile() && /\.tsx?$/.test(d.name) && d.name !== "clear-local-account.ts")
  .map((d) => fs.readFileSync(path.join(d.parentPath, d.name), "utf8"))
  .join("\n");
for (const key of ACCOUNT_LOCAL_KEYS) {
  assert.ok(sources.includes(`"${key}"`), `${key} is written by a client store`);
}

const store = new Map<string, string>(
  [...ACCOUNT_LOCAL_KEYS, "firehall_measurement_system", "fh_visitor_id"].map((k) => [k, "x"]),
);
clearLocalAccountData({ removeItem: (k: string) => void store.delete(k) });
assert.deepEqual([...store.keys()].sort(), ["fh_visitor_id", "firehall_measurement_system"], "device settings survive sign-out");

const profile = (crew: number, updatedAt: string): HallProfile => ({
  schemaVersion: HALL_PROFILE_SCHEMA_VERSION,
  hallId: "h1",
  defaultCrewSize: crew,
  updatedAt,
});
const merged = mergeHallProfile(profile(8, DEFAULT_PROFILE_UPDATED_AT), profile(12, "2026-01-01T00:00:00.000Z"));
assert.equal(merged.defaultCrewSize, 12, "new-device default never overwrites the account crew size");

console.log("[test-signout-local-data] OK");
