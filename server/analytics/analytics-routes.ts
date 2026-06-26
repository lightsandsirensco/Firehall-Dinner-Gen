/**
 * Product analytics API routes.
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { ANALYTICS_EVENT_TYPES, type AnalyticsPeriod } from "../../shared/analytics/events.js";
import {
  getAnalyticsDashboard,
  getHallOfFame,
  initAnalyticsStore,
  insertAnalyticsEvents,
  insertAnalyticsTestEvents,
} from "./analytics-store.js";
import { requireCsrf } from "../csrf.js";
import { logError } from "../logger.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initAnalyticsStore();
    storeReady = true;
  }
}

const eventSchema = z.object({
  event_type: z.enum(ANALYTICS_EVENT_TYPES),
  route: z.string().max(500).optional(),
  visitor_id: z.string().max(64).optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(25),
});

const PERIODS = new Set<AnalyticsPeriod>(["today", "7d", "30d", "all"]);

function parsePeriod(raw: unknown): AnalyticsPeriod {
  const p = String(raw ?? "7d");
  return PERIODS.has(p as AnalyticsPeriod) ? (p as AnalyticsPeriod) : "7d";
}

export function registerAnalyticsRoutes(app: Express): void {
  app.post("/api/analytics/events", requireCsrf, async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const parsed = batchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid analytics payload" });
      }
      const sessionId = (req as Request & { _sessionId?: string })._sessionId;
      const inserted = insertAnalyticsEvents(parsed.data.events, sessionId);
      return res.json({ ok: true, inserted });
    } catch (err) {
      logError("analytics", "event ingest failed", err);
      return res.status(500).json({ message: "Analytics ingest failed" });
    }
  });

  app.get("/api/admin/analytics/dashboard", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const period = parsePeriod(req.query.period);
      return res.json(getAnalyticsDashboard(period));
    } catch (err) {
      logError("analytics", "dashboard failed", err);
      return res.status(500).json({ message: "Failed to load analytics dashboard" });
    }
  });

  app.get("/api/hall-of-fame", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const period = parsePeriod(req.query.period ?? "30d");
      const limitRaw = Number(req.query.limit ?? 10);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 25) : 10;
      return res.json(getHallOfFame(period, limit));
    } catch (err) {
      logError("analytics", "hall of fame failed", err);
      return res.status(500).json({ message: "Failed to load hall of fame" });
    }
  });

  app.post("/api/admin/analytics/test-events", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const sessionId =
        (req as Request & { _sessionId?: string })._sessionId ?? "test-session";
      const visitorId = String(req.body?.visitor_id ?? "test-visitor");
      const inserted = insertAnalyticsTestEvents(sessionId, visitorId);
      return res.json({ ok: true, inserted });
    } catch (err) {
      logError("analytics", "test events failed", err);
      return res.status(500).json({ message: "Failed to insert test events" });
    }
  });
}
