import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { logError } from "../logger.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import {
  createLogbookEntry,
  getHallLogbookPayload,
  initHallLogbookStore,
  markLogbookRead,
} from "./store.js";
import { createLogbookEntrySchema } from "../../shared/hall-logbook/schema.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initHallLogbookStore();
    storeReady = true;
  }
}

export function registerHallLogbookRoutes(app: Express): void {
  app.get(
    "/api/halls/:hallId/logbook",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const payload = getHallLogbookPayload(hallId, req._authUserId!);
        if (!payload) {
          return res.status(403).json({ message: "Not a member of this hall" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-logbook", "get failed", err);
        return res.status(500).json({ message: "Failed to load logbook" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/logbook/read",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const payload = markLogbookRead(hallId, req._authUserId!);
        if (!payload) {
          return res.status(403).json({ message: "Not a member of this hall" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-logbook", "mark read failed", err);
        return res.status(500).json({ message: "Failed to mark read" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/logbook",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = createLogbookEntrySchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const payload = createLogbookEntry(hallId, req._authUserId!, parsed.data);
        if (!payload) {
          return res.status(403).json({ message: "Cannot write logbook" });
        }
        return res.status(201).json(payload);
      } catch (err) {
        logError("hall-logbook", "create failed", err);
        return res.status(500).json({ message: "Failed to create entry" });
      }
    },
  );
}
