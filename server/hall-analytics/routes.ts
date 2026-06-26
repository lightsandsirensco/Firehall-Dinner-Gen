import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { logError } from "../logger.js";
import { insertAnalyticsEvents } from "../analytics/analytics-store.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import { memberHasPermission } from "../hall-membership/store.js";
import { userHasFeature } from "../billing/store.js";
import {
  getHallAnalytics,
  initHallAnalyticsStore,
  syncHallActivity,
} from "./store.js";
import { hallActivitySyncSchema } from "../../shared/hall-analytics/schema.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initHallAnalyticsStore();
    storeReady = true;
  }
}

function requireHallAnalyticsAccess(req: AuthedRequest, res: Response, hallId: string): boolean {
  if (!userHasFeature(req._authUserId ?? null, "hall_analytics", { hall_id: hallId })) {
    res.status(402).json({ message: "Hall Pro required", feature: "hall_analytics" });
    return false;
  }
  return true;
}

function trackViewed(req: AuthedRequest, hallId: string): void {
  try {
    insertAnalyticsEvents(
      [
        {
          event_type: "hall_analytics_viewed",
          route: req.path,
          metadata: { hall_id: hallId },
        },
      ],
      req._sessionId,
    );
  } catch {
    /* optional */
  }
}

export function registerHallAnalyticsRoutes(app: Express): void {
  app.get(
    "/api/halls/:hallId/analytics",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireHallAnalyticsAccess(req, res, hallId)) return;

        if (!memberHasPermission(hallId, req._authUserId!, "view_hall_dashboard")) {
          return res.status(403).json({ message: "Not a member of this hall" });
        }

        const payload = getHallAnalytics(hallId);
        trackViewed(req, hallId);
        return res.json(payload);
      } catch (err) {
        logError("hall-analytics", "get failed", err);
        return res.status(500).json({ message: "Failed to load hall analytics" });
      }
    },
  );

  app.post(
    "/api/halls/:hallId/analytics/sync",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireHallAnalyticsAccess(req, res, hallId)) return;

        if (!memberHasPermission(hallId, req._authUserId!, "view_hall_dashboard")) {
          return res.status(403).json({ message: "Not a member of this hall" });
        }

        const parsed = hallActivitySyncSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.message });
        }

        const upserted = syncHallActivity(
          hallId,
          req._authUserId!,
          parsed.data.entries,
          parsed.data.wheel_spin_days,
        );

        return res.json({ ok: true, upserted, analytics: getHallAnalytics(hallId) });
      } catch (err) {
        logError("hall-analytics", "sync failed", err);
        return res.status(500).json({ message: "Failed to sync hall analytics" });
      }
    },
  );
}
