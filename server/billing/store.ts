import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { verifyPgConnection } from "../db/pg-client.js";
import { pgAll, pgOne, pgRun } from "../db/pg-sql.js";

import { getStripeConfigStatus } from "./stripe-client.js";

import {
  BILLING_FEATURES,
  HALL_PRO_FEATURES,
  PLAN_BASE_FEATURES,
  PLAN_DISPLAY,
  hallHasProStatus,
  isHallProFeature,
  resolveBillingFeature,
  subscriptionGrantsAccess,
  type BillingFeature,
  type HallSubscription,
  type PlanCatalogEntry,
  type PlanFeatureFlagRow,
  type PlanId,
  type SubscriptionStatus,
  type UserBillingState,
  type UserSubscription,
} from "../../shared/billing/types.js";

// hall_subscriptions / hall_memberships are Hall Pro (out of scope for this
// migration, on hold) and STAY on SQLite — this handle is only ever used by
// the hall-scoped functions below (clearly marked).
let hallDb: SqliteDatabase;

export async function initBillingStore(): Promise<void> {
  hallDb = await getSharedLocalDb();
  await verifyPgConnection();
  await seedFeatureFlags();
}

/** Test hook — binds the SQLite handle used ONLY by hall_subscriptions functions. */
export function bindBillingDb(database: SqliteDatabase): void {
  hallDb = database;
  void seedFeatureFlags();
}

function getHallDb(): SqliteDatabase {
  if (!hallDb) {
    throw new Error("Billing store not initialized — call initBillingStore() first");
  }
  return hallDb;
}

async function seedFeatureFlags(): Promise<void> {
  for (const planId of Object.keys(PLAN_BASE_FEATURES) as PlanId[]) {
    for (const feature of PLAN_BASE_FEATURES[planId]) {
      await pgRun(
        `INSERT INTO plan_feature_flags (plan_id, feature_key, enabled) VALUES ($1, $2, 1)
         ON CONFLICT (plan_id, feature_key) DO NOTHING`,
        [planId, feature],
      );
    }
  }
}

async function isPlanEnabled(planId: PlanId): Promise<boolean> {
  const row = await pgOne<{ enabled: number }>(`SELECT enabled FROM plan_catalog WHERE plan_id = $1`, [planId]);
  return row ? Number(row.enabled) === 1 : planId === "guest";
}

async function getGlobalFlag(key: string, defaultValue = true): Promise<boolean> {
  const row = await pgOne<{ enabled: number }>(`SELECT enabled FROM billing_global_flags WHERE flag_key = $1`, [key]);
  if (!row) return defaultValue;
  return Number(row.enabled) === 1;
}

async function getFeatureFlagOverrides(planId: PlanId): Promise<Map<BillingFeature, boolean>> {
  const rows = await pgAll<{ feature_key: string; enabled: number }>(
    `SELECT feature_key, enabled FROM plan_feature_flags WHERE plan_id = $1`,
    [planId],
  );
  const map = new Map<BillingFeature, boolean>();
  for (const row of rows) {
    if (BILLING_FEATURES.includes(row.feature_key as BillingFeature)) {
      map.set(row.feature_key as BillingFeature, Number(row.enabled) === 1);
    }
  }
  return map;
}

async function buildFeatureMap(planId: PlanId): Promise<Record<BillingFeature, boolean>> {
  const overrides = await getFeatureFlagOverrides(planId);
  const result = {} as Record<BillingFeature, boolean>;
  for (const feature of BILLING_FEATURES) {
    const inPlan = PLAN_BASE_FEATURES[planId].includes(feature);
    const override = overrides.get(feature);
    result[feature] = inPlan && (override === undefined ? true : override);
  }
  return result;
}

