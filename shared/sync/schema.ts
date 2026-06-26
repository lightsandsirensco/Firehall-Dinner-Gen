import { z } from "zod";
import { SYNC_SNAPSHOT_KEYS } from "./types.js";

export const syncSnapshotRowSchema = z.object({
  data_key: z.enum(SYNC_SNAPSHOT_KEYS),
  snapshot_json: z.unknown(),
  updated_at: z.string().min(10).max(40),
});

export const syncPushSchema = z.object({
  snapshots: z.array(syncSnapshotRowSchema).max(12),
});
