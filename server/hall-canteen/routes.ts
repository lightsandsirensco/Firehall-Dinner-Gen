import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { logError } from "../logger.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import {
  addDefaultCanteenItem,
  assignCanteenManager,
  claimCanteenPickup,
  getOrSeedHallCanteen,
  initHallCanteenStore,
  manageCanteenItem,
  releaseCanteenPickup,
  reportCanteenItem,
  setCanteenItemStatus,
} from "./store.js";
import {
  addCanteenItemSchema,
  reportCanteenItemSchema,
  setCanteenItemStatusSchema,
} from "../../shared/hall-canteen/schema.js";
import { isProteinStapleName } from "../../shared/hall-canteen/types.js";
import { z } from "zod";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initHallCanteenStore();
    storeReady = true;
  }
}

const assignManagerSchema = z.object({
  user_id: z.string().min(1),
});

export function registerHallCanteenRoutes(app: Express): void {
  app.get(
    "/api/halls/:hallId/canteen",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const payload = getOrSeedHallCanteen(hallId, req._authUserId!);
        if (!payload) {
          return res.status(403).json({ message: "Not a member of this hall" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen", "get failed", err);
        return res.status(500).json({ message: "Failed to load staples list" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/report",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = reportCanteenItemSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        if (parsed.data.name && isProteinStapleName(parsed.data.name)) {
          return res.status(400).json({ message: "Proteins belong on the shopping list, not staples" });
        }

        const result = reportCanteenItem(hallId, req._authUserId!, parsed.data);
        if (!result) {
          return res.status(403).json({ message: "Cannot update staples item" });
        }
        return res.json(result.payload);
      } catch (err) {
        logError("hall-canteen", "report failed", err);
        return res.status(500).json({ message: "Failed to update staples item" });
      }
    },
  );

  app.patch(
    "/api/halls/:hallId/canteen/:itemId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const itemId = String(req.params.itemId ?? "");
        const parsed = setCanteenItemStatusSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }

        if (parsed.data.name && isProteinStapleName(parsed.data.name)) {
          return res.status(400).json({ message: "Proteins belong on the shopping list, not staples" });
        }

        const result = manageCanteenItem(hallId, req._authUserId!, itemId, parsed.data);
        if (!result) {
          return res.status(403).json({ message: "Cannot update staples item" });
        }
        return res.json(result.payload);
      } catch (err) {
        logError("hall-canteen", "update failed", err);
        return res.status(500).json({ message: "Failed to update staples item" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/items",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = addCanteenItemSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        if (isProteinStapleName(parsed.data.name)) {
          return res.status(400).json({ message: "Proteins belong on the shopping list, not staples" });
        }

        const payload = addDefaultCanteenItem(hallId, req._authUserId!, parsed.data);
        if (!payload) {
          return res.status(403).json({ message: "Cannot add staples item" });
        }
        return res.status(201).json(payload);
      } catch (err) {
        logError("hall-canteen", "add item failed", err);
        return res.status(500).json({ message: "Failed to add staples item" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/manager",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = assignManagerSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const payload = assignCanteenManager(hallId, req._authUserId!, parsed.data.user_id);
        if (!payload) {
          return res.status(403).json({ message: "Cannot assign canteen manager" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen", "assign manager failed", err);
        return res.status(500).json({ message: "Failed to assign canteen manager" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/:itemId/pickup",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const itemId = String(req.params.itemId ?? "");
        const result = claimCanteenPickup(hallId, req._authUserId!, itemId);
        if (!result) {
          return res.status(403).json({ message: "Cannot claim staples pickup" });
        }
        return res.json(result.payload);
      } catch (err) {
        logError("hall-canteen", "pickup claim failed", err);
        return res.status(500).json({ message: "Failed to claim staples pickup" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/:itemId/pickup/release",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const itemId = String(req.params.itemId ?? "");
        const result = releaseCanteenPickup(hallId, req._authUserId!, itemId);
        if (!result) {
          return res.status(403).json({ message: "Cannot release staples pickup" });
        }
        return res.json(result.payload);
      } catch (err) {
        logError("hall-canteen", "pickup release failed", err);
        return res.status(500).json({ message: "Failed to release staples pickup" });
      }
    },
  );
}