function iso(value: unknown): string {
  if (value == null) return new Date(0).toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function isoOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function rowToHallSubscription(row: Record<string, unknown>): HallSubscription {
  return {
    hall_id: String(row.hall_id),
    plan_id: "hall_pro",
    status: String(row.status) as SubscriptionStatus,
    source: row.source as HallSubscription["source"],
    selected_at: iso(row.selected_at ?? row.updated_at),
    trial_started_at: isoOrNull(row.trial_started_at),
    subscribed_by_user_id: row.subscribed_by_user_id ? String(row.subscribed_by_user_id) : null,
    updated_at: iso(row.updated_at),
  };
}

export async function getPlanCatalog(): Promise<PlanCatalogEntry[]> {
  const rows = await pgAll(`SELECT * FROM plan_catalog ORDER BY sort_order ASC`);

  return rows.map((row) => {
    const planId = String(row.plan_id) as PlanId;
    const meta = PLAN_DISPLAY[planId];
    const features =
      planId === "hall_pro"
        ? ([...HALL_PRO_FEATURES] as BillingFeature[])
        : ([...PLAN_BASE_FEATURES[planId]] as BillingFeature[]);
    return {
      plan_id: planId,
      display_name: String(row.display_name ?? meta.display_name),
      tagline: String(row.tagline ?? meta.tagline),
      enabled: Number(row.enabled) === 1,
      sort_order: Number(row.sort_order ?? meta.sort_order),
      features,
      price_label: String(row.price_label ?? meta.price_label),
    };
  });
}

function rowToUserSubscription(row: Record<string, unknown>, planIdOverride?: PlanId): UserSubscription {
  return {
    user_id: String(row.user_id),
    plan_id: planIdOverride ?? (String(row.plan_id) as PlanId),
    status: String(row.status) as SubscriptionStatus,
    source: row.source as UserSubscription["source"],
    selected_at: iso(row.selected_at),
    expires_at: isoOrNull(row.expires_at),
    cancel_at_period_end: row.stripe_subscription_id ? Number(row.cancel_at_period_end) === 1 : undefined,
    current_period_end: row.stripe_subscription_id ? isoOrNull(row.current_period_end) : undefined,
  };
}

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const row = await pgOne(`SELECT * FROM user_subscriptions WHERE user_id = $1`, [userId]);
  if (!row) return null;
  const planId = String(row.plan_id) as PlanId;
  if (planId === "hall_pro") {
    return rowToUserSubscription(row, "personal");
  }
  return rowToUserSubscription(row);
}

export interface SubscriptionInfoForAccountDeletion {
  source: UserSubscription["source"];
  status: SubscriptionStatus;
  stripeSubscriptionId: string | null;
}

/**
 * Minimal read used only by the account-deletion Stripe-cancellation guard
 * (see billing/account-deletion-guard.ts).
 */
export async function getSubscriptionInfoForAccountDeletion(
  userId: string,
): Promise<SubscriptionInfoForAccountDeletion | null> {
  const row = await pgOne<{ source: string; status: string; stripe_subscription_id: string | null }>(
    `SELECT source, status, stripe_subscription_id FROM user_subscriptions WHERE user_id = $1`,
    [userId],
  );
  if (!row) return null;
  return {
    source: row.source as UserSubscription["source"],
    status: row.status as SubscriptionStatus,
    stripeSubscriptionId: row.stripe_subscription_id,
  };
}

/** Whether this user has a Stripe customer id on file (drives the "Manage billing" portal link). */
export async function userHasStripeCustomer(userId: string): Promise<boolean> {
  const row = await pgOne<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = $1`,
    [userId],
  );
  return Boolean(row?.stripe_customer_id);
}

export async function getStripeCustomerIdForUser(userId: string): Promise<string | null> {
  const row = await pgOne<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = $1`,
    [userId],
  );
  return row?.stripe_customer_id ?? null;
}

export async function getUserIdByStripeCustomerId(stripeCustomerId: string): Promise<string | null> {
  const row = await pgOne<{ user_id: string }>(
    `SELECT user_id FROM user_subscriptions WHERE stripe_customer_id = $1`,
    [stripeCustomerId],
  );
  return row?.user_id ?? null;
}

