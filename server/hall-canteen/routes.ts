import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { logError } from "../logger.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import {
  addDefaultCanteenItem,
  addItemToWeeklyOrder,
  assignCanteenManager,
  claimCanteenPickup,
  claimOrderItem,
  completeDelivery,
  createManagerNote,
  deleteManagerNote,
  getCostcoHandoff,
  getOrSeedHallCanteen,
  initHallCanteenStore,
  listManagerNotesForHall,
  manageCanteenItem,
  receiveOrderItem,
  recordOrderCheckout,
  releaseCanteenPickup,
  releaseOrderItem,
  reportCanteenItem,
  reviewSuggestion,
  seedTestHallCanteenData,
  suggestStaple,
  updateManagerNote,
  updateOrderItem,
} from "./store.js";
import {
  addCanteenItemSchema,
  addToWeeklyOrderSchema,
  managerNoteSchema,
  receiveOrderItemSchema,
  recordOrderCheckoutSchema,
  reportCanteenItemSchema,
  reviewSuggestionSchema,
  setCanteenItemStatusSchema,
  suggestCanteenStapleSchema,
  updateOrderItemSchema,
} from "../../shared/hall-canteen/schema.js";
import { isProteinStapleName, type HallCanteenCategory } from "../../shared/hall-canteen/types.js";
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

        const result = reportCanteenItem(hallId, req._authUserId!, {
          ...parsed.data,
          category: parsed.data.category as HallCanteenCategory | undefined,
        });
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

        const result = manageCanteenItem(hallId, req._authUserId!, itemId, {
          ...parsed.data,
          category: parsed.data.category as HallCanteenCategory | undefined,
        });
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

        const payload = addDefaultCanteenItem(hallId, req._authUserId!, {
          ...parsed.data,
          category: parsed.data.category as HallCanteenCategory | undefined,
        });
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

  /* ─── Canteen Manager V2 ───────────────────────────────── */

  app.post(
    "/api/halls/:hallId/canteen/suggest",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = suggestCanteenStapleSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        if (isProteinStapleName(parsed.data.name)) {
          return res.status(400).json({ message: "Proteins belong on the shopping list, not staples" });
        }
        const payload = suggestStaple(hallId, req._authUserId!, {
          ...parsed.data,
          category: parsed.data.category as HallCanteenCategory | undefined,
        });
        if (!payload) {
          return res.status(403).json({ message: "Cannot suggest staple" });
        }
        return res.status(201).json(payload);
      } catch (err) {
        logError("hall-canteen", "suggest failed", err);
        return res.status(500).json({ message: "Failed to suggest staple" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/suggestions/:id/review",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const suggestionId = String(req.params.id ?? "");
        const parsed = reviewSuggestionSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const payload = reviewSuggestion(
          hallId,
          req._authUserId!,
          suggestionId,
          parsed.data.action,
          parsed.data.category as HallCanteenCategory | undefined,
        );
        if (!payload) {
          return res.status(403).json({ message: "Cannot review suggestion" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen", "review suggestion failed", err);
        return res.status(500).json({ message: "Failed to review suggestion" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/order/items",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = addToWeeklyOrderSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const payload = addItemToWeeklyOrder(
          hallId,
          req._authUserId!,
          parsed.data.item_id,
          parsed.data.requested_qty,
          parsed.data.notes,
        );
        if (!payload) {
          return res.status(403).json({ message: "Cannot add item to weekly order" });
        }
        return res.status(201).json(payload);
      } catch (err) {
        logError("hall-canteen", "add to order failed", err);
        return res.status(500).json({ message: "Failed to add item to weekly order" });
      }
    },
  );

  app.patch(
    "/api/halls/:hallId/canteen/order/items/:orderItemId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const orderItemId = String(req.params.orderItemId ?? "");
        const parsed = updateOrderItemSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const payload = updateOrderItem(hallId, req._authUserId!, orderItemId, parsed.data);
        if (!payload) {
          return res.status(403).json({ message: "Cannot update order item" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen", "update order item failed", err);
        return res.status(500).json({ message: "Failed to update order item" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/order/items/:orderItemId/claim",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const orderItemId = String(req.params.orderItemId ?? "");
        const payload = claimOrderItem(hallId, req._authUserId!, orderItemId);
        if (!payload) {
          return res.status(403).json({ message: "Cannot claim order item" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen", "claim order item failed", err);
        return res.status(500).json({ message: "Failed to claim order item" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/order/items/:orderItemId/release",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const orderItemId = String(req.params.orderItemId ?? "");
        const payload = releaseOrderItem(hallId, req._authUserId!, orderItemId);
        if (!payload) {
          return res.status(403).json({ message: "Cannot release order item" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen", "release order item failed", err);
        return res.status(500).json({ message: "Failed to release order item" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/order/checkout",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = recordOrderCheckoutSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const payload = recordOrderCheckout(hallId, req._authUserId!, parsed.data);
        if (!payload) {
          return res.status(403).json({ message: "Cannot record checkout" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen", "checkout failed", err);
        return res.status(500).json({ message: "Failed to record checkout" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/order/items/:orderItemId/receive",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const orderItemId = String(req.params.orderItemId ?? "");
        const parsed = receiveOrderItemSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const payload = receiveOrderItem(hallId, req._authUserId!, orderItemId, parsed.data);
        if (!payload) {
          return res.status(403).json({ message: "Cannot receive order item" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen", "receive order item failed", err);
        return res.status(500).json({ message: "Failed to receive order item" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/order/complete-delivery",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const payload = completeDelivery(hallId, req._authUserId!);
        if (!payload) {
          return res.status(403).json({ message: "Cannot complete delivery" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen", "complete delivery failed", err);
        return res.status(500).json({ message: "Failed to complete delivery" });
      }
    },
  );

  app.get(
    "/api/halls/:hallId/canteen/order/costco-handoff",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const handoff = getCostcoHandoff(hallId, req._authUserId!);
        if (!handoff) {
          return res.status(403).json({ message: "Cannot load Costco handoff" });
        }
        return res.json(handoff);
      } catch (err) {
        logError("hall-canteen", "costco handoff failed", err);
        return res.status(500).json({ message: "Failed to load Costco handoff" });
      }
    },
  );

  app.get(
    "/api/halls/:hallId/canteen/manager-notes",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const notes = listManagerNotesForHall(hallId, req._authUserId!);
        if (!notes) {
          return res.status(403).json({ message: "Cannot load manager notes" });
        }
        return res.json({ notes });
      } catch (err) {
        logError("hall-canteen", "list manager notes failed", err);
        return res.status(500).json({ message: "Failed to load manager notes" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/manager-notes",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = managerNoteSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const payload = createManagerNote(
          hallId,
          req._authUserId!,
          parsed.data.body,
          parsed.data.sort_order,
        );
        if (!payload) {
          return res.status(403).json({ message: "Cannot create manager note" });
        }
        return res.status(201).json(payload);
      } catch (err) {
        logError("hall-canteen", "create manager note failed", err);
        return res.status(500).json({ message: "Failed to create manager note" });
      }
    },
  );

  app.patch(
    "/api/halls/:hallId/canteen/manager-notes/:noteId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const noteId = String(req.params.noteId ?? "");
        const parsed = managerNoteSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }
        const payload = updateManagerNote(
          hallId,
          req._authUserId!,
          noteId,
          parsed.data.body,
          parsed.data.sort_order,
        );
        if (!payload) {
          return res.status(403).json({ message: "Cannot update manager note" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen", "update manager note failed", err);
        return res.status(500).json({ message: "Failed to update manager note" });
      }
    },
  );

  app.delete(
    "/api/halls/:hallId/canteen/manager-notes/:noteId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const noteId = String(req.params.noteId ?? "");
        const payload = deleteManagerNote(hallId, req._authUserId!, noteId);
        if (!payload) {
          return res.status(403).json({ message: "Cannot delete manager note" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen", "delete manager note failed", err);
        return res.status(500).json({ message: "Failed to delete manager note" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen/seed-test-data",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const payload = seedTestHallCanteenData(hallId, req._authUserId!, {
          force: true,
          captainOnly: true,
        });
        if (!payload) {
          return res.status(403).json({ message: "Cannot seed test canteen data" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen", "seed test data failed", err);
        return res.status(500).json({ message: "Failed to seed test canteen data" });
      }
    },
  );
}
