import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { logError } from "../logger.js";
import { insertAnalyticsEvents } from "../analytics/analytics-store.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import { userHasFeature } from "../billing/store.js";
import {
  addManualItem,
  addRecipeIngredients,
  completeShoppingList,
  deleteShoppingListItem,
  getOrCreateActiveShoppingList,
  initHallShoppingListStore,
  startNewShoppingList,
  updateShoppingListItem,
  updateShoppingListMeta,
} from "./store.js";
import { recordShoppingListCompleted } from "../hall-analytics/store.js";
import { initHallAnalyticsStore } from "../hall-analytics/store.js";
import {
  addRecipeIngredientsSchema,
  addShoppingListItemSchema,
  updateShoppingListItemSchema,
  updateShoppingListSchema,
} from "../../shared/hall-shopping-list/schema.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initHallShoppingListStore();
    storeReady = true;
  }
}

function trackListEvent(
  req: AuthedRequest,
  eventType:
    | "shared_shopping_list_created"
    | "shared_shopping_list_updated"
    | "shared_shopping_list_exported"
    | "shared_shopping_list_completed",
  metadata?: Record<string, string | number | boolean>,
): void {
  try {
    insertAnalyticsEvents(
      [{ event_type: eventType, route: req.path, metadata }],
      req._sessionId,
    );
  } catch {
    /* optional */
  }
}

function requireSharedShoppingList(req: AuthedRequest, res: Response, hallId: string): boolean {
  if (!userHasFeature(req._authUserId ?? null, "shared_shopping_lists", { hall_id: hallId })) {
    res.status(402).json({ message: "Hall Pro required", feature: "shared_shopping_lists" });
    return false;
  }
  return true;
}

