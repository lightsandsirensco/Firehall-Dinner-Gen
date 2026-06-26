/**
 * Internal product analytics — SQLite event store and dashboard aggregates.
 */

import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { GOLDEN_100_RECIPES } from "../../shared/golden-100/manifest.js";
import type {
  AnalyticsDashboardPayload,
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

function periodWhere(period: AnalyticsPeriod): { clause: string; params: string[] } {
  switch (period) {
    case "today":
      return { clause: "occurred_at >= datetime('now', 'start of day')", params: [] };
    case "7d":
      return { clause: "occurred_at >= datetime('now', '-7 days')", params: [] };
    case "30d":
      return { clause: "occurred_at >= datetime('now', '-30 days')", params: [] };
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
        row.route?.slice(0, 500) ?? null,
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

function countDistinct(period: AnalyticsPeriod, column: "visitor_id" | "session_id", eventType?: string): number {
  const { clause } = periodWhere(period);
  const typeClause = eventType ? " AND event_type = ?" : "";
  const params = eventType ? [eventType] : [];
  const row = db
    .prepare(
      `SELECT COUNT(DISTINCT ${column}) AS c FROM analytics_events WHERE ${column} IS NOT NULL AND ${clause}${typeClause}`,
    )
    .get(...params) as { c: number };
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

function getNeverViewedRecipesSample(limit = 12): AnalyticsRankedRow[] {
  const rows = db
    .prepare(
      `
      SELECT DISTINCT json_extract(metadata_json, '$.recipe_slug') AS slug
      FROM analytics_events
      WHERE event_type = 'recipe_view'
        AND json_extract(metadata_json, '$.recipe_slug') IS NOT NULL
    `,
    )
    .all() as Array<{ slug: string | null }>;

  const viewed = new Set(rows.map((r) => r.slug).filter(Boolean));
  return GOLDEN_100_RECIPES.filter((recipe) => !viewed.has(recipe.slug))
    .slice(0, limit)
    .map((recipe) => ({ key: recipe.slug, label: recipe.title, count: 0 }));
}

function topTrafficSources(period: AnalyticsPeriod, limit = 8): AnalyticsRankedRow[] {
  const { clause } = periodWhere(period);
  const rows = db
    .prepare(
      `
      SELECT
        COALESCE(NULLIF(json_extract(metadata_json, '$.traffic_source'), ''), 'direct') AS key,
        COALESCE(NULLIF(json_extract(metadata_json, '$.traffic_source'), ''), 'Direct') AS label,
        COUNT(*) AS count
      FROM analytics_events
      WHERE event_type = 'page_view' AND ${clause}
      GROUP BY key
      ORDER BY count DESC
      LIMIT ?
    `,
    )
    .all(limit) as Array<{ key: string; label: string; count: number }>;

  return rows.map((r) => ({ key: r.key, label: r.label, count: Number(r.count) }));
}

export function getAnalyticsDashboard(period: AnalyticsPeriod): AnalyticsDashboardPayload {
  const pageViews = countEvents(period, "page_view");
  const sessions = countDistinct(period, "session_id", "page_view");
  const uniqueVisitors = countDistinct(period, "visitor_id", "page_view");
  const visitors = uniqueVisitors;

  const returningRow = db
    .prepare(
      `
      SELECT COUNT(*) AS c FROM (
        SELECT visitor_id FROM analytics_events
        WHERE event_type = 'page_view' AND visitor_id IS NOT NULL AND ${periodWhere(period).clause}
        GROUP BY visitor_id
        HAVING COUNT(DISTINCT session_id) > 1
      )
    `,
    )
    .get() as { c: number };

  const genStarted = countEvents(period, "meal_generation_started");
  const genSuccess = countEvents(period, "meal_generated");
  const genFailed = countEvents(period, "meal_generation_failed");

  return {
    summary: {
      period,
      generated_at: new Date().toISOString(),
      visitors,
      unique_visitors: uniqueVisitors,
      sessions,
      returning_visitors: Number(returningRow?.c ?? 0),
      page_views: pageViews,
      recipe_views: countEvents(period, "recipe_view"),
      meal_generations: genSuccess,
      wheel_spins: countEvents(period, "wheel_spin"),
      email_captures: countEvents(period, "email_capture"),
      avg_pages_per_session: sessions > 0 ? Math.round((pageViews / sessions) * 10) / 10 : 0,
    },
    top_viewed_recipes: topByMetadataField(period, "recipe_view", "recipe_slug", "recipe_title"),
    top_generated_meals: topByMetadataField(period, "meal_generated", "recipe_title", "recipe_title"),
    top_shared_recipes: topByMetadataField(period, "recipe_share", "recipe_slug", "recipe_title"),
    top_saved_recipes: topByMetadataField(period, "recipe_save", "recipe_slug", "recipe_title"),
    top_wheel_landings: topByMetadataField(period, "wheel_spin", "recipe_slug", "recipe_title"),
    top_searches: topByMetadataField(period, "search", "search_term", "search_term"),
    top_explore_filters: topByMetadataField(period, "explore_filter", "filter_key", "filter_label"),
    top_explore_categories: topByMetadataField(period, "explore_filter", "category", "category"),
    top_explore_clicks: topByMetadataField(period, "explore_recipe_click", "recipe_slug", "recipe_title"),
    top_traffic_sources: topTrafficSources(period),
    never_viewed_recipes_sample: getNeverViewedRecipesSample(),
    generation_success_rate:
      genStarted > 0 ? Math.round((genSuccess / genStarted) * 1000) / 10 : genSuccess > 0 ? 100 : 0,
  };
}

/** Seed test events for validation (admin-only). */
export function insertAnalyticsTestEvents(sessionId: string, visitorId: string): number {
  const now = new Date().toISOString();
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
    ],
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
