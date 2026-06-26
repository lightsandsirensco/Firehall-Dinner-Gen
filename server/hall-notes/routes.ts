import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { logError } from "../logger.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import {
  createHallNote,
  deleteHallNote,
  initHallNotesStore,
  listHallNotes,
  updateHallNote,
} from "./store.js";
import { createHallNoteSchema, updateHallNoteSchema } from "../../shared/hall-notes/schema.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initHallNotesStore();
    storeReady = true;
  }
}

export function registerHallNotesRoutes(app: Express): void {
  app.get(
    "/api/halls/:hallId/notes",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const payload = listHallNotes(hallId, req._authUserId!);
        if (!payload) {
          return res.status(403).json({ message: "Not a member of this hall" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-notes", "list failed", err);
        return res.status(500).json({ message: "Failed to load hall notes" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/notes",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = createHallNoteSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const result = createHallNote(hallId, req._authUserId!, parsed.data.message);
        if (!result) {
          return res.status(403).json({ message: "Cannot create note" });
        }
        return res.status(201).json(result.payload);
      } catch (err) {
        logError("hall-notes", "create failed", err);
        return res.status(500).json({ message: "Failed to create note" });
      }
    },
  );

  app.patch(
    "/api/halls/:hallId/notes/:noteId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const noteId = String(req.params.noteId ?? "");
        const parsed = updateHallNoteSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const result = updateHallNote(hallId, req._authUserId!, noteId, parsed.data.message);
        if (!result) {
          return res.status(403).json({ message: "Cannot update note" });
        }
        return res.json(result.payload);
      } catch (err) {
        logError("hall-notes", "update failed", err);
        return res.status(500).json({ message: "Failed to update note" });
      }
    },
  );

  app.delete(
    "/api/halls/:hallId/notes/:noteId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const noteId = String(req.params.noteId ?? "");
        const payload = deleteHallNote(hallId, req._authUserId!, noteId);
        if (!payload) {
          return res.status(403).json({ message: "Cannot delete note" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-notes", "delete failed", err);
        return res.status(500).json({ message: "Failed to delete note" });
      }
    },
  );
}
