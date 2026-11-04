/**
 * Admin analytics dashboard — every number is traced to one source:
 *   Audience + engagement → analytics_events (Postgres when migrated/enabled,
 *     otherwise this instance's SQLite file, labelled as non-durable)
 *   Email + user growth   → Postgres users / user_marketing_consent (+ Klaviyo list count)
 *   Revenue               → Stripe API (read-only), never local plan rows
 * Unavailable metrics are null, never a placeholder zero. All periods are UTC.
 */

import type Stripe from "stripe";
import { GOLDEN_100_RECIPES } from "../../shared/golden-100/manifest.js";
import type {
  AnalyticsAudienceSection,
  AnalyticsDailyPoint,
  AnalyticsDashboardPayload,
  AnalyticsEngagementSection,
  AnalyticsGrowthSection,
  AnalyticsPeriod,
  AnalyticsRankedRow,
  AnalyticsRevenueSection,
  MetricValue,
} from "../../shared/analytics/events.js";
import { isPgConfigured } from "../db/pg-client.js";
import { pgAll, pgOne } from "../db/pg-sql.js";
import { getStripeClient } from "../billing/stripe-client.js";
import { getKlaviyoListMemberCount } from "../klaviyo.js";
import { logError } from "../logger.js";
import { analyticsPgEnabled, getAnalyticsSqliteDb } from "./analytics-store.js";

const DAY_MS = 24 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 30 * 60 * 1000;

const DASHBOARD_EVENT_TYPES = [
  "page_view",
  "recipe_view",
  "recipe_save",
  "meal_generated",
  "meal_generation_started",
  "wheel_spin",
  "shopping_list_open",
  "shared_shopping_list_created",
  "protein_shopping_list_created",
  "hall_vote_submitted",
  "hall_vote_cast",
  "hall_created",
  "search",
  "stripe_checkout_started",
] as const;

const GROCERY_EVENTS = new Set(["shopping_list_open", "shared_shopping_list_created", "protein_shopping_list_created"]);
const VOTE_EVENTS = new Set(["hall_vote_submitted", "hall_vote_cast"]);

/** RFC 2606/6761 reserved domains — internal QA accounts, never real people. */
const TEST_EMAIL_SQL = (col: string) =>
  `(${col} ILIKE '%@example.com' OR ${col} ILIKE '%@example.org' OR ${col} ILIKE '%@example.net' OR ${col} ILIKE '%.test' OR ${col} ILIKE '%.invalid' OR ${col} ILIKE '%@localhost')`;

export interface DashboardEventRow {
  event_type: string;
  visitor_id: string | null;
  session_id: string | null;
  route: string | null;
  metadata: Record<string, unknown>;
  at: number;
}

