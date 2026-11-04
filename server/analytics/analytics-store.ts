/**
 * Internal product analytics — SQLite event store and dashboard aggregates.
 */

import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { isPgConfigured } from "../db/pg-client.js";
import { pgRun } from "../db/pg-sql.js";
import { logError } from "../logger.js";
import type {
  AnalyticsEventInput,
  AnalyticsPeriod,
  AnalyticsRankedRow,
  MagicLinkFunnelStats,
} from "../../shared/analytics/events.js";
import type { HallOfFamePayload } from "../../shared/hall-of-fame/types.js";

let db: SqliteDatabase;

export async function initAnalyticsStore(): Promise<void> {
  db = await getSharedLocalDb();
}

/** Test hook — bind a specific SQLite database (validation scripts only). */
export function bindAnalyticsDb(database: SqliteDatabase): void {
  db = database;
}

export function getAnalyticsSqliteDb(): SqliteDatabase {
  return db;
}

/**
 * Durable Postgres copy of analytics events. Production only by default so
 * local `npm run dev` traffic never lands in the shared database;
 * ANALYTICS_PG_MIRROR=1 forces it on (tests), =0 forces it off.
 */
export function analyticsPgEnabled(): boolean {
  const flag = process.env.ANALYTICS_PG_MIRROR?.trim();
  if (flag === "0") return false;
  if (!isPgConfigured()) return false;
  return flag === "1" || process.env.NODE_ENV === "production";
}

/** High-volume plumbing events with no dashboard value. */
const PG_MIRROR_SKIP = new Set<string>(["sync_completed"]);
const PG_MISSING_TABLE_BACKOFF_MS = 10 * 60 * 1000;
let pgMirrorPausedUntil = 0;

async function mirrorEventsToPg(events: AnalyticsEventInput[], sessionId?: string): Promise<void> {
  if (!analyticsPgEnabled() || Date.now() < pgMirrorPausedUntil) return;
  const rows = events.filter((e) => !PG_MIRROR_SKIP.has(e.event_type));
  if (!rows.length) return;
  const params: unknown[] = [];
  const values = rows.map((row) => {
    params.push(
      row.event_type,
      sessionId ?? null,
      row.visitor_id ?? null,
      normalizeRoute(row.route),
      sanitizeMetadata(row.metadata),
    );
    const n = params.length;
    return `($${n - 4}, $${n - 3}, $${n - 2}, $${n - 1}, $${n}::jsonb)`;
  });
  try {
    await pgRun(
      `INSERT INTO analytics_events (event_type, session_id, visitor_id, route, metadata) VALUES ${values.join(", ")}`,
      params,
    );
  } catch (err) {
    if ((err as { code?: string })?.code === "42P01") {
      pgMirrorPausedUntil = Date.now() + PG_MISSING_TABLE_BACKOFF_MS;
      logError("analytics", "Postgres analytics_events missing — run `npm run db:pg:migrate`", err);
      return;
    }
    logError("analytics", "Postgres analytics mirror failed", err);
  }
}

/** Path only — query strings can carry sign-in tokens or emails. */
function normalizeRoute(route?: string): string | null {
  if (!route) return null;
  return route.split(/[?#]/)[0].slice(0, 500) || "/";
}

function periodWhere(period: AnalyticsPeriod): { clause: string; params: string[] } {
  switch (period) {
    case "today":
      return { clause: "occurred_at >= datetime('now', 'start of day')", params: [] };
    case "7d":
      return { clause: "occurred_at >= datetime('now', '-7 days')", params: [] };
    case "30d":
      return { clause: "occurred_at >= datetime('now', '-30 days')", params: [] };
    case "90d":
      return { clause: "occurred_at >= datetime('now', '-90 days')", params: [] };
    default:
      return { clause: "1=1", params: [] };
  }
}

function sanitizeMetadata(
  metadata?: Record<string, string | number | boolean | null | undefined>,
): string {
  if (!metadata) return "{}";
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      clean[k.slice(0, 64)] = typeof v === "string" ? v.slice(0, 500) : v;
    }
  }
  return JSON.stringify(clean);
}

export function insertAnalyticsEvents(
  events: AnalyticsEventInput[],
  sessionId?: string,
): number {
  if (!events.length) return 0;
  void mirrorEventsToPg(events, sessionId);
  const stmt = db.prepare(`
    INSERT INTO analytics_events (event_type, session_id, visitor_id, route, metadata_json)
    VALUES (?, ?, ?, ?, ?)
  `);
  let inserted = 0;
  const tx = db.transaction(() => {
    for (const row of events) {
      stmt.run(
        row.event_type,
        sessionId ?? null,
        row.visitor_id ?? null,
        normalizeRoute(row.route),
        sanitizeMetadata(row.metadata),
      );
      inserted++;
    }
  });
  tx();
  return inserted;
}