export async function getUserIdByStripeSubscriptionId(stripeSubscriptionId: string): Promise<string | null> {
  const row = await pgOne<{ user_id: string }>(
    `SELECT user_id FROM user_subscriptions WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId],
  );
  return row?.user_id ?? null;
}

/**
 * Links a Stripe Customer to a user BEFORE checkout completes, so the same
 * customer is reused across checkout attempts instead of creating a new one
 * every time. Preserves any existing plan/status.
 */
export async function linkStripeCustomer(userId: string, stripeCustomerId: string): Promise<void> {
  await pgRun(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, source, stripe_customer_id, selected_at, updated_at)
     VALUES ($1, 'personal', 'active', 'self_select', $2, now(), now())
     ON CONFLICT (user_id) DO UPDATE SET
       stripe_customer_id = excluded.stripe_customer_id,
       updated_at = now()`,
    [userId, stripeCustomerId],
  );
}

/**
 * Canonical write path for Stripe-sourced subscription state — called from
 * the webhook handler only. Always sets plan_id='firefighter_plus'.
 */
export async function upsertStripeSubscription(params: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}): Promise<UserBillingState> {
  // Guard against a Stripe webhook racing with account deletion (both
  // resolve a user_id from Stripe object metadata alone). If the user row is
  // already gone, deletion already cancelled Stripe first — nothing to record.
  const userExists = await pgOne(`SELECT 1 FROM users WHERE user_id = $1`, [params.userId]);
  if (userExists) {
    await pgRun(
      `INSERT INTO user_subscriptions (
         user_id, plan_id, status, source, stripe_customer_id, stripe_subscription_id,
         stripe_price_id, cancel_at_period_end, current_period_end, selected_at, updated_at
       )
       VALUES ($1, 'firefighter_plus', $2, 'stripe', $3, $4, $5, $6, $7, now(), now())
       ON CONFLICT (user_id) DO UPDATE SET
         plan_id = 'firefighter_plus',
         status = excluded.status,
         source = 'stripe',
         stripe_customer_id = excluded.stripe_customer_id,
         stripe_subscription_id = excluded.stripe_subscription_id,
         stripe_price_id = excluded.stripe_price_id,
         cancel_at_period_end = excluded.cancel_at_period_end,
         current_period_end = excluded.current_period_end,
         updated_at = now()`,
      [
        params.userId,
        params.status,
        params.stripeCustomerId,
        params.stripeSubscriptionId,
        params.stripePriceId,
        params.cancelAtPeriodEnd ? 1 : 0,
        params.currentPeriodEnd,
      ],
    );
  }

  return resolveUserBilling(params.userId);
}

