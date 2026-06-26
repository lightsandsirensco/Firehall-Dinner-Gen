import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { logError } from "../logger.js";
import { insertAnalyticsEvents } from "../analytics/analytics-store.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import {
  addCustomSupply,
  getOrSeedHallSupplies,
  initHallSuppliesStore,
  updateSupplyStatus,
} from "./store.js";
import {
  addHallSupplySchema,
  updateHallSupplyStatusSchema,
} from "../../shared/hall-supplies/schema.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initHallSuppliesStore();
    storeReady = true;
  }
}

function trackSupplyEvent(
  req: AuthedRequest,
  eventType: "hall_supply_updated" | "hall_supply_restocked" | "hall_supply_viewed",
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

export function registerHallSuppliesRoutes(app: Express): void {
  app.get(
    "/api/halls/:hallId/supplies",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const payload = getOrSeedHallSupplies(hallId, req._authUserId!);
        if (!payload) {
          return res.status(403).json({ message: "Not a member of this hall" });
        }

        trackSupplyEvent(req, "hall_supply_viewed", {
          hall_id: hallId,
          shortage_count: payload.shortages.length,
        });

        return res.json(payload);
      } catch (err) {
        logError("hall-supplies", "get failed", err);
        return res.status(500).json({ message: "Failed to load supplies" });
      }
    },
  );

  app.patch(
    "/api/halls/:hallId/supplies/:supplyId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const supplyId = String(req.params.supplyId ?? "");
        const parsed = updateHallSupplyStatusSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }

        const result = updateSupplyStatus(
          hallId,
          req._authUserId!,
          supplyId,
          parsed.data.status,
        );
        if (!result) {
          return res.status(403).json({ message: "Cannot update supply" });
        }

        const item = result.payload.items.find((i) => i.supply_id === supplyId);
        trackSupplyEvent(req, "hall_supply_updated", {
          hall_id: hallId,
          supply_id: supplyId,
          supply_name: item?.name ?? "",
          status: parsed.data.status,
        });

        if (result.restocked) {
          trackSupplyEvent(req, "hall_supply_restocked", {
            hall_id: hallId,
            supply_id: supplyId,
            supply_name: item?.name ?? "",
          });
        }

        return res.json(result.payload);
      } catch (err) {
        logError("hall-supplies", "update failed", err);
        return res.status(500).json({ message: "Failed to update supply" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/supplies",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = addHallSupplySchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }

        const payload = addCustomSupply(hallId, req._authUserId!, parsed.data);
        if (!payload) {
          return res.status(403).json({ message: "Cannot add supply" });
        }

        trackSupplyEvent(req, "hall_supply_updated", {
          hall_id: hallId,
          action: "add_custom",
          supply_name: parsed.data.name,
        });

        return res.status(201).json(payload);
      } catch (err) {
        logError("hall-supplies", "add failed", err);
        return res.status(500).json({ message: "Failed to add supply" });
      }
    },
  );
}