function countEvents(period: AnalyticsPeriod, eventType: string): number {
  const { clause } = periodWhere(period);
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM analytics_events WHERE event_type = ? AND ${clause}`,
    )
    .get(eventType) as { c: number };
  return Number(row?.c ?? 0);
}

function topByMetadataField(
  period: AnalyticsPeriod,
  eventType: string,
  field: string,
  labelField?: string,
  limit = 10,
): AnalyticsRankedRow[] {
  const { clause } = periodWhere(period);
  const rows = db
    .prepare(
      `
      SELECT
        json_extract(metadata_json, '$.' || ?) AS key,
        json_extract(metadata_json, '$.' || ?) AS label,
        COUNT(*) AS count
      FROM analytics_events
      WHERE event_type = ? AND ${clause}
        AND json_extract(metadata_json, '$.' || ?) IS NOT NULL
      GROUP BY key
      ORDER BY count DESC
      LIMIT ?
    `,
    )
    .all(field, labelField ?? field, eventType, field, limit) as Array<{
      key: string;
      label: string | null;
      count: number;
    }>;

  return rows.map((r) => ({
    key: String(r.key),
    label: String(r.label ?? r.key),
    count: Number(r.count),
  }));
}

function topCookedMeals(period: AnalyticsPeriod, limit = 10): AnalyticsRankedRow[] {
  const { clause } = periodWhere(period);
  const rows = db
    .prepare(
      `
      SELECT
        COALESCE(NULLIF(key, ''), label) AS key,
        MAX(label) AS label,
        SUM(cnt) AS count
      FROM (
        SELECT
          COALESCE(
            NULLIF(json_extract(metadata_json, '$.recipe_slug'), ''),
            NULLIF(json_extract(metadata_json, '$.recipe_title'), '')
          ) AS key,
          COALESCE(
            NULLIF(json_extract(metadata_json, '$.recipe_title'), ''),
            NULLIF(json_extract(metadata_json, '$.recipe_slug'), '')
          ) AS label,
          1 AS cnt
        FROM analytics_events
        WHERE event_type IN ('meal_cooked', 'hall_meal_repeated') AND ${clause}
          AND (
            json_extract(metadata_json, '$.recipe_slug') IS NOT NULL
            OR json_extract(metadata_json, '$.recipe_title') IS NOT NULL
          )
        UNION ALL
        SELECT
          COALESCE(
            NULLIF(json_extract(metadata_json, '$.recipe_slug'), ''),
            NULLIF(json_extract(metadata_json, '$.recipe_title'), '')
          ) AS key,
          COALESCE(
            NULLIF(json_extract(metadata_json, '$.recipe_title'), ''),
            NULLIF(json_extract(metadata_json, '$.recipe_slug'), '')
          ) AS label,
          1 AS cnt
        FROM analytics_events
        WHERE event_type = 'wheel_recipe_open'
          AND json_extract(metadata_json, '$.action') = 'cook'
          AND ${clause}
          AND (
            json_extract(metadata_json, '$.recipe_slug') IS NOT NULL
            OR json_extract(metadata_json, '$.recipe_title') IS NOT NULL
          )
      )
      WHERE key IS NOT NULL
      GROUP BY key
      ORDER BY count DESC
      LIMIT ?
    `,
    )
    .all(limit) as Array<{ key: string; label: string; count: number }>;

  return rows.map((r) => ({
    key: String(r.key),
    label: String(r.label ?? r.key),
    count: Number(r.count),
  }));
}

export function getHallOfFame(period: AnalyticsPeriod, limit = 10): HallOfFamePayload {
  return {
    period,
    generated_at: new Date().toISOString(),
    most_cooked: topCookedMeals(period, limit),
    most_voted: topByMetadataField(period, "hall_vote_submitted", "option_name", "option_name", limit),
    most_wheel: topByMetadataField(period, "wheel_spin", "recipe_slug", "recipe_title", limit),
  };
}

/** Seed tagged test events (validation scripts only — never production data). */
export function insertAnalyticsTestEvents(sessionId: string, visitorId: string): number {
  return insertAnalyticsEvents(
    [
      {
        event_type: "page_view",
        route: "/",
        visitor_id: visitorId,
        metadata: { page_name: "homepage", traffic_source: "direct" },
      },
      {
        event_type: "recipe_view",
        route: "/recipes/chicken-parm",
        visitor_id: visitorId,
        metadata: {
          recipe_slug: "chicken-parm",
          recipe_title: "Chicken Parm",
          collection: "golden_100",
          source: "test",
        },
      },
      {
        event_type: "meal_generated",
        route: "/generator",
        visitor_id: visitorId,
        metadata: {
          recipe_title: "Test Hall Meal",
          protein: "chicken",
          crew_size: 8,
          time_available: 45,
          meal_category: "firehall_classics",
        },
      },
      {
        event_type: "meal_cooked",
        route: "/recipes/chicken-parm",
        visitor_id: visitorId,
        metadata: {
          recipe_slug: "chicken-parm",
          recipe_title: "Chicken Parm",
          source: "test",
          crew_size: 8,
        },
      },
      {
        event_type: "hall_vote_submitted",
        route: "/vote/test",
        visitor_id: visitorId,
        metadata: {
          vote_id: "test-vote",
          option_id: 0,
          option_name: "Jerk Chicken & Rice and Peas",
        },
      },
      {
        event_type: "wheel_spin",
        route: "/classics-wheel",
        visitor_id: visitorId,
        metadata: {
          recipe_slug: "jerk-chicken",
          recipe_title: "Jerk Chicken & Peas and Rice",
        },
      },
      {
        event_type: "email_capture",
        route: "/",
        visitor_id: visitorId,
        metadata: { source: "homepage", capture_type: "homepage_subscribe" },
      },
    ].map((e) => ({ ...e, metadata: { ...e.metadata, is_test: true } })) as AnalyticsEventInput[],
    sessionId,
  );
}

export function getMagicLinkFunnelStats(period: AnalyticsPeriod = "30d"): MagicLinkFunnelStats {
  const requested = countEvents(period, "magic_link_requested");
  const sent = countEvents(period, "magic_link_sent");
  const failed = countEvents(period, "magic_link_failed");
  const opened = countEvents(period, "magic_link_opened");
  const completed = countEvents(period, "magic_link_completed");
  const expired = countEvents(period, "magic_link_expired");
  const denominator = Math.max(sent, 1);
  return {
    period,
    requested,
    sent,
    failed,
    opened,
    completed,
    expired,
    completion_rate: Math.round((completed / denominator) * 1000) / 10,
  };
}
