import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { logError } from "../logger.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import { userHasFeature } from "../billing/store.js";
import {
  enrollAllCanteenMembers,
  getCanteenPaymentsPayload,
  initHallCanteenPaymentsStore,
  markCanteenMemberPaid,
  updateCanteenMemberFrequency,
} from "./store.js";
import { updateCanteenDuesMemberSchema } from "../../shared/hall-canteen-payments/schema.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initHallCanteenPaymentsStore();
    storeReady = true;
  }
}

function requireCanteenPaymentTracker(req: AuthedRequest, res: Response, hallId: string): boolean {
  if (!userHasFeature(req._authUserId ?? null, "canteen_payment_tracker", { hall_id: hallId })) {
    res.status(402).json({ message: "Hall Pro required", feature: "canteen_payment_tracker" });
    return false;
  }
  return true;
}

export function registerHallCanteenPaymentsRoutes(app: Express): void {
  app.get(
    "/api/halls/:hallId/canteen-payments",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireCanteenPaymentTracker(req, res, hallId)) return;
        const payload = getCanteenPaymentsPayload(hallId, req._authUserId!);
        if (!payload) {
          return res.status(403).json({ message: "Not a member of this hall" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen-payments", "get failed", err);
        return res.status(500).json({ message: "Failed to load canteen payment tracker" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen-payments/enroll-all",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireCanteenPaymentTracker(req, res, hallId)) return;
        const payload = enrollAllCanteenMembers(hallId, req._authUserId!);
        if (!payload) {
          return res.status(403).json({ message: "Cannot enroll canteen members" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen-payments", "enroll-all failed", err);
        return res.status(500).json({ message: "Failed to enroll members" });
      }
    },
  );

  app.patch(
    "/api/halls/:hallId/canteen-payments/:userId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const targetUserId = String(req.params.userId ?? "");
        if (!requireCanteenPaymentTracker(req, res, hallId)) return;
        const parsed = updateCanteenDuesMemberSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: "Invalid frequency" });
        }
        const payload = updateCanteenMemberFrequency(
          hallId,
          req._authUserId!,
          targetUserId,
          parsed.data.frequency,
        );
        if (!payload) {
          return res.status(403).json({ message: "Cannot update member payment settings" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen-payments", "update failed", err);
        return res.status(500).json({ message: "Failed to update member" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/canteen-payments/:userId/mark-paid",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const targetUserId = String(req.params.userId ?? "");
        if (!requireCanteenPaymentTracker(req, res, hallId)) return;
        const payload = markCanteenMemberPaid(hallId, req._authUserId!, targetUserId);
        if (!payload) {
          return res.status(403).json({ message: "Cannot mark payment" });
        }
        return res.json(payload);
      } catch (err) {
        logError("hall-canteen-payments", "mark-paid failed", err);
        return res.status(500).json({ message: "Failed to mark payment" });
      }
    },
  );
}
