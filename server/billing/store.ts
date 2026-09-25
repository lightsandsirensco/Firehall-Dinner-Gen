import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";

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



function rowToUserSubscription(row: Record<string, unknown>, planIdOverride?: PlanId): UserSubscription {
  return {
    user_id: String(row.user_id),
    plan_id: planIdOverride ?? (String(row.plan_id) as PlanId),
    status: String(row.status) as SubscriptionStatus,
    source: row.source as UserSubscription["source"],
    selected_at: String(row.selected_at),
    expires_at: row.expires_at ? String(row.expires_at) : null,
    cancel_at_period_end: row.stripe_subscription_id ? Number(row.cancel_at_period_end) === 1 : undefined,
    current_period_end: row.stripe_subscription_id
      ? row.current_period_end
        ? String(row.current_period_end)
        : null
      : undefined,
  };
}

export function getUserSubscription(userId: string): UserSubscription | null {
  const d = getDb();
  const row = d.prepare(`SELECT * FROM user_subscriptions WHERE user_id = ?`).get(userId) as
    | Record<string, unknown>
    | undefined;
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
 * (see billing/account-deletion-guard.ts) — deliberately narrower than
 * getUserSubscription() so that guard only ever sees the three fields it
 * needs to decide whether a live Stripe subscription must be cancelled
 * before the account (and this row) is deleted.
 */
export function getSubscriptionInfoForAccountDeletion(
  userId: string,
): SubscriptionInfoForAccountDeletion | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT source, status, stripe_subscription_id FROM user_subscriptions WHERE user_id = ?`)
    .get(userId) as
    | { source: string; status: string; stripe_subscription_id: string | null }
    | undefined;
  if (!row) return null;
  return {
    source: row.source as UserSubscription["source"],
    status: row.status as SubscriptionStatus,
    stripeSubscriptionId: row.stripe_subscription_id,
  };
}

/** Whether this user has a Stripe customer id on file (drives the "Manage billing" portal link). */
export function userHasStripeCustomer(userId: string): boolean {
  const d = getDb();
  const row = d
    .prepare(`SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ?`)
    .get(userId) as { stripe_customer_id: string | null } | undefined;
  return Boolean(row?.stripe_customer_id);
}

export function getStripeCustomerIdForUser(userId: string): string | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ?`)
    .get(userId) as { stripe_customer_id: string | null } | undefined;
  return row?.stripe_customer_id ?? null;
}

export function getUserIdByStripeCustomerId(stripeCustomerId: string): string | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT user_id FROM user_subscriptions WHERE stripe_customer_id = ?`)
    .get(stripeCustomerId) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}

export function getUserIdByStripeSubscriptionId(stripeSubscriptionId: string): string | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT user_id FROM user_subscriptions WHERE stripe_subscription_id = ?`)
    .get(stripeSubscriptionId) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}

/**
 * Links a Stripe Customer to a user BEFORE checkout completes, so the same
 * customer is reused across checkout attempts instead of creating a new one
 * every time. Preserves any existing plan/status — this call alone never
 * grants firefighter_plus (only a completed/updated Stripe subscription does).
 */
