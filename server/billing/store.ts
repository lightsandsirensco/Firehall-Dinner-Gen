import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";

import {
  BILLING_FEATURES,
  HALL_PRO_FEATURES,
  PLAN_BASE_FEATURES,
  PLAN_DISPLAY,
  hallHasProStatus,
  isHallProFeature,
  resolveBillingFeature,
  type BillingFeature,

  type HallSubscription,

  type PlanCatalogEntry,

  type PlanFeatureFlagRow,

  type PlanId,

  type SubscriptionStatus,

  type UserBillingState,

  type UserSubscription,

} from "../../shared/billing/types.js";



let db: SqliteDatabase;



export async function initBillingStore(): Promise<void> {

  db = await getSharedLocalDb();

  seedFeatureFlags();

}



export function bindBillingDb(database: SqliteDatabase): void {

  db = database;

  seedFeatureFlags();

}



function getDb(): SqliteDatabase {

  if (!db) {

    throw new Error("Billing store not initialized — call initBillingStore() first");

  }

  return db;

}



function seedFeatureFlags(): void {

  const d = getDb();

  for (const planId of Object.keys(PLAN_BASE_FEATURES) as PlanId[]) {

    for (const feature of PLAN_BASE_FEATURES[planId]) {

      d.prepare(

        `INSERT OR IGNORE INTO plan_feature_flags (plan_id, feature_key, enabled) VALUES (?, ?, 1)`,

      ).run(planId, feature);

    }

  }

}



function isPlanEnabled(planId: PlanId): boolean {

  const d = getDb();

  const row = d.prepare(`SELECT enabled FROM plan_catalog WHERE plan_id = ?`).get(planId) as

    | { enabled: number }

    | undefined;

  return row ? Number(row.enabled) === 1 : planId === "guest";

}



function getGlobalFlag(key: string, defaultValue = true): boolean {

  const d = getDb();

  const row = d.prepare(`SELECT enabled FROM billing_global_flags WHERE flag_key = ?`).get(key) as

    | { enabled: number }

    | undefined;

  if (!row) return defaultValue;

  return Number(row.enabled) === 1;

}



function getFeatureFlagOverrides(planId: PlanId): Map<BillingFeature, boolean> {

  const d = getDb();

  const rows = d

    .prepare(`SELECT feature_key, enabled FROM plan_feature_flags WHERE plan_id = ?`)

    .all(planId) as Array<{ feature_key: string; enabled: number }>;

  const map = new Map<BillingFeature, boolean>();

  for (const row of rows) {

    if (BILLING_FEATURES.includes(row.feature_key as BillingFeature)) {

      map.set(row.feature_key as BillingFeature, Number(row.enabled) === 1);

    }

  }

  return map;

}



function buildFeatureMap(planId: PlanId): Record<BillingFeature, boolean> {

  const overrides = getFeatureFlagOverrides(planId);

  const result = {} as Record<BillingFeature, boolean>;

  for (const feature of BILLING_FEATURES) {

    const inPlan = PLAN_BASE_FEATURES[planId].includes(feature);

    const override = overrides.get(feature);

    result[feature] = inPlan && (override === undefined ? true : override);

  }

  return result;

}



function rowToHallSubscription(row: Record<string, unknown>): HallSubscription {

  return {

    hall_id: String(row.hall_id),

    plan_id: "hall_pro",

    status: String(row.status) as SubscriptionStatus,

    source: row.source as HallSubscription["source"],

    selected_at: String(row.selected_at ?? row.updated_at),

    trial_started_at: row.trial_started_at ? String(row.trial_started_at) : null,

    subscribed_by_user_id: row.subscribed_by_user_id ? String(row.subscribed_by_user_id) : null,

    updated_at: String(row.updated_at),

  };

}