/** Called on `customer.subscription.deleted` — the subscription is gone for good (not just past_due). */
export async function markStripeSubscriptionCancelledBySubscriptionId(
  stripeSubscriptionId: string,
): Promise<UserBillingState | null> {
  const userId = await getUserIdByStripeSubscriptionId(stripeSubscriptionId);
  if (!userId) return null;
  await pgRun(
    `UPDATE user_subscriptions
     SET status = 'cancelled', cancel_at_period_end = 0, updated_at = now()
     WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId],
  );
  return resolveUserBilling(userId);
}

export async function hasWebhookEventBeenProcessed(eventId: string): Promise<boolean> {
  const row = await pgOne(`SELECT 1 FROM stripe_webhook_events WHERE event_id = $1`, [eventId]);
  return Boolean(row);
}

export async function recordWebhookEvent(eventId: string, eventType: string): Promise<void> {
  await pgRun(
    `INSERT INTO stripe_webhook_events (event_id, event_type) VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING`,
    [eventId, eventType],
  );
}

// ---------------------------------------------------------------------------
// Hall Pro (hall_subscriptions) — UNCHANGED, still SQLite. Hall Pro is on
// hold and explicitly out of scope for this migration.
// ---------------------------------------------------------------------------

export function getHallSubscription(hallId: string): HallSubscription | null {
  const d = getHallDb();
  const row = d.prepare(`SELECT * FROM hall_subscriptions WHERE hall_id = ?`).get(hallId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return rowToHallSubscription(row);
}

export function hallHasActivePro(hallId: string): boolean {
  const sub = getHallSubscription(hallId);
  return Boolean(sub && hallHasProStatus(sub.status));
}

export function listUserHallProHallIds(userId: string): string[] {
  const d = getHallDb();
  const rows = d
    .prepare(
      `
      SELECT hs.hall_id
      FROM hall_subscriptions hs
      INNER JOIN hall_memberships hm ON hm.hall_id = hs.hall_id
      WHERE hm.user_id = ?
        AND hs.plan_id = 'hall_pro'
        AND hs.status IN ('active', 'trialing')
      `,
    )
    .all(userId) as Array<{ hall_id: string }>;
  return rows.map((r) => r.hall_id);
}

export function listUserHallSubscriptions(userId: string): HallSubscription[] {
  const d = getHallDb();
  const rows = d
    .prepare(
      `
      SELECT hs.*
      FROM hall_subscriptions hs
      INNER JOIN hall_memberships hm ON hm.hall_id = hs.hall_id
      WHERE hm.user_id = ?
        AND hs.plan_id = 'hall_pro'
        AND hs.status IN ('active', 'trialing')
      ORDER BY hs.updated_at DESC
      `,
    )
    .all(userId) as Array<Record<string, unknown>>;
  return rows.map(rowToHallSubscription);
}

async function resolvePersonalPlanId(subscribedPlanId: PlanId | null, isGuest: boolean): Promise<PlanId> {
  if (isGuest) return "guest";
  let candidate: PlanId = subscribedPlanId ?? "personal";
  if (candidate === "hall_pro") candidate = "personal";
  if (!(await isPlanEnabled(candidate))) {
    return (await isPlanEnabled("personal")) ? "personal" : "guest";
  }
  return candidate;
}

export async function resolveUserBilling(
  userId: string | null,
  options?: { is_guest?: boolean },
): Promise<UserBillingState> {
  const catalog = await getPlanCatalog();

  if (!userId || options?.is_guest) {
    return {
      plan_id: "guest",
      effective_plan_id: "guest",
      subscription: null,
      features: await buildFeatureMap("guest"),
      hall_pro_hall_ids: [],
      hall_subscriptions: [],
      catalog,
      manage_billing_available: false,
    };
  }

  const sub = await getUserSubscription(userId);
  // A Stripe subscription in its `past_due` dunning grace period still grants
  // access — only a fully lapsed/cancelled subscription falls back to free.
  const subscribedPlan = sub && subscriptionGrantsAccess(sub.status) ? sub.plan_id : ("personal" as PlanId);

  const effective = await resolvePersonalPlanId(subscribedPlan, false);
  const hallSubscriptions = listUserHallSubscriptions(userId);
  const hallProHallIds = hallSubscriptions.map((s) => s.hall_id);

  return {
    plan_id: effective,
    effective_plan_id: effective,
    subscription: sub,
    features: await buildFeatureMap(effective),
    hall_pro_hall_ids: hallProHallIds,
    hall_subscriptions: hallSubscriptions,
    catalog,
    manage_billing_available: sub?.source === "stripe" && (await userHasStripeCustomer(userId)),
  };
}

export async function userHasFeature(
  userId: string | null,
  feature: BillingFeature,
  options?: { hall_id?: string; is_guest?: boolean },
): Promise<boolean> {
  const resolved = resolveBillingFeature(feature);

  if (isHallProFeature(resolved)) {
    return userHasHallProFeature(userId, resolved, options);
  }

  const billing = await resolveUserBilling(userId, { is_guest: options?.is_guest });
  return billing.features[resolved];
}

/**
 * Synchronous Hall Pro feature check. Hall Pro entitlement lives entirely in
 * SQLite (hall_subscriptions/hall_memberships — out of scope for this
 * migration, on hold), so this never touches Postgres and can stay
 * synchronous — existing Hall Pro feature gates (hall-shopping-list,
 * hall-canteen, hall-canteen-payments, hall-analytics, grocery-deals) keep
 * calling this exact shape without needing to become async.
 */
export function userHasHallProFeature(
  userId: string | null,
  feature: BillingFeature,
  options?: { hall_id?: string },
): boolean {
  const resolved = resolveBillingFeature(feature);
  if (!isHallProFeature(resolved)) {
    throw new Error(`userHasHallProFeature() called with a non-Hall-Pro feature: ${resolved}`);
  }
  const hallId = options?.hall_id;
  if (!userId || !hallId) return false;
  return listUserHallProHallIds(userId).includes(hallId);
}

export async function selectUserPlan(userId: string, planId: PlanId): Promise<UserBillingState | null> {
  // Self-select is limited to the free plan. firefighter_plus has no
  // self-service payment path here — granted only via Stripe webhook or
  // admin/dev tools (adminSetUserPlan).
  if (planId !== "personal") return null;
  if (!(await isPlanEnabled(planId))) return null;
  if (!(await getGlobalFlag("monetization_enabled", true))) return null;

  await pgRun(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, source, selected_at, updated_at)
     VALUES ($1, $2, 'active', 'self_select', now(), now())
     ON CONFLICT (user_id) DO UPDATE SET
       plan_id = excluded.plan_id,
       status = 'active',
       source = 'self_select',
       selected_at = now(),
       updated_at = now()`,
    [userId, planId],
  );

  return resolveUserBilling(userId);
}