export function registerHallShoppingListRoutes(app: Express): void {
  app.get(
    "/api/halls/:hallId/shopping-list",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireSharedShoppingList(req, res, hallId)) return;
        const payload = getOrCreateActiveShoppingList(hallId, req._authUserId!);
        if (!payload) {
          return res.status(403).json({ message: "Not a member of this hall" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-shopping-list", "get failed", err);
        return res.status(500).json({ message: "Failed to load shopping list" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/shopping-list/items",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireSharedShoppingList(req, res, hallId)) return;
        const parsed = addShoppingListItemSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }

        const before = getOrCreateActiveShoppingList(hallId, req._authUserId!);
        const payload = addManualItem(hallId, req._authUserId!, parsed.data);
        if (!payload) {
          return res.status(403).json({ message: "Cannot add item" });
        }

        if (!before?.items.length && payload.items.length) {
          trackListEvent(req, "shared_shopping_list_created", {
            hall_id: hallId,
            list_id: payload.list.list_id,
          });
        }
        trackListEvent(req, "shared_shopping_list_updated", {
          hall_id: hallId,
          list_id: payload.list.list_id,
          action: "add_manual",
        });

        return res.status(201).json(payload);
      } catch (err) {
        logError("hall-shopping-list", "add item failed", err);
        return res.status(500).json({ message: "Failed to add item" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/shopping-list/items/from-recipe",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireSharedShoppingList(req, res, hallId)) return;
        const parsed = addRecipeIngredientsSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }

        const before = getOrCreateActiveShoppingList(hallId, req._authUserId!);
        const payload = addRecipeIngredients(hallId, req._authUserId!, parsed.data);
        if (!payload) {
          return res.status(403).json({ message: "Cannot add recipe ingredients" });
        }

        if (!before?.items.length && payload.items.length) {
          trackListEvent(req, "shared_shopping_list_created", {
            hall_id: hallId,
            list_id: payload.list.list_id,
          });
        }
        trackListEvent(req, "shared_shopping_list_updated", {
          hall_id: hallId,
          list_id: payload.list.list_id,
          action: "add_recipe",
          recipe_slug: parsed.data.recipe_slug ?? "",
        });

        return res.status(201).json(payload);
      } catch (err) {
        logError("hall-shopping-list", "add recipe failed", err);
        return res.status(500).json({ message: "Failed to add recipe ingredients" });
      }
    },
  );

  app.patch(
    "/api/halls/:hallId/shopping-list/items/:itemId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireSharedShoppingList(req, res, hallId)) return;
        const itemId = String(req.params.itemId ?? "");
        const parsed = updateShoppingListItemSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }

        const payload = updateShoppingListItem(hallId, req._authUserId!, itemId, parsed.data);
        if (!payload) {
          return res.status(403).json({ message: "Cannot update item" });
        }

        trackListEvent(req, "shared_shopping_list_updated", {
          hall_id: hallId,
          list_id: payload.list.list_id,
          action: parsed.data.purchased !== undefined ? "mark_purchased" : "edit_item",
        });

        return res.json(payload);
      } catch (err) {
        logError("hall-shopping-list", "update item failed", err);
        return res.status(500).json({ message: "Failed to update item" });
      }
    },
  );

  app.delete(
    "/api/halls/:hallId/shopping-list/items/:itemId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireSharedShoppingList(req, res, hallId)) return;
        const itemId = String(req.params.itemId ?? "");
        const payload = deleteShoppingListItem(hallId, req._authUserId!, itemId);
        if (!payload) {
          return res.status(403).json({ message: "Cannot delete item" });
        }

        trackListEvent(req, "shared_shopping_list_updated", {
          hall_id: hallId,
          list_id: payload.list.list_id,
          action: "delete_item",
        });

        return res.json(payload);
      } catch (err) {
        logError("hall-shopping-list", "delete item failed", err);
        return res.status(500).json({ message: "Failed to delete item" });
      }
    },
  );

  app.patch(
    "/api/halls/:hallId/shopping-list",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireSharedShoppingList(req, res, hallId)) return;
        const parsed = updateShoppingListSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }

        const payload = updateShoppingListMeta(hallId, req._authUserId!, parsed.data);
        if (!payload) {
          return res.status(403).json({ message: "Cannot update list" });
        }

        trackListEvent(req, "shared_shopping_list_updated", {
          hall_id: hallId,
          list_id: payload.list.list_id,
          action: "assign_runner",
        });

        return res.json(payload);
      } catch (err) {
        logError("hall-shopping-list", "update list failed", err);
        return res.status(500).json({ message: "Failed to update shopping list" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/shopping-list/complete",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireSharedShoppingList(req, res, hallId)) return;
        const payload = completeShoppingList(hallId, req._authUserId!);
        if (!payload) {
          return res.status(403).json({ message: "Cannot complete list" });
        }

        trackListEvent(req, "shared_shopping_list_completed", {
          hall_id: hallId,
          list_id: payload.list.list_id,
        });

        try {
          await initHallAnalyticsStore();
          recordShoppingListCompleted(
            hallId,
            req._authUserId!,
            payload.list.list_id,
            payload.list.title,
          );
        } catch {
          /* analytics optional */
        }

        return res.json(payload);
      } catch (err) {
        logError("hall-shopping-list", "complete failed", err);
        return res.status(500).json({ message: "Failed to complete shopping list" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/shopping-list/new",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireSharedShoppingList(req, res, hallId)) return;
        const title = typeof req.body?.title === "string" ? req.body.title : undefined;
        const payload = startNewShoppingList(hallId, req._authUserId!, title);
        if (!payload) {
          return res.status(403).json({ message: "Cannot start new list" });
        }

        trackListEvent(req, "shared_shopping_list_created", {
          hall_id: hallId,
          list_id: payload.list.list_id,
        });

        return res.status(201).json(payload);
      } catch (err) {
        logError("hall-shopping-list", "new list failed", err);
        return res.status(500).json({ message: "Failed to start new list" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/shopping-list/export",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireSharedShoppingList(req, res, hallId)) return;
        const format = req.body?.format === "text" ? "text" : "pdf";
        const payload = getOrCreateActiveShoppingList(hallId, req._authUserId!);
        if (!payload) {
          return res.status(403).json({ message: "Not a member of this hall" });
        }

        trackListEvent(req, "shared_shopping_list_exported", {
          hall_id: hallId,
          list_id: payload.list.list_id,
          format,
        });

        return res.json({ ok: true, format, payload });
      } catch (err) {
        logError("hall-shopping-list", "export track failed", err);
        return res.status(500).json({ message: "Failed to export" });
      }
    },
  );
}
