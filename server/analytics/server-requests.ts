/**
 * Server-side request counts (what hosting dashboards such as Replit
 * Analytics report), kept separate from client page views. Counts are held in
 * memory per instance and added to Postgres analytics_server_requests every
 * minute, so totals survive restarts and sum across Autoscale instances.
 * At most one flush interval of counts is lost if an instance is killed.
 */
import type { NextFunction, Request, Response } from "express";
import { pgAll, pgRun } from "../db/pg-sql.js";
import { logError } from "../logger.js";
import { analyticsPgEnabled } from "./analytics-store.js";

export type ServerRequestKind = "page_human" | "page_bot" | "api" | "asset" | "health" | "other";

export const SERVER_BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|curl|wget|python|axios|node-fetch|go-http|java\/|okhttp|monitor|uptime|scan/i;
const HEALTH_PATHS = new Set(["/health", "/healthz", "/api/health", "/api/healthz"]);
const ASSET_RE = /\.[a-z0-9]{1,8}$/i;

export function classifyServerRequest(req: Pick<Request, "method" | "path" | "headers">): ServerRequestKind {
  const path = req.path || "/";
  if (HEALTH_PATHS.has(path) || path.startsWith("/api/health")) return "health";
  if (path.startsWith("/api/")) return "api";
  if (path.startsWith("/assets/") || ASSET_RE.test(path)) return "asset";
  if (req.method !== "GET" && req.method !== "HEAD") return "other";
  const ua = String(req.headers["user-agent"] ?? "");
  return !ua || SERVER_BOT_UA.test(ua) ? "page_bot" : "page_human";
}

const pending = new Map<string, number>();
const FLUSH_MS = 60_000;
let pausedUntil = 0;

function bump(kind: ServerRequestKind, at = Date.now()): void {
  const key = `${new Date(at).toISOString().slice(0, 10)}|${kind}`;
  pending.set(key, (pending.get(key) ?? 0) + 1);
}

export function serverRequestCounter(req: Request, res: Response, next: NextFunction): void {
  res.on("finish", () => bump(classifyServerRequest(req)));
  next();
}

export async function flushServerRequestCounts(): Promise<void> {
  if (!pending.size || !analyticsPgEnabled() || Date.now() < pausedUntil) return;
  const entries = [...pending.entries()];
  pending.clear();
  const params: unknown[] = [];
  const values = entries.map(([key, count]) => {
    const [day, kind] = key.split("|");
    params.push(day, kind, count);
    const n = params.length;
    return `($${n - 2}::date, $${n - 1}, $${n})`;
  });
  try {
    await pgRun(
      `INSERT INTO analytics_server_requests (day, kind, count) VALUES ${values.join(", ")}
       ON CONFLICT (day, kind) DO UPDATE SET count = analytics_server_requests.count + EXCLUDED.count`,
      params,
    );
  } catch (err) {
    if ((err as { code?: string })?.code === "42P01") {
      pausedUntil = Date.now() + 10 * 60 * 1000;
      logError("analytics", "analytics_server_requests missing (migration 0020) — server request counts not stored", err);
      return;
    }
    for (const [key, count] of entries) pending.set(key, (pending.get(key) ?? 0) + count);
    logError("analytics", "server request count flush failed", err);
  }
}

let timer: NodeJS.Timeout | null = null;

export function startServerRequestFlush(): void {
  if (timer) return;
  timer = setInterval(() => void flushServerRequestCounts(), FLUSH_MS);
  timer.unref();
}

export interface ServerRequestTotals {
  total: number;
  page_human: number;
  page_bot: number;
  api: number;
  asset: number;
  health: number;
  other: number;
  counting_since: string | null;
}

/** Totals since startMs (UTC day granularity); null when the table is unavailable. */
export async function loadServerRequestTotals(startMs: number | null): Promise<ServerRequestTotals | null> {
  if (!analyticsPgEnabled()) return null;
  try {
    const startDay = startMs != null ? new Date(startMs).toISOString().slice(0, 10) : "1970-01-01";
    const rows = await pgAll<{ kind: ServerRequestKind; n: string | number }>(
      `SELECT kind, SUM(count) AS n FROM analytics_server_requests WHERE day >= $1::date GROUP BY kind`,
      [startDay],
    );
    const since = await pgAll<{ d: string | null }>(`SELECT MIN(day)::text AS d FROM analytics_server_requests`);
    const totals: ServerRequestTotals = {
      total: 0, page_human: 0, page_bot: 0, api: 0, asset: 0, health: 0, other: 0,
      counting_since: since[0]?.d ?? null,
    };
    for (const r of rows) {
      const n = Number(r.n) || 0;
      totals[r.kind] = n;
      totals.total += n;
    }
    return totals;
  } catch {
    return null;
  }
}