// ---------------------------------------------------------------------------
// Hall Pro admin actions — UNCHANGED, still SQLite.
// ---------------------------------------------------------------------------

function hallSubSupportsTrialColumn(): boolean {
  const d = getHallDb();
  const cols = d.prepare(`PRAGMA table_info(hall_subscriptions)`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === "trial_started_at");
}

export function upsertHallSubscription(
  hallId: string,
  userId: string,
  status: SubscriptionStatus,
  source: HallSubscription["source"] = "self_select",
): HallSubscription {
  const d = getHallDb();
  const existing = getHallSubscription(hallId);
  const trialStartedAt =
    status === "trialing" ? existing?.trial_started_at ?? new Date().toISOString() : existing?.trial_started_at ?? null;

  if (hallSubSupportsTrialColumn()) {
    d.prepare(
      `INSERT INTO hall_subscriptions (
         hall_id, plan_id, status, source, trial_started_at, selected_at,
         subscribed_by_user_id, updated_at
       )
       VALUES (?, 'hall_pro', ?, ?, ?, datetime('now'), ?, datetime('now'))
       ON CONFLICT(hall_id) DO UPDATE SET
         plan_id = 'hall_pro',
         status = excluded.status,
         source = excluded.source,
         trial_started_at = COALESCE(hall_subscriptions.trial_started_at, excluded.trial_started_at),
         subscribed_by_user_id = excluded.subscribed_by_user_id,
         updated_at = datetime('now')`,
    ).run(hallId, status, source, trialStartedAt, userId);
  } else {
    d.prepare(
      `INSERT INTO hall_subscriptions (hall_id, plan_id, status, source, updated_at)
       VALUES (?, 'hall_pro', ?, ?, datetime('now'))
       ON CONFLICT(hall_id) DO UPDATE SET
         plan_id = 'hall_pro',
         status = excluded.status,
         source = excluded.source,
         updated_at = datetime('now')`,
    ).run(hallId, status, source);
  }

  return getHallSubscription(hallId)!;
}

export function startHallProTrial(hallId: string, userId: string): HallSubscription {
  return upsertHallSubscription(hallId, userId, "trialing", "self_select");
}

export function enableHallPro(hallId: string, userId: string): HallSubscription {
  return upsertHallSubscription(hallId, userId, "active", "self_select");
}

export function convertHallProTrial(hallId: string, userId: string): HallSubscription | null {
  const existing = getHallSubscription(hallId);
  if (!existing || existing.status !== "trialing") return existing;
  return upsertHallSubscription(hallId, userId, "active", existing.source);
}

