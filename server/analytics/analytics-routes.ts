/**
 * Product analytics API routes.
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import {
  ANALYTICS_EVENT_TYPES,
  SERVER_ONLY_ANALYTICS_EVENTS,
  type AnalyticsEventInput,
  type AnalyticsPeriod,
} from "../../shared/analytics/events.js";
import { getHallOfFame, initAnalyticsStore, insertAnalyticsEvents } from "./analytics-store.js";
import { getAnalyticsDashboard } from "./dashboard.js";
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

const PERIODS = new Set<AnalyticsPeriod>(["today", "7d", "30d", "90d", "all"]);

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|curl|wget|python-requests|axios|node-fetch/i;

function parsePeriod(raw: unknown): AnalyticsPeriod {
  const p = String(raw ?? "7d");
  return PERIODS.has(p as AnalyticsPeriod) ? (p as AnalyticsPeriod) : "7d";
}

/**
 * Browser-submitted events only: drops server-only types (spoofable /
 * double-counted), admin page views, and the internal is_test marker.
 */
export function filterPublicEvents(events: AnalyticsEventInput[]): AnalyticsEventInput[] {
  return events
    .filter((e) => !SERVER_ONLY_ANALYTICS_EVENTS.has(e.event_type))
    .filter((e) => !(e.route ?? "").startsWith("/admin"))
    .map((e) => {
      if (!e.metadata || !("is_test" in e.metadata)) return e;
      const { is_test: _drop, ...metadata } = e.metadata;
      return { ...e, metadata };
    });
}

export function registerAnalyticsRoutes(app: Express): void {
  app.post("/api/analytics/events", requireCsrf, async (req: Request, res: Response) => {
    try {
      const parsed = batchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid analytics payload" });
      }
      if (BOT_UA.test(String(req.headers["user-agent"] ?? ""))) {
        return res.json({ ok: true, inserted: 0 });
      }
      const events = filterPublicEvents(parsed.data.events);
      if (!events.length) return res.json({ ok: true, inserted: 0 });
      await ensureStore();
      const sessionId = (req as Request & { _sessionId?: string })._sessionId;
      const inserted = insertAnalyticsEvents(events, sessionId);
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
      res.setHeader("Cache-Control", "no-store");
      return res.json(await getAnalyticsDashboard(period));
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
}
