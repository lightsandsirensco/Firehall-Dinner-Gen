/**
 * Product analytics API routes.
 */

import crypto from "node:crypto";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { getAuthCookieName, getUserIdFromSessionToken } from "../auth/auth-store.js";
import { getClientIp } from "../client-ip.js";
import { getKlaviyoQueueSummary } from "../marketing-consent/klaviyo-queue.js";
import {
  ANALYTICS_EVENT_TYPES,
  SERVER_ONLY_ANALYTICS_EVENTS,
  type AnalyticsEventInput,
  type AnalyticsPeriod,
} from "../../shared/analytics/events.js";
import { getHallOfFame, initAnalyticsStore, insertAnalyticsEvents } from "./analytics-store.js";
import { getAnalyticsDashboard } from "./dashboard.js";
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

function headerValue(req: Request, name: string): string {
  const v = req.headers[name];
  return (Array.isArray(v) ? v[0] : v ?? "").trim();
}

/**
 * Ingest is reachable without the X-CSRF-Token header because
 * navigator.sendBeacon (the only delivery that survives a mobile tab being
 * hidden or closed) cannot set headers. Instead a request must prove it came
 * from one of our own pages: a valid double-submit token, or the browser's
 * own Sec-Fetch-Site / Origin headers (scripts on other sites cannot forge
 * them). Requests carrying neither are refused.
 */
export function isSameOriginAnalyticsRequest(req: Request): boolean {
  const csrfCookie = req.cookies?.csrf_token;
  if (csrfCookie && headerValue(req, "x-csrf-token") === csrfCookie) return true;
  const fetchSite = headerValue(req, "sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";
  const origin = headerValue(req, "origin");
  if (!origin) return false;
  const host = (headerValue(req, "x-forwarded-host").split(",")[0]?.trim() || headerValue(req, "host")).toLowerCase();
  try {
    return new URL(origin).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

const RATE_WINDOW_MS = 60_000;
/** Per browser: an active tab sends a batch every few seconds at most. */
export const RATE_MAX_PER_VISITOR = 60;
/**
 * Per IP: a fire hall, office or mobile-carrier NAT puts many people behind
 * one address, so the IP ceiling only stops floods (e.g. a script rotating
 * visitor cookies), not ordinary shared networks.
 */
export const RATE_MAX_PER_IP = 600;
const rateBuckets = new Map<string, { start: number; count: number }>();

function overLimit(key: string, max: number, now: number): boolean {
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    rateBuckets.set(key, { start: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > max;
}

export function analyticsRateLimited(ip: string, visitorCookie: unknown, now = Date.now()): boolean {
  if (rateBuckets.size > 50_000) rateBuckets.clear();
  const ipBlocked = overLimit(`ip:${ip}`, RATE_MAX_PER_IP, now);
  // A first visit has no cookie yet; only the IP ceiling applies until it is set.
  if (typeof visitorCookie !== "string" || !UUID_RE.test(visitorCookie)) return ipBlocked;
  const visitorBlocked = overLimit(`vid:${visitorCookie.toLowerCase()}`, RATE_MAX_PER_VISITOR, now);
  return ipBlocked || visitorBlocked;
}

function guardAnalyticsIngest(req: Request, res: Response, next: NextFunction): void {
  if (!isSameOriginAnalyticsRequest(req)) {
    res.status(403).json({ message: "Cross-site analytics requests are not accepted" });
    return;
  }
  if (analyticsRateLimited(getClientIp(req), req.cookies?.[VISITOR_COOKIE])) {
    res.status(429).json({ message: "Too many analytics requests" });
    return;
  }
  next();
}

/**
 * First-party, server-set, httpOnly visitor cookie. Safari ITP caps
 * script-written storage (localStorage, document.cookie) at 7 days, which made
 * every weekly visitor look new. Server-set cookies avoid that cap only while
 * this endpoint is served from the same host/IP range as the pages (Safari
 * 16.4+ also caps cookies from a differing server IP to 7 days). 400 days is
 * Chrome's maximum; private browsing, cookie clearing and other tracking
 * protection end it sooner, so returning-visitor counts are a lower bound.
 * The cookie is not refreshed, so it expires 400 days after first being set.
 */
export const VISITOR_COOKIE = "fh_vid";
const VISITOR_COOKIE_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveVisitorId(req: Request, res: Response, clientVisitorId: string | undefined): string {
  const fromCookie = req.cookies?.[VISITOR_COOKIE];
  if (typeof fromCookie === "string" && UUID_RE.test(fromCookie)) return fromCookie.toLowerCase();
  const id = clientVisitorId && UUID_RE.test(clientVisitorId) ? clientVisitorId.toLowerCase() : crypto.randomUUID();
  res.cookie(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: VISITOR_COOKIE_MAX_AGE_MS,
    path: "/",
  });
  return id;
}

async function resolveSignedInUserId(req: Request): Promise<string | null> {
  try {
    return (await getUserIdFromSessionToken(req.cookies?.[getAuthCookieName()])) ?? null;
  } catch {
    return null;
  }
}

/** Beacons are sent as text/plain (a CORS-safelisted type every browser allows). */
function parseIngestBody(body: unknown): unknown {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

export function registerAnalyticsRoutes(app: Express): void {
  app.post(
    "/api/analytics/events",
    express.text({ type: "text/plain", limit: "32kb" }),
    guardAnalyticsIngest,
    async (req: Request, res: Response) => {
    try {
      const parsed = batchSchema.safeParse(parseIngestBody(req.body));
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid analytics payload" });
      }
      if (BOT_UA.test(String(req.headers["user-agent"] ?? ""))) {
        return res.json({ ok: true, inserted: 0 });
      }
      const filtered = filterPublicEvents(parsed.data.events);
      if (!filtered.length) return res.json({ ok: true, inserted: 0 });
      await ensureStore();
      const visitorId = resolveVisitorId(req, res, filtered[0].visitor_id);
      const events = filtered.map((e) => ({ ...e, visitor_id: visitorId }));
      const sessionId = (req as Request & { _sessionId?: string })._sessionId;
      const inserted = insertAnalyticsEvents(events, sessionId, await resolveSignedInUserId(req));
      return res.json({ ok: true, inserted });
    } catch (err) {
      logError("analytics", "event ingest failed", err);
      return res.status(500).json({ message: "Analytics ingest failed" });
    }
    },
  );

  app.get("/api/admin/marketing/klaviyo-queue", async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const summary = await getKlaviyoQueueSummary();
    if (!summary) return res.status(503).json({ message: "Klaviyo retry queue unavailable (Postgres or migration 0020 missing)" });
    return res.json(summary);
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
