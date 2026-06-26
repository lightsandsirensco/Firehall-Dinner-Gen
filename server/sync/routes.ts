import type { Express, Response } from "express";
import { logError } from "../logger.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import { requireCsrf } from "../csrf.js";
import { syncPushSchema } from "../../shared/sync/schema.js";
import { listUserSnapshots, upsertUserSnapshots } from "./store.js";

async function ensureStore(): Promise<void> {
  const { initUserSyncStore } = await import("./store.js");
  await initUserSyncStore();
}

export function registerUserSyncRoutes(app: Express): void {
  app.get("/api/auth/sync", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const snapshots = listUserSnapshots(req._authUserId!);
      return res.json({ snapshots });
    } catch (err) {
      logError("sync", "pull failed", err);
      return res.status(500).json({ message: "Failed to load sync data" });
    }
  });

  app.put("/api/auth/sync", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const parsed = syncPushSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid sync payload" });
      }

      const result = upsertUserSnapshots(
        req._authUserId!,
        parsed.data.snapshots as import("../../shared/sync/types.js").SyncSnapshotRow[],
      );
      return res.json({ ok: true, upserted: result.upserted, snapshots: result.snapshots });
    } catch (err) {
      logError("sync", "push failed", err);
      return res.status(500).json({ message: "Failed to sync data" });
    }
  });
}