export function periodStartMs(period: AnalyticsPeriod, now = Date.now()): number | null {
  switch (period) {
    case "today": {
      const d = new Date(now);
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
    case "7d":
      return now - 7 * DAY_MS;
    case "30d":
      return now - 30 * DAY_MS;
    case "90d":
      return now - 90 * DAY_MS;
    default:
      return null;
  }
}

/** Seeded/validation rows (and the removed "Seed test events" button) never count. */
export function isTestEventRow(row: Pick<DashboardEventRow, "visitor_id" | "session_id" | "metadata">): boolean {
  if (row.metadata?.is_test === true || row.metadata?.is_test === 1) return true;
  if (row.metadata?.source === "test") return true;
  const v = row.visitor_id ?? "";
  const s = row.session_id ?? "";
  return v === "test-visitor" || v.startsWith("test-") || s === "test-session";
}

// ---------------------------------------------------------------------------
// Event source (Postgres or SQLite)
// ---------------------------------------------------------------------------

interface EventSource {
  kind: "postgres" | "sqlite";
  label: string;
  note?: string;
  loadRows(startMs: number | null): Promise<DashboardEventRow[]>;
  firstSeenByVisitor(): Promise<Map<string, number>>;
  trackingSince(): Promise<number | null>;
  viewedRecipeSlugs(): Promise<Set<string>>;
}

function parseSqliteTime(value: unknown): number {
  const s = String(value ?? "");
  const iso = s.includes("T") ? s : `${s.replace(" ", "T")}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function toSqliteTime(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

function parseJson(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(raw ?? "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function sqliteSource(note: string): EventSource {
  const db = getAnalyticsSqliteDb();
  const placeholders = DASHBOARD_EVENT_TYPES.map(() => "?").join(", ");
  return {
    kind: "sqlite",
    label: "Local SQLite analytics (this server instance only)",
    note,
    async loadRows(startMs) {
      const rows = db
        .prepare(
          `SELECT event_type, visitor_id, session_id, route, metadata_json, occurred_at
           FROM analytics_events
           WHERE event_type IN (${placeholders}) ${startMs != null ? "AND occurred_at >= ?" : ""}`,
        )
        .all(...DASHBOARD_EVENT_TYPES, ...(startMs != null ? [toSqliteTime(startMs)] : []));
      return rows.map((r) => ({
        event_type: String(r.event_type),
        visitor_id: r.visitor_id ? String(r.visitor_id) : null,
        session_id: r.session_id ? String(r.session_id) : null,
        route: r.route ? String(r.route) : null,
        metadata: parseJson(r.metadata_json),
        at: parseSqliteTime(r.occurred_at),
      }));
    },
    async firstSeenByVisitor() {
      const rows = db
        .prepare(
          `SELECT visitor_id, MIN(occurred_at) AS first_seen FROM analytics_events
           WHERE event_type = 'page_view' AND visitor_id IS NOT NULL GROUP BY visitor_id`,
        )
        .all();
      return new Map(rows.map((r) => [String(r.visitor_id), parseSqliteTime(r.first_seen)]));
    },
    async trackingSince() {
      const row = db.prepare(`SELECT MIN(occurred_at) AS t FROM analytics_events`).get();
      return row?.t ? parseSqliteTime(row.t) : null;
    },
    async viewedRecipeSlugs() {
      const rows = db
        .prepare(
          `SELECT DISTINCT json_extract(metadata_json, '$.recipe_slug') AS slug FROM analytics_events
           WHERE event_type = 'recipe_view' AND json_extract(metadata_json, '$.recipe_slug') IS NOT NULL`,
        )
        .all();
      return new Set(rows.map((r) => String(r.slug)));
    },
  };
}

function postgresSource(): EventSource {
  return {
    kind: "postgres",
    label: "Postgres analytics_events (durable, all instances)",
    async loadRows(startMs) {
      const rows = await pgAll<Record<string, unknown>>(
        `SELECT event_type, visitor_id, session_id, route, metadata, occurred_at
         FROM analytics_events
         WHERE event_type = ANY($1::text[]) AND ($2::timestamptz IS NULL OR occurred_at >= $2::timestamptz)`,
        [DASHBOARD_EVENT_TYPES as unknown as string[], startMs != null ? new Date(startMs).toISOString() : null],
      );
      return rows.map((r) => ({
        event_type: String(r.event_type),
        visitor_id: r.visitor_id ? String(r.visitor_id) : null,
        session_id: r.session_id ? String(r.session_id) : null,
        route: r.route ? String(r.route) : null,
        metadata: parseJson(r.metadata),
        at: new Date(r.occurred_at as string).getTime(),
      }));
    },
    async firstSeenByVisitor() {
      const rows = await pgAll<{ visitor_id: string; first_seen: string }>(
        `SELECT visitor_id, MIN(occurred_at) AS first_seen FROM analytics_events
         WHERE event_type = 'page_view' AND visitor_id IS NOT NULL GROUP BY visitor_id`,
      );
      return new Map(rows.map((r) => [r.visitor_id, new Date(r.first_seen).getTime()]));
    },
    async trackingSince() {
      const row = await pgOne<{ t: string | null }>(`SELECT MIN(occurred_at) AS t FROM analytics_events`);
      return row?.t ? new Date(row.t).getTime() : null;
    },
    async viewedRecipeSlugs() {
      const rows = await pgAll<{ slug: string }>(
        `SELECT DISTINCT metadata->>'recipe_slug' AS slug FROM analytics_events
         WHERE event_type = 'recipe_view' AND metadata ? 'recipe_slug'`,
      );
      return new Set(rows.map((r) => r.slug));
    },
  };
}

async function pgAnalyticsTableExists(): Promise<boolean> {
  try {
    const row = await pgOne<{ t: string | null }>(`SELECT to_regclass('public.analytics_events')::text AS t`);
    return Boolean(row?.t);
  } catch {
    return false;
  }
}

async function resolveEventSource(): Promise<EventSource> {
  if (analyticsPgEnabled()) {
    if (await pgAnalyticsTableExists()) return postgresSource();
    return sqliteSource(
      "Postgres analytics table is not migrated yet (run `npm run db:pg:migrate`). Showing this instance's local file, which Replit Autoscale wipes on redeploy and does not share between instances.",
    );
  }
  return sqliteSource(
    process.env.NODE_ENV === "production"
      ? "DATABASE_URL is not configured, so events are only in this instance's local file (wiped on redeploy)."
      : "Local development data — production numbers live in the production Postgres database.",
  );
}

// ---------------------------------------------------------------------------
// Aggregation (pure — unit-testable)
// ---------------------------------------------------------------------------

function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function rank(map: Map<string, { label: string; count: number }>, limit = 10): AnalyticsRankedRow[] {
  return [...map.entries()]
    .map(([key, v]) => ({ key, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function bump(map: Map<string, { label: string; count: number }>, key: unknown, label?: unknown): void {
  if (key === null || key === undefined || key === "") return;
  const k = String(key);
  const existing = map.get(k);
  if (existing) existing.count += 1;
  else map.set(k, { label: String(label || k), count: 1 });
}

function pct(numerator: number, denominator: number): MetricValue {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function sourceLabel(raw: unknown): string {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s || s === "internal") return "direct";
  return s;
}

export interface AggregatedEvents {
  audience: Omit<AnalyticsAudienceSection, "status">;
  engagement: Omit<
    AnalyticsEngagementSection,
    "status" | "recipes_saved_to_accounts" | "never_viewed_recipes_sample"
  >;
}

export function aggregateEvents(
  allRows: DashboardEventRow[],
  firstSeen: Map<string, number>,
  startMs: number | null,
  nowMs = Date.now(),
): AggregatedEvents {
  const rows = allRows.filter(
    (r) => !isTestEventRow(r) && !(r.event_type === "page_view" && (r.route ?? "").startsWith("/admin")),
  );
  const pageViews = rows.filter((r) => r.event_type === "page_view").sort((a, b) => a.at - b.at);

  // Sessions: per visitor, a new session starts after 30 idle minutes.
  const byVisitor = new Map<string, DashboardEventRow[]>();
  for (const pv of pageViews) {
    const key = pv.visitor_id ?? (pv.session_id ? `session:${pv.session_id}` : null);
    if (!key) continue;
    const list = byVisitor.get(key) ?? [];
    list.push(pv);
    byVisitor.set(key, list);
  }
  const sources = new Map<string, { label: string; count: number }>();
  let sessions = 0;
  let returning = 0;
  for (const [visitor, list] of byVisitor) {
    let visitorSessions = 0;
    let last = -Infinity;
    for (const pv of list) {
      if (pv.at - last > SESSION_IDLE_MS) {
        visitorSessions += 1;
        bump(sources, sourceLabel(pv.metadata.traffic_source));
      }
      last = pv.at;
    }
    sessions += visitorSessions;
    const first = firstSeen.get(visitor);
    const seenBefore = startMs != null && first != null && first < startMs;
    if (seenBefore || visitorSessions >= 2) returning += 1;
  }
  const uniqueVisitors = byVisitor.size;

  const pages = new Map<string, { label: string; count: number }>();
  const devices = new Map<string, { label: string; count: number }>();
  const dailyViews = new Map<string, { views: number; visitors: Set<string> }>();
  for (const pv of pageViews) {
    bump(pages, pv.route || "/");
    bump(devices, pv.metadata.device_type || "unknown");
    const day = utcDay(pv.at);
    const bucket = dailyViews.get(day) ?? { views: 0, visitors: new Set<string>() };
    bucket.views += 1;
    if (pv.visitor_id) bucket.visitors.add(pv.visitor_id);
    dailyViews.set(day, bucket);
  }
  const daily: AnalyticsDailyPoint[] = [];
  const firstDayMs = startMs ?? (pageViews[0]?.at ?? nowMs);
  const fromDay = Date.parse(`${utcDay(Math.max(firstDayMs, nowMs - 365 * DAY_MS))}T00:00:00Z`);
  for (let t = fromDay; t <= nowMs; t += DAY_MS) {
    const day = utcDay(t);
    const b = dailyViews.get(day);
    daily.push({ date: day, page_views: b?.views ?? 0, visitors: b?.visitors.size ?? 0 });
  }

  const count = (pred: (r: DashboardEventRow) => boolean) => rows.filter(pred).length;
  const ofType = (t: string) => (r: DashboardEventRow) => r.event_type === t;
  const isPizzaView = (r: DashboardEventRow) => r.event_type === "page_view" && (r.route ?? "").startsWith("/pizza");

  const generated = count(ofType("meal_generated"));
  const started = count(ofType("meal_generation_started"));

  const features: Array<{ key: string; label: string; match: (r: DashboardEventRow) => boolean }> = [
    { key: "generator", label: "Meal generator", match: ofType("meal_generated") },
    { key: "recipes", label: "Recipe pages", match: ofType("recipe_view") },
    { key: "saves", label: "Saved recipes", match: ofType("recipe_save") },
    { key: "grocery", label: "Grocery lists", match: (r) => GROCERY_EVENTS.has(r.event_type) },
    { key: "wheel", label: "Classics Wheel", match: ofType("wheel_spin") },
    { key: "pizza", label: "Pizza Night", match: isPizzaView },
    { key: "votes", label: "Crew votes", match: (r) => VOTE_EVENTS.has(r.event_type) },
    { key: "search", label: "Recipe search", match: ofType("search") },
  ];
  const featureUsage = features
    .map((f) => {
      const visitors = new Set(rows.filter(f.match).map((r) => r.visitor_id ?? r.session_id ?? "?"));
      return { key: f.key, label: f.label, count: visitors.size };
    })
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);

  const topBy = (type: string, field: string, labelField = field) => {
    const m = new Map<string, { label: string; count: number }>();
    for (const r of rows) if (r.event_type === type) bump(m, r.metadata[field], r.metadata[labelField]);
    return rank(m);
  };

  return {
    audience: {
      unique_visitors: uniqueVisitors,
      new_visitors: uniqueVisitors - returning,
      returning_visitors: returning,
      sessions,
      page_views: pageViews.length,
      pages_per_session: sessions > 0 ? Math.round((pageViews.length / sessions) * 10) / 10 : 0,
      traffic_sources: rank(sources, 8),
      top_pages: rank(pages, 10),
      devices: rank(devices, 4),
      daily,
    },
    engagement: {
      meals_generated: generated,
      meal_generation_success_rate: started > 0 ? Math.min(100, pct(generated, started) ?? 0) : null,
      recipe_views: count(ofType("recipe_view")),
      recipes_saved: count(ofType("recipe_save")),
      grocery_lists_created: count((r) => GROCERY_EVENTS.has(r.event_type)),
      wheel_spins: count(ofType("wheel_spin")),
      pizza_night_views: count(isPizzaView),
      crew_votes: count((r) => VOTE_EVENTS.has(r.event_type)),
      crews_created: count(ofType("hall_created")),
      checkout_starts: count(ofType("stripe_checkout_started")),
      feature_usage: featureUsage,
      top_viewed_recipes: topBy("recipe_view", "recipe_slug", "recipe_title"),
      top_generated_meals: topBy("meal_generated", "recipe_title"),
      top_saved_recipes: topBy("recipe_save", "recipe_slug", "recipe_title"),
      top_wheel_landings: topBy("wheel_spin", "recipe_slug", "recipe_title"),
      top_searches: topBy("search", "search_term"),
    },
  };
}

// ---------------------------------------------------------------------------
// Email + user growth (Postgres)
// ---------------------------------------------------------------------------

async function loadGrowth(startMs: number | null, uniqueVisitors: number | null): Promise<AnalyticsGrowthSection> {
  const klaviyoCount = await getKlaviyoListMemberCount().catch(() => null);
  const klaviyoNote =
    klaviyoCount === null
      ? "Klaviyo not configured or unreachable."
      : "Klaviyo list members include signups from before consent tracking began; Klaviyo does not mark them as email-marketing subscribed.";
  const empty: AnalyticsGrowthSection = {
    status: { available: false, source: "Postgres users + user_marketing_consent" },
    newsletter_subscribers_total: null,
    newsletter_signups_new: null,
    newsletter_unsubscribes: null,
    newsletter_signups_by_source: [],
    registered_users_total: null,
    registered_users_new: null,
    known_emails_total: null,
    test_accounts_excluded: 0,
    newsletter_conversion_rate: null,
    account_conversion_rate: null,
    klaviyo_list_members: klaviyoCount,
    klaviyo_note: klaviyoNote,
  };
  if (!isPgConfigured()) {
    return { ...empty, status: { ...empty.status, note: "DATABASE_URL is not configured." } };
  }
  const since = startMs != null ? new Date(startMs).toISOString() : null;
  try {
    const consent = await pgOne<Record<string, string>>(
      `SELECT
         COUNT(*) FILTER (WHERE marketing_consent = 1 AND unsubscribed_at IS NULL) AS total,
         COUNT(*) FILTER (WHERE consent_captured_at IS NOT NULL AND ($1::timestamptz IS NULL OR consent_captured_at >= $1::timestamptz)) AS new_signups,
         COUNT(*) FILTER (WHERE unsubscribed_at IS NOT NULL AND ($1::timestamptz IS NULL OR unsubscribed_at >= $1::timestamptz)) AS unsubs
       FROM user_marketing_consent WHERE NOT ${TEST_EMAIL_SQL("email")}`,
      [since],
    );
    const bySource = await pgAll<{ src: string | null; n: string }>(
      `SELECT consent_source AS src, COUNT(*) AS n FROM user_marketing_consent
       WHERE consent_captured_at IS NOT NULL AND ($1::timestamptz IS NULL OR consent_captured_at >= $1::timestamptz)
         AND NOT ${TEST_EMAIL_SQL("email")}
       GROUP BY consent_source ORDER BY n DESC`,
      [since],
    );
    const users = await pgOne<Record<string, string>>(
      `SELECT
         COUNT(*) FILTER (WHERE NOT ${TEST_EMAIL_SQL("email")}) AS total,
         COUNT(*) FILTER (WHERE NOT ${TEST_EMAIL_SQL("email")} AND ($1::timestamptz IS NULL OR created_at >= $1::timestamptz)) AS new_users,
         COUNT(*) FILTER (WHERE ${TEST_EMAIL_SQL("email")}) AS test_accounts
       FROM users WHERE is_guest = 0 AND email IS NOT NULL`,
      [since],
    );
    const known = await pgOne<{ n: string }>(
      `SELECT COUNT(*) AS n FROM (
         SELECT lower(email) AS e FROM users WHERE email IS NOT NULL
         UNION SELECT lower(email) FROM user_marketing_consent
       ) x WHERE NOT ${TEST_EMAIL_SQL("e")}`,
    );
    const newSignups = Number(consent?.new_signups ?? 0);
    const newUsers = Number(users?.new_users ?? 0);
    return {
      ...empty,
      status: {
        available: true,
        source: "Postgres users + user_marketing_consent",
        note: "Newsletter = explicit opt-in recorded in Postgres (since Sept 2026). Accounts on reserved test domains (example.com, .test) are excluded.",
      },
      newsletter_subscribers_total: Number(consent?.total ?? 0),
      newsletter_signups_new: newSignups,
      newsletter_unsubscribes: Number(consent?.unsubs ?? 0),
      newsletter_signups_by_source: bySource.map((r) => ({
        key: r.src ?? "unknown",
        label: r.src ?? "unknown",
        count: Number(r.n),
      })),
      registered_users_total: Number(users?.total ?? 0),
      registered_users_new: newUsers,
      known_emails_total: Number(known?.n ?? 0),
      test_accounts_excluded: Number(users?.test_accounts ?? 0),
      newsletter_conversion_rate: uniqueVisitors ? pct(newSignups, uniqueVisitors) : null,
      account_conversion_rate: uniqueVisitors ? pct(newUsers, uniqueVisitors) : null,
    };
  } catch (err) {
    logError("analytics-dashboard", "growth metrics failed", err);
    return { ...empty, status: { ...empty.status, note: "Postgres query failed — see server logs." } };
  }
}

async function loadAccountSaves(startMs: number | null): Promise<MetricValue> {
  if (!isPgConfigured()) return null;
  try {
    const row = await pgOne<{ n: string }>(
      `SELECT COUNT(*) AS n FROM user_saved_recipes WHERE ($1::timestamptz IS NULL OR saved_at >= $1::timestamptz)`,
      [startMs != null ? new Date(startMs).toISOString() : null],
    );
    return Number(row?.n ?? 0);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Revenue (Stripe, read-only)
// ---------------------------------------------------------------------------

const STRIPE_CACHE_TTL_MS = 5 * 60 * 1000;
const stripeCache = new Map<string, { at: number; value: Partial<AnalyticsRevenueSection> }>();

/** Monthly amount in cents for one subscription item at list price (before discounts). */
export function monthlyCents(item: {
  quantity?: number | null;
  price?: { unit_amount?: number | null; recurring?: { interval?: string; interval_count?: number } | null } | null;
}): number {
  const unit = item.price?.unit_amount ?? 0;
  const qty = item.quantity ?? 1;
  const interval = item.price?.recurring?.interval;
  const every = item.price?.recurring?.interval_count || 1;
  const perMonth: Record<string, number> = { day: 365 / 12, week: 52 / 12, month: 1, year: 1 / 12 };
  return Math.round((unit * qty * (perMonth[interval ?? "month"] ?? 0)) / every);
}

export function summarizeStripe(
  subscriptions: Array<Pick<Stripe.Subscription, "status" | "start_date" | "canceled_at"> & {
    items: { data: Array<Parameters<typeof monthlyCents>[0]> };
    currency?: string;
  }>,
  paidInvoices: Array<{ amount_paid: number; currency: string }>,
  startMs: number | null,
): Partial<AnalyticsRevenueSection> {
  const startSec = startMs != null ? Math.floor(startMs / 1000) : null;
  const inPeriod = (sec: number | null | undefined) => sec != null && (startSec == null || sec >= startSec);
  const paying = subscriptions.filter((s) => s.status === "active" || s.status === "past_due");
  return {
    active_paid_subscribers: paying.length,
    trialing_subscribers: subscriptions.filter((s) => s.status === "trialing").length,
    new_paid_subscriptions: paying.filter((s) => inPeriod(s.start_date)).length,
    cancellations: subscriptions.filter((s) => inPeriod(s.canceled_at)).length,
    mrr_cents: paying.reduce((sum, s) => sum + s.items.data.reduce((a, item) => a + monthlyCents(item), 0), 0),
    revenue_cents: paidInvoices.reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0),
    currency: paidInvoices[0]?.currency ?? subscriptions[0]?.currency ?? null,
  };
}

async function loadRevenue(period: AnalyticsPeriod, startMs: number | null): Promise<AnalyticsRevenueSection> {
  let paymentsEnabled: boolean | null = null;
  let complimentary: MetricValue = null;
  let stripeLinkedRows: number | null = null;
  if (isPgConfigured()) {
    try {
      const flag = await pgOne<{ enabled: number }>(
        `SELECT enabled FROM billing_global_flags WHERE flag_key = 'payments_enabled'`,
      );
      paymentsEnabled = flag ? Number(flag.enabled) === 1 : null;
      const subs = await pgOne<{ comp: string; linked: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE stripe_subscription_id IS NULL AND plan_id IN ('firefighter_plus', 'hall_pro') AND status IN ('active', 'trialing')) AS comp,
           COUNT(*) FILTER (WHERE stripe_subscription_id IS NOT NULL) AS linked
         FROM user_subscriptions`,
      );
      complimentary = Number(subs?.comp ?? 0);
      stripeLinkedRows = Number(subs?.linked ?? 0);
    } catch (err) {
      logError("analytics-dashboard", "billing flag lookup failed", err);
    }
  }

  const base: AnalyticsRevenueSection = {
    status: { available: false, source: "Stripe API (read-only)" },
    payments_enabled: paymentsEnabled,
    active_paid_subscribers: null,
    trialing_subscribers: null,
    new_paid_subscriptions: null,
    cancellations: null,
    mrr_cents: null,
    revenue_cents: null,
    currency: null,
    complimentary_plans: complimentary,
  };
  const dbNote =
    stripeLinkedRows != null ? ` Database has ${stripeLinkedRows} Stripe-linked subscription record(s).` : "";

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return {
      ...base,
      status: { ...base.status, note: `STRIPE_SECRET_KEY is not configured on this server, so Stripe-verified figures are unavailable.${dbNote}` },
    };
  }

  const cached = stripeCache.get(period);
  if (cached && Date.now() - cached.at < STRIPE_CACHE_TTL_MS) {
    return { ...base, ...cached.value, status: { available: true, source: "Stripe API (read-only, cached 5 min)" } };
  }
  try {
    const stripe = getStripeClient();
    const subscriptions = await stripe.subscriptions
      .list({ status: "all", limit: 100, expand: ["data.items.data.price"] })
      .autoPagingToArray({ limit: 2000 });
    const invoices = await stripe.invoices
      .list({
        status: "paid",
        limit: 100,
        ...(startMs != null ? { created: { gte: Math.floor(startMs / 1000) } } : {}),
      })
      .autoPagingToArray({ limit: 5000 });
    const value = summarizeStripe(subscriptions as never, invoices, startMs);
    stripeCache.set(period, { at: Date.now(), value });
    return {
      ...base,
      ...value,
      status: {
        available: true,
        source: "Stripe API (read-only)",
        note: "MRR uses list prices of active/past-due subscriptions (before coupons). Revenue = paid invoices in the period.",
      },
    };
  } catch (err) {
    logError("analytics-dashboard", "Stripe revenue lookup failed", err);
    return { ...base, status: { ...base.status, note: `Stripe request failed — see server logs.${dbNote}` } };
  }
}