export function adminSetHallPlan(hallId: string, status: SubscriptionStatus, userId?: string | null): HallSubscription {
  return upsertHallSubscription(hallId, userId ?? "admin", status, "admin_grant");
}

// ---------------------------------------------------------------------------
// Admin — personal plans/flags (Postgres) + Hall Pro reads (SQLite, above).
// ---------------------------------------------------------------------------

export async function adminSetPlanEnabled(planId: PlanId, enabled: boolean): Promise<PlanCatalogEntry | null> {
  await pgRun(`UPDATE plan_catalog SET enabled = $1, updated_at = now() WHERE plan_id = $2`, [
    enabled ? 1 : 0,
    planId,
  ]);
  const catalog = await getPlanCatalog();
  return catalog.find((p) => p.plan_id === planId) ?? null;
}

/**
 * Thrown by adminSetUserPlan() when the target user has a live (non-cancelled)
 * Stripe-sourced subscription. Hard block, no override — see original doc
 * comment preserved below.
 */
export class AdminGrantBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminGrantBlockedError";
  }
}

export async function adminSetUserPlan(
  userId: string,
  planId: PlanId,
  status: SubscriptionStatus = "active",
): Promise<UserBillingState> {
  if (planId === "hall_pro") {
    throw new Error("Hall Pro is hall-scoped — use adminSetHallPlan instead");
  }

  const existing = await pgOne<{ source: string; status: string }>(
    `SELECT source, status FROM user_subscriptions WHERE user_id = $1`,
    [userId],
  );

  if (existing?.source === "stripe" && existing.status !== "cancelled") {
    throw new AdminGrantBlockedError(
      `This user has a live Stripe subscription (status: ${existing.status}). An admin grant would ` +
        `overwrite the local plan/status and hide the "Manage billing" link WITHOUT cancelling the real ` +
        `Stripe subscription — they would keep being charged. Cancel their subscription in Stripe first, ` +
        `then retry the grant once the subscription shows as cancelled.`,
    );
  }

  await pgRun(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, source, updated_at)
     VALUES ($1, $2, $3, 'admin_grant', now())
     ON CONFLICT (user_id) DO UPDATE SET
       plan_id = excluded.plan_id,
       status = excluded.status,
       source = 'admin_grant',
       updated_at = now()`,
    [userId, planId, status],
  );

  await pgRun(`UPDATE users SET hall_pro_enabled = 0 WHERE user_id = $1`, [userId]);

  return resolveUserBilling(userId);
}

export async function adminTogglePlanFeature(
  planId: PlanId,
  featureKey: BillingFeature,
  enabled: boolean,
): Promise<PlanFeatureFlagRow> {
  await pgRun(
    `INSERT INTO plan_feature_flags (plan_id, feature_key, enabled, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (plan_id, feature_key) DO UPDATE SET
       enabled = excluded.enabled,
       updated_at = now()`,
    [planId, featureKey, enabled ? 1 : 0],
  );

  return { plan_id: planId, feature_key: featureKey, enabled };
}

/**
 * Truthful, non-misleading breakdown of Firehall Meals Pro (firefighter_plus)
 * subscribers — four separate counts rather than one blended number.
 */
export interface ProSubscriberBreakdown {
  stripe_active: number;
  stripe_past_due: number;
  admin_grants: number;
  cancelled: number;
}

async function getProSubscriberBreakdown(): Promise<ProSubscriberBreakdown> {
  const rows = await pgAll<{ source: string; status: string; c: string | number }>(
    `SELECT source, status, COUNT(*) AS c FROM user_subscriptions WHERE plan_id = 'firefighter_plus' GROUP BY source, status`,
  );

  const breakdown: ProSubscriberBreakdown = {
    stripe_active: 0,
    stripe_past_due: 0,
    admin_grants: 0,
    cancelled: 0,
  };

  for (const row of rows) {
    const count = Number(row.c);
    if (row.status === "cancelled") {
      breakdown.cancelled += count;
    } else if (row.source === "stripe" && row.status === "past_due") {
      breakdown.stripe_past_due += count;
    } else if (row.source === "stripe") {
      breakdown.stripe_active += count;
    } else if (row.source === "admin_grant") {
      breakdown.admin_grants += count;
    }
  }

  return breakdown;
}

export async function getAdminBillingDashboard(): Promise<{
  catalog: PlanCatalogEntry[];
  feature_flags: PlanFeatureFlagRow[];
  global_flags: Array<{ flag_key: string; enabled: boolean; description: string | null }>;
  subscription_counts: Record<PlanId, number>;
  hall_pro_hall_count: number;
  pro_subscriber_breakdown: ProSubscriberBreakdown;
  stripe_config: ReturnType<typeof getStripeConfigStatus>;
}> {
  const catalog = await getPlanCatalog();

  const flagRows = await pgAll<{ plan_id: string; feature_key: string; enabled: number }>(
    `SELECT plan_id, feature_key, enabled FROM plan_feature_flags ORDER BY plan_id, feature_key`,
  );

  const globalRows = await pgAll<{ flag_key: string; enabled: number; description: string | null }>(
    `SELECT flag_key, enabled, description FROM billing_global_flags`,
  );

  const counts: Record<PlanId, number> = { guest: 0, personal: 0, firefighter_plus: 0, hall_pro: 0 };
  const countRows = await pgAll<{ plan_id: string; c: string | number }>(
    `SELECT plan_id, COUNT(*) AS c FROM user_subscriptions WHERE status != 'cancelled' AND plan_id != 'hall_pro' GROUP BY plan_id`,
  );
  for (const row of countRows) {
    const id = row.plan_id as PlanId;
    if (id in counts && id !== "hall_pro") counts[id] = Number(row.c);
  }

  // Hall Pro count still lives in SQLite (untouched by this migration).
  const d = getHallDb();
  const hallProRow = d
    .prepare(`SELECT COUNT(*) AS c FROM hall_subscriptions WHERE plan_id = 'hall_pro' AND status IN ('active', 'trialing')`)
    .get() as { c: number };
  counts.hall_pro = Number(hallProRow?.c ?? 0);

  return {
    catalog,
    feature_flags: flagRows.map((r) => ({
      plan_id: r.plan_id as PlanId,
      feature_key: r.feature_key as BillingFeature,
      enabled: Number(r.enabled) === 1,
    })),
    global_flags: globalRows.map((r) => ({
      flag_key: r.flag_key,
      enabled: Number(r.enabled) === 1,
      description: r.description,
    })),
    subscription_counts: counts,
    hall_pro_hall_count: Number(hallProRow?.c ?? 0),
    pro_subscriber_breakdown: await getProSubscriberBreakdown(),
    stripe_config: getStripeConfigStatus(),
  };
}

export async function getBillingPublicConfig(): Promise<{
  monetization_enabled: boolean;
  payments_enabled: boolean;
}> {
  return {
    monetization_enabled: await getGlobalFlag("monetization_enabled", true),
    payments_enabled: await getGlobalFlag("payments_enabled", false),
  };
}

/**
 * Admin-only kill switch for `billing_global_flags` (e.g. `payments_enabled`).
 */
export async function adminSetGlobalFlag(
  flagKey: string,
  enabled: boolean,
): Promise<{ flag_key: string; enabled: boolean; description: string | null } | null> {
  const existing = await pgOne<{ flag_key: string; description: string | null }>(
    `SELECT flag_key, description FROM billing_global_flags WHERE flag_key = $1`,
    [flagKey],
  );
  if (!existing) return null;
  await pgRun(`UPDATE billing_global_flags SET enabled = $1, updated_at = now() WHERE flag_key = $2`, [
    enabled ? 1 : 0,
    flagKey,
  ]);
  return { flag_key: flagKey, enabled, description: existing.description };
}