export function getPlanCatalog(): PlanCatalogEntry[] {

  const d = getDb();

  const rows = d

    .prepare(`SELECT * FROM plan_catalog ORDER BY sort_order ASC`)

    .all() as Array<Record<string, unknown>>;



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



export function getUserSubscription(userId: string): UserSubscription | null {

  const d = getDb();

  const row = d.prepare(`SELECT * FROM user_subscriptions WHERE user_id = ?`).get(userId) as

    | Record<string, unknown>

    | undefined;

  if (!row) return null;

  const planId = String(row.plan_id) as PlanId;

  if (planId === "hall_pro") {

    return {

      user_id: String(row.user_id),

      plan_id: "personal",

      status: String(row.status) as SubscriptionStatus,

      source: row.source as UserSubscription["source"],

      selected_at: String(row.selected_at),

      expires_at: row.expires_at ? String(row.expires_at) : null,

    };

  }

  return {

    user_id: String(row.user_id),

    plan_id: planId,

    status: String(row.status) as SubscriptionStatus,

    source: row.source as UserSubscription["source"],

    selected_at: String(row.selected_at),

    expires_at: row.expires_at ? String(row.expires_at) : null,

  };

}



export function getHallSubscription(hallId: string): HallSubscription | null {

  const d = getDb();

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

  const d = getDb();

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

  const d = getDb();

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



function resolvePersonalPlanId(

  subscribedPlanId: PlanId | null,

  isGuest: boolean,

): PlanId {

  if (isGuest) return "guest";

  let candidate: PlanId = subscribedPlanId ?? "personal";

  if (candidate === "hall_pro") candidate = "personal";

  if (!isPlanEnabled(candidate)) {

    return isPlanEnabled("personal") ? "personal" : "guest";

  }

  return candidate;

}



export function resolveUserBilling(

  userId: string | null,

  options?: { is_guest?: boolean },

): UserBillingState {

  const catalog = getPlanCatalog();



  if (!userId || options?.is_guest) {

    return {

      plan_id: "guest",

      effective_plan_id: "guest",

      subscription: null,

      features: buildFeatureMap("guest"),

      hall_pro_hall_ids: [],

      hall_subscriptions: [],

      catalog,

    };

  }



  const sub = getUserSubscription(userId);

  const subscribedPlan =

    sub && sub.status !== "cancelled" ? sub.plan_id : ("personal" as PlanId);



  const effective = resolvePersonalPlanId(subscribedPlan, false);

  const hallSubscriptions = listUserHallSubscriptions(userId);

  const hallProHallIds = hallSubscriptions.map((s) => s.hall_id);



  return {

    plan_id: effective,

    effective_plan_id: effective,

    subscription: sub,

    features: buildFeatureMap(effective),

    hall_pro_hall_ids: hallProHallIds,

    hall_subscriptions: hallSubscriptions,

    catalog,

  };

}



export function userHasFeature(

  userId: string | null,

  feature: BillingFeature,

  options?: { hall_id?: string; is_guest?: boolean },

): boolean {

  const resolved = resolveBillingFeature(feature);

  const billing = resolveUserBilling(userId, { is_guest: options?.is_guest });



  if (isHallProFeature(resolved)) {

    const hallId = options?.hall_id;

    if (!hallId) return false;

    return billing.hall_pro_hall_ids.includes(hallId);

  }



  return billing.features[resolved];

}



export function selectUserPlan(userId: string, planId: PlanId): UserBillingState | null {

  if (planId === "guest" || planId === "hall_pro") return null;

  if (!isPlanEnabled(planId)) return null;

  if (!getGlobalFlag("monetization_enabled", true)) return null;



  const d = getDb();

  d.prepare(

    `INSERT INTO user_subscriptions (user_id, plan_id, status, source, selected_at, updated_at)

     VALUES (?, ?, 'active', 'self_select', datetime('now'), datetime('now'))

     ON CONFLICT(user_id) DO UPDATE SET

       plan_id = excluded.plan_id,

       status = 'active',

       source = 'self_select',

       selected_at = datetime('now'),

       updated_at = datetime('now')`,

  ).run(userId, planId);



  return resolveUserBilling(userId);

}



function hallSubSupportsTrialColumn(): boolean {
  const d = getDb();
  const cols = d.prepare(`PRAGMA table_info(hall_subscriptions)`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === "trial_started_at");
}

export function upsertHallSubscription(
  hallId: string,
  userId: string,
  status: SubscriptionStatus,
  source: HallSubscription["source"] = "self_select",
): HallSubscription {
  const d = getDb();
  const existing = getHallSubscription(hallId);
  const trialStartedAt =
    status === "trialing"
      ? existing?.trial_started_at ?? new Date().toISOString()
      : existing?.trial_started_at ?? null;

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



export function adminSetHallPlan(

  hallId: string,

  status: SubscriptionStatus,

  userId?: string | null,

): HallSubscription {

  return upsertHallSubscription(hallId, userId ?? "admin", status, "admin_grant");

}



export function adminSetPlanEnabled(planId: PlanId, enabled: boolean): PlanCatalogEntry | null {

  const d = getDb();

  d.prepare(`UPDATE plan_catalog SET enabled = ?, updated_at = datetime('now') WHERE plan_id = ?`).run(

    enabled ? 1 : 0,

    planId,

  );

  return getPlanCatalog().find((p) => p.plan_id === planId) ?? null;

}



export function adminSetUserPlan(

  userId: string,

  planId: PlanId,

  status: SubscriptionStatus = "active",

): UserBillingState {

  if (planId === "hall_pro") {

    throw new Error("Hall Pro is hall-scoped — use adminSetHallPlan instead");

  }



  const d = getDb();

  d.prepare(

    `INSERT INTO user_subscriptions (user_id, plan_id, status, source, updated_at)

     VALUES (?, ?, ?, 'admin_grant', datetime('now'))

     ON CONFLICT(user_id) DO UPDATE SET

       plan_id = excluded.plan_id,

       status = excluded.status,

       source = 'admin_grant',

       updated_at = datetime('now')`,

  ).run(userId, planId, status);



  d.prepare(`UPDATE users SET hall_pro_enabled = 0 WHERE user_id = ?`).run(userId);



  return resolveUserBilling(userId);

}



export function adminTogglePlanFeature(

  planId: PlanId,

  featureKey: BillingFeature,

  enabled: boolean,

): PlanFeatureFlagRow {

  const d = getDb();

  d.prepare(

    `INSERT INTO plan_feature_flags (plan_id, feature_key, enabled, updated_at)

     VALUES (?, ?, ?, datetime('now'))

     ON CONFLICT(plan_id, feature_key) DO UPDATE SET

       enabled = excluded.enabled,

       updated_at = datetime('now')`,

  ).run(planId, featureKey, enabled ? 1 : 0);



  return { plan_id: planId, feature_key: featureKey, enabled };

}



export function getAdminBillingDashboard(): {

  catalog: PlanCatalogEntry[];

  feature_flags: PlanFeatureFlagRow[];

  global_flags: Array<{ flag_key: string; enabled: boolean; description: string | null }>;

  subscription_counts: Record<PlanId, number>;

  hall_pro_hall_count: number;

} {

  const d = getDb();

  const catalog = getPlanCatalog();



  const flagRows = d

    .prepare(`SELECT plan_id, feature_key, enabled FROM plan_feature_flags ORDER BY plan_id, feature_key`)

    .all() as Array<{ plan_id: string; feature_key: string; enabled: number }>;



  const globalRows = d

    .prepare(`SELECT flag_key, enabled, description FROM billing_global_flags`)

    .all() as Array<{ flag_key: string; enabled: number; description: string | null }>;



  const counts: Record<PlanId, number> = { guest: 0, personal: 0, hall_pro: 0 };

  const countRows = d

    .prepare(

      `SELECT plan_id, COUNT(*) AS c FROM user_subscriptions WHERE status != 'cancelled' AND plan_id != 'hall_pro' GROUP BY plan_id`,

    )

    .all() as Array<{ plan_id: string; c: number }>;

  for (const row of countRows) {

    const id = row.plan_id as PlanId;

    if (id in counts && id !== "hall_pro") counts[id] = Number(row.c);

  }



  const hallProRow = d

    .prepare(

      `SELECT COUNT(*) AS c FROM hall_subscriptions WHERE plan_id = 'hall_pro' AND status IN ('active', 'trialing')`,

    )

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

  };

}



export function getBillingPublicConfig(): {

  monetization_enabled: boolean;

  payments_enabled: boolean;

} {

  return {

    monetization_enabled: getGlobalFlag("monetization_enabled", true),

    payments_enabled: getGlobalFlag("payments_enabled", false),

  };

}