export function linkStripeCustomer(userId: string, stripeCustomerId: string): void {
  const d = getDb();
  d.prepare(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, source, stripe_customer_id, selected_at, updated_at)
     VALUES (?, 'personal', 'active', 'self_select', ?, datetime('now'), datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       stripe_customer_id = excluded.stripe_customer_id,
       updated_at = datetime('now')`,
  ).run(userId, stripeCustomerId);
}

/**
 * Canonical write path for Stripe-sourced subscription state — called from
 * the webhook handler only. Always sets plan_id='firefighter_plus' and
 * source='stripe' since that's the only plan currently sold through Stripe.
 */
export function upsertStripeSubscription(params: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}): UserBillingState {
  const d = getDb();

  // Guard against a Stripe webhook (checkout.session.completed or
  // customer.subscription.updated) racing with account deletion. Both events
  // can resolve a user_id from Stripe object metadata alone — bypassing any
  // DB lookup — so without this check a webhook delivered during/after
  // deleteUserAccount() could resurrect a user_subscriptions row for a
  // user_id that no longer exists in `users`. Deletion already cancels any
  // live Stripe subscription first (see account-deletion-guard.ts), so
  // there is nothing left to record here — just fall through to the
  // (free-plan) default below without writing anything.
  const userExists = d.prepare(`SELECT 1 FROM users WHERE user_id = ?`).get(params.userId);
  if (userExists) {
    d.prepare(
      `INSERT INTO user_subscriptions (
         user_id, plan_id, status, source, stripe_customer_id, stripe_subscription_id,
         stripe_price_id, cancel_at_period_end, current_period_end, selected_at, updated_at
       )
       VALUES (?, 'firefighter_plus', ?, 'stripe', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         plan_id = 'firefighter_plus',
         status = excluded.status,
         source = 'stripe',
         stripe_customer_id = excluded.stripe_customer_id,
         stripe_subscription_id = excluded.stripe_subscription_id,
         stripe_price_id = excluded.stripe_price_id,
         cancel_at_period_end = excluded.cancel_at_period_end,
         current_period_end = excluded.current_period_end,
         updated_at = datetime('now')`,
    ).run(
      params.userId,
      params.status,
      params.stripeCustomerId,
      params.stripeSubscriptionId,
      params.stripePriceId,
      params.cancelAtPeriodEnd ? 1 : 0,
      params.currentPeriodEnd,
    );
  }

  return resolveUserBilling(params.userId);
}

/** Called on `customer.subscription.deleted` — the subscription is gone for good (not just past_due). */
export function markStripeSubscriptionCancelledBySubscriptionId(
  stripeSubscriptionId: string,
): UserBillingState | null {
  const userId = getUserIdByStripeSubscriptionId(stripeSubscriptionId);
  if (!userId) return null;
  const d = getDb();
  d.prepare(
    `UPDATE user_subscriptions
     SET status = 'cancelled', cancel_at_period_end = 0, updated_at = datetime('now')
     WHERE stripe_subscription_id = ?`,
  ).run(stripeSubscriptionId);
  return resolveUserBilling(userId);
}

export function hasWebhookEventBeenProcessed(eventId: string): boolean {
  const d = getDb();
  const row = d.prepare(`SELECT 1 FROM stripe_webhook_events WHERE event_id = ?`).get(eventId);
  return Boolean(row);
}

export function recordWebhookEvent(eventId: string, eventType: string): void {
  const d = getDb();
  d.prepare(
    `INSERT OR IGNORE INTO stripe_webhook_events (event_id, event_type) VALUES (?, ?)`,
  ).run(eventId, eventType);
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
      manage_billing_available: false,
    };
  }

  const sub = getUserSubscription(userId);
  // A Stripe subscription in its `past_due` dunning grace period still grants
  // access (see subscriptionGrantsAccess) — only a fully lapsed/cancelled
  // subscription falls back to the free "personal" plan.
  const subscribedPlan =
    sub && subscriptionGrantsAccess(sub.status) ? sub.plan_id : ("personal" as PlanId);

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
    manage_billing_available: sub?.source === "stripe" && userHasStripeCustomer(userId),
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

  // Self-select is limited to the free plan. firefighter_plus has no payment
  // processing yet — it's granted only via admin/dev tools (adminSetUserPlan),
  // never through this user-facing endpoint.
  if (planId !== "personal") return null;

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



  const counts: Record<PlanId, number> = { guest: 0, personal: 0, firefighter_plus: 0, hall_pro: 0 };

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

/**
 * Admin-only kill switch for `billing_global_flags` (e.g. `payments_enabled`).
 * This is the mechanism to flip real Stripe checkout on once STRIPE_* env
 * vars are configured and verified — never enabled automatically.
 */
export function adminSetGlobalFlag(
  flagKey: string,
  enabled: boolean,
): { flag_key: string; enabled: boolean; description: string | null } | null {
  const d = getDb();
  const existing = d
    .prepare(`SELECT flag_key, description FROM billing_global_flags WHERE flag_key = ?`)
    .get(flagKey) as { flag_key: string; description: string | null } | undefined;
  if (!existing) return null;
  d.prepare(
    `UPDATE billing_global_flags SET enabled = ?, updated_at = datetime('now') WHERE flag_key = ?`,
  ).run(enabled ? 1 : 0, flagKey);
  return { flag_key: flagKey, enabled, description: existing.description };
}