// ---------------------------------------------------------------------------

export async function getAnalyticsDashboard(period: AnalyticsPeriod): Promise<AnalyticsDashboardPayload> {
  const now = Date.now();
  const startMs = periodStartMs(period, now);
  const source = await resolveEventSource();

  let aggregated: AggregatedEvents | null = null;
  let trackingSince: number | null = null;
  let neverViewed: AnalyticsRankedRow[] = [];
  let eventError: string | undefined;
  try {
    const [rows, firstSeen, since, viewed] = await Promise.all([
      source.loadRows(startMs),
      source.firstSeenByVisitor(),
      source.trackingSince(),
      source.viewedRecipeSlugs(),
    ]);
    aggregated = aggregateEvents(rows, firstSeen, startMs, now);
    trackingSince = since;
    neverViewed = GOLDEN_100_RECIPES.filter((r) => !viewed.has(r.slug))
      .slice(0, 12)
      .map((r) => ({ key: r.slug, label: r.title, count: 0 }));
  } catch (err) {
    logError("analytics-dashboard", "event aggregation failed", err);
    eventError = "Analytics event query failed — see server logs.";
  }

  const eventStatus = {
    available: aggregated !== null,
    source: source.label,
    note: [eventError, source.note].filter(Boolean).join(" ") || undefined,
  };
  const emptyAgg = aggregateEvents([], new Map(), startMs, now);
  const agg = aggregated ?? emptyAgg;

  const [growth, accountSaves, revenue] = await Promise.all([
    loadGrowth(startMs, aggregated ? agg.audience.unique_visitors : null),
    loadAccountSaves(startMs),
    loadRevenue(period, startMs),
  ]);

  return {
    period,
    generated_at: new Date(now).toISOString(),
    timezone: "UTC",
    tracking_since: trackingSince != null ? new Date(trackingSince).toISOString() : null,
    audience: { status: eventStatus, ...agg.audience },
    growth,
    engagement: {
      status: eventStatus,
      ...agg.engagement,
      recipes_saved_to_accounts: accountSaves,
      never_viewed_recipes_sample: neverViewed,
    },
    revenue,
  };
}
