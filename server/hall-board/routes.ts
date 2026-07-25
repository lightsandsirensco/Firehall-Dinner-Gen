import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { logError } from "../logger.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import {
  createBoardNote,
  fixBoardNote,
  getHallBoardPayload,
  initHallBoardStore,
  setBoardNotePinned,
  updateBoardTonight,
} from "./store.js";
import { createBoardNoteSchema, updateBoardTonightSchema } from "../../shared/hall-board/schema.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initHallBoardStore();
    storeReady = true;
  }
}

export function registerHallBoardRoutes(app: Express): void {
  app.get(
    "/api/halls/:hallId/board",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const payload = getHallBoardPayload(hallId, req._authUserId!);
        if (!payload) {
          return res.status(403).json({ message: "Not a member of this hall" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-board", "get failed", err);
        return res.status(500).json({ message: "Failed to load board" });
      }
    },
  );

  app.patch(
    "/api/halls/:hallId/board/tonight",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = updateBoardTonightSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const payload = updateBoardTonight(hallId, req._authUserId!, parsed.data);
        if (!payload) {
          return res.status(403).json({ message: "Cannot update tonight" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-board", "tonight update failed", err);
        return res.status(500).json({ message: "Failed to update tonight" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/board/notes",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = createBoardNoteSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const payload = createBoardNote(hallId, req._authUserId!, parsed.data);
        if (!payload) {
          return res.status(403).json({ message: "Cannot post note (pin limit?)" });
        }
        return res.status(201).json(payload);
      } catch (err) {
        logError("hall-board", "create note failed", err);
        return res.status(500).json({ message: "Failed to post note" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/board/notes/:noteId/fix",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const noteId = String(req.params.noteId ?? "");
        const payload = fixBoardNote(hallId, req._authUserId!, noteId);
        if (!payload) {
          return res.status(404).json({ message: "Note not found" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-board", "fix note failed", err);
        return res.status(500).json({ message: "Failed to mark fixed" });
      }
    },
  );

  app.patch(
    "/api/halls/:hallId/board/notes/:noteId/pin",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const noteId = String(req.params.noteId ?? "");
        const pinned = Boolean(req.body?.pinned);
        const payload = setBoardNotePinned(hallId, req._authUserId!, noteId, pinned);
        if (!payload) {
          return res.status(403).json({ message: "Cannot pin note" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-board", "pin failed", err);
        return res.status(500).json({ message: "Failed to pin note" });
      }
    },
  );
}
