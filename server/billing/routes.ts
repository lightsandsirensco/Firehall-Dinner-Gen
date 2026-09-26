import type { Express, Request, Response } from "express";

import { requireCsrf } from "../csrf.js";

import { logError } from "../logger.js";

import { requireAdmin } from "../admin-auth.js";

import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";

import { insertAnalyticsEvents } from "../analytics/analytics-store.js";

import { memberHasPermission } from "../hall-membership/store.js";

import {

  AdminGrantBlockedError,

  adminSetGlobalFlag,

  adminSetHallPlan,

  adminSetPlanEnabled,

  adminSetUserPlan,

  adminTogglePlanFeature,

  convertHallProTrial,

  enableHallPro,

  getAdminBillingDashboard,

  getBillingPublicConfig,

  getHallSubscription,

  getPlanCatalog,

  getStripeCustomerIdForUser,

  getUserIdByStripeCustomerId,

  getUserIdByStripeSubscriptionId,

  hasWebhookEventBeenProcessed,

  initBillingStore,

  linkStripeCustomer,

  markStripeSubscriptionCancelledBySubscriptionId,

  recordWebhookEvent,

  resolveUserBilling,

  selectUserPlan,

  startHallProTrial,

  upsertStripeSubscription,

} from "./store.js";

import {

  getStripeClient,

  getVerifiedPriceIdForPeriod,

  getWebhookSecret,

  mapStripeStatus,

} from "./stripe-client.js";

import { userAlreadyHasProAccess } from "./checkout-guard.js";

import { findUserByEmail, getUserById } from "../auth/auth-store.js";

import {

  adminSetGlobalFlagSchema,

  adminSetUserPlanSchema,

  adminToggleFeatureSchema,

  adminTogglePlanSchema,

  adminUserLookupSchema,

  createCheckoutSessionSchema,

  hallBillingActionSchema,

  selectPlanSchema,

} from "../../shared/billing/schema.js";

import { resolvePublicSiteOrigin } from "../seo/sitemap.js";

import type { PlanId } from "../../shared/billing/types.js";



let storeReady = false;



async function ensureStore(): Promise<void> {

  if (!storeReady) {

    await initBillingStore();

    storeReady = true;

  }

}



function trackBillingEvent(

  req: Request,

  eventType:

    | "plan_viewed"

    | "plan_selected"

    | "paywall_viewed"

    | "hall_pro_enabled"

    | "hall_pro_trial_started"

    | "hall_pro_converted"

    | "stripe_checkout_started"

    | "stripe_checkout_completed"

    | "stripe_subscription_updated"

    | "stripe_subscription_cancelled"

    | "stripe_billing_portal_opened",

  metadata?: Record<string, string | number | boolean>,

): void {

  try {

    const sessionId = (req as AuthedRequest)._sessionId;

    insertAnalyticsEvents([{ event_type: eventType, route: req.path, metadata }], sessionId);

  } catch {

    /* optional */

  }

}



export function registerBillingRoutes(app: Express): void {

  app.get("/api/billing/config", async (_req: Request, res: Response) => {

    try {

      await ensureStore();

      return res.json(getBillingPublicConfig());

    } catch (err) {

      logError("billing", "config failed", err);

      return res.status(500).json({ message: "Failed to load billing config" });

    }

  });



  app.get("/api/billing/plans", async (req: Request, res: Response) => {

    try {

      await ensureStore();

      trackBillingEvent(req, "plan_viewed");

      return res.json({

        plans: getPlanCatalog(),

        config: getBillingPublicConfig(),

      });

    } catch (err) {

      logError("billing", "plans failed", err);

      return res.status(500).json({ message: "Failed to load plans" });

    }

  });



  app.get("/api/billing/me", async (req: AuthedRequest, res: Response) => {

    try {

      await ensureStore();

      const userId = req._authUserId ?? null;

      const billing = resolveUserBilling(userId, {

        is_guest: !userId,

      });

      return res.json(billing);

    } catch (err) {

      logError("billing", "me failed", err);

      return res.status(500).json({ message: "Failed to load billing state" });

    }

  });



  app.post("/api/billing/select-plan", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {

    try {

      await ensureStore();

      const parsed = selectPlanSchema.safeParse(req.body);

      if (!parsed.success) {

        return res.status(400).json({ message: "Invalid plan — Hall Pro is enabled per hall" });

      }



      const config = getBillingPublicConfig();

      if (!config.monetization_enabled) {

        return res.status(503).json({ message: "Plan selection is temporarily unavailable" });

      }



      const billing = selectUserPlan(req._authUserId!, parsed.data.plan_id);

      if (!billing) {

        return res.status(403).json({ message: "Plan is not available" });

      }



      trackBillingEvent(req, "plan_selected", { plan_id: parsed.data.plan_id });



      return res.json({

        ok: true,

        billing,

        payment_required: false,

        message: "Plan saved — no charge during preview",

      });

    } catch (err) {

      logError("billing", "select-plan failed", err);

      return res.status(500).json({ message: "Failed to select plan" });

    }

  });



  app.get("/api/halls/:hallId/billing", requireAuth, async (req: AuthedRequest, res: Response) => {

    try {

      await ensureStore();

      const hallId = String(req.params.hallId ?? "");

      if (!memberHasPermission(hallId, req._authUserId!, "view_hall_dashboard")) {

        return res.status(403).json({ message: "Not a hall member" });

      }

      const subscription = getHallSubscription(hallId);

      return res.json({

        hall_id: hallId,

        subscription,

        active: Boolean(subscription && (subscription.status === "active" || subscription.status === "trialing")),

      });

    } catch (err) {

      logError("billing", "hall billing get failed", err);

      return res.status(500).json({ message: "Failed to load hall billing" });

    }

  });



  app.post(

    "/api/halls/:hallId/billing",

    requireCsrf,

    requireAuth,

    async (req: AuthedRequest, res: Response) => {

      try {

        await ensureStore();

        const hallId = String(req.params.hallId ?? "");

        const userId = req._authUserId!;



        if (!memberHasPermission(hallId, userId, "manage_billing")) {

          return res.status(403).json({ message: "Captain permission required to manage Hall Pro" });

        }



        const parsed = hallBillingActionSchema.safeParse(req.body);

        if (!parsed.success) {

          return res.status(400).json({ message: "Invalid billing action" });

        }



        const config = getBillingPublicConfig();

        if (!config.monetization_enabled) {

          return res.status(503).json({ message: "Hall Pro is temporarily unavailable" });

        }



        let subscription;

        switch (parsed.data.action) {

          case "start_trial":

            subscription = startHallProTrial(hallId, userId);

            trackBillingEvent(req, "hall_pro_trial_started", { hall_id: hallId });

            break;

          case "enable":

            subscription = enableHallPro(hallId, userId);

            trackBillingEvent(req, "hall_pro_enabled", { hall_id: hallId });

            break;

          case "convert":

            subscription = convertHallProTrial(hallId, userId);

            if (subscription?.status === "active") {

              trackBillingEvent(req, "hall_pro_converted", { hall_id: hallId });

            }

            break;

        }



        if (!subscription) {

          return res.status(400).json({ message: "No trial to convert" });

        }



        const billing = resolveUserBilling(userId);

        return res.json({

          ok: true,

          subscription,

          billing,

          payment_required: false,

          message: "Hall Pro updated — no charge during preview",

        });

      } catch (err) {

        logError("billing", "hall billing action failed", err);

        return res.status(500).json({ message: "Failed to update hall billing" });

      }

    },

  );



  app.post("/api/billing/paywall-viewed", requireCsrf, async (req: Request, res: Response) => {

    try {

      trackBillingEvent(req, "paywall_viewed", {

        feature: String(req.body?.feature ?? ""),

        surface: String(req.body?.surface ?? ""),

      });

      return res.json({ ok: true });

    } catch {

      return res.json({ ok: true });

    }

  });



  app.post("/api/billing/checkout", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const config = getBillingPublicConfig();
      if (!config.monetization_enabled || !config.payments_enabled) {
        return res.status(503).json({ message: "Checkout is not available yet" });
      }

      const parsed = createCheckoutSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid checkout request" });
      }

      const userId = req._authUserId!;
      const user = getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Prevent accidental duplicate subscriptions — checked server-side, not
      // just via the disabled "Current plan" button on /plans (which a
      // hand-crafted request would bypass entirely). Covers admin-granted
      // Pro too: no reason to let an already-entitled user pay again.
      const existingBilling = resolveUserBilling(userId);
      if (userAlreadyHasProAccess(existingBilling.subscription)) {
        return res.status(409).json({ message: "You already have an active Firehall Meals Pro subscription." });
      }

      const stripe = getStripeClient();
      let customerId = getStripeCustomerIdForUser(userId);
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email ?? undefined,
          metadata: { user_id: userId },
        });
        customerId = customer.id;
        linkStripeCustomer(userId, customerId);
      }

      const priceId = await getVerifiedPriceIdForPeriod(parsed.data.billing_period);
      const origin = resolvePublicSiteOrigin(req.get("host"), req.protocol);

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: userId,
        line_items: [{ price: priceId, quantity: 1 }],
        // No trial_period_days — Firehall Meals Pro bills immediately on
        // successful checkout (see PAID LAUNCH LEGAL & COMMERCIAL SURFACES:
        // the 7-day free trial was removed everywhere ahead of Stripe
        // test-mode checkout testing).
        subscription_data: {
          metadata: { user_id: userId },
        },
        metadata: {
          user_id: userId,
          billing_period: parsed.data.billing_period,
          ...(parsed.data.feature ? { feature: parsed.data.feature } : {}),
        },
        success_url: `${origin}/plans?checkout=success`,
        cancel_url: `${origin}/plans?checkout=cancelled`,
        allow_promotion_codes: true,
      });

      trackBillingEvent(req, "stripe_checkout_started", {
        plan_id: "firefighter_plus",
        billing_period: parsed.data.billing_period,
        ...(parsed.data.feature ? { feature: parsed.data.feature } : {}),
      });

      if (!session.url) {
        return res.status(500).json({ message: "Failed to create checkout session" });
      }

      return res.json({ ok: true, url: session.url });
    } catch (err) {
      logError("billing", "checkout failed", err);
      return res.status(500).json({ message: "Failed to start checkout" });
    }
  });

  app.post("/api/billing/portal", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      const customerId = getStripeCustomerIdForUser(userId);
      if (!customerId) {
        return res.status(404).json({ message: "No billing account on file" });
      }

      const stripe = getStripeClient();
      const origin = resolvePublicSiteOrigin(req.get("host"), req.protocol);
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/account`,
      });

      trackBillingEvent(req, "stripe_billing_portal_opened");

      return res.json({ ok: true, url: session.url });
    } catch (err) {
      logError("billing", "billing portal failed", err);
      return res.status(500).json({ message: "Failed to open billing portal" });
    }
  });

  // Stripe-signed webhook — intentionally NOT behind requireCsrf/requireAuth.
  // Authenticity comes from the Stripe-Signature header + STRIPE_WEBHOOK_SECRET,
  // verified via stripe.webhooks.constructEvent below. req.rawBody is captured
  // by the global express.json({ verify }) hook in server/index.ts, so the
  // exact bytes Stripe signed are available even though express.json() also
  // parses req.body for us.
  app.post("/api/billing/stripe-webhook", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const signature = req.headers["stripe-signature"];
      if (!signature || typeof signature !== "string" || !req.rawBody) {
        return res.status(400).json({ message: "Missing Stripe signature" });
      }

      const stripe = getStripeClient();
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody as Buffer,
          signature,
          getWebhookSecret(),
        );
      } catch (err) {
        logError("billing", "stripe webhook signature verification failed", err);
        return res.status(400).json({ message: "Invalid signature" });
      }

      // Idempotency — Stripe redelivers events; never double-apply one.
      if (hasWebhookEventBeenProcessed(event.id)) {
        return res.json({ ok: true, duplicate: true });
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as import("stripe").Stripe.Checkout.Session;
          const userId =
            session.client_reference_id ?? (session.metadata?.user_id as string | undefined);
          const stripeSubscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
          const stripeCustomerId =
            typeof session.customer === "string" ? session.customer : session.customer?.id;
          if (userId && stripeSubscriptionId && stripeCustomerId) {
            const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
            upsertStripeSubscription({
              userId,
              stripeCustomerId,
              stripeSubscriptionId,
              stripePriceId: subscription.items.data[0]?.price?.id ?? null,
              status: mapStripeStatus(subscription.status),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodEnd: subscription.items.data[0]?.current_period_end
                ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
                : null,
            });
            trackBillingEvent(req, "stripe_checkout_completed", { plan_id: "firefighter_plus" });
          } else {
            logError(
              "billing",
              "stripe checkout.session.completed missing user/subscription/customer linkage",
              new Error(`session ${session.id}`),
            );
          }
          break;
        }
        case "customer.subscription.updated": {
          const subscription = event.data.object as import("stripe").Stripe.Subscription;
          const stripeCustomerId =
            typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
          const userId =
            (subscription.metadata?.user_id as string | undefined) ??
            getUserIdByStripeCustomerId(stripeCustomerId) ??
            getUserIdByStripeSubscriptionId(subscription.id);
          if (userId) {
            upsertStripeSubscription({
              userId,
              stripeCustomerId,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price?.id ?? null,
              status: mapStripeStatus(subscription.status),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodEnd: subscription.items.data[0]?.current_period_end
                ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
                : null,
            });
            trackBillingEvent(req, "stripe_subscription_updated", { status: subscription.status });
          }
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as import("stripe").Stripe.Subscription;
          markStripeSubscriptionCancelledBySubscriptionId(subscription.id);
          trackBillingEvent(req, "stripe_subscription_cancelled");
          break;
        }
        default:
          // Other event types (invoices, payment methods, etc.) are covered
          // indirectly by customer.subscription.updated, which Stripe also
          // fires on payment-failure status transitions (e.g. → past_due).
          break;
      }

      recordWebhookEvent(event.id, event.type);
      return res.json({ ok: true });
    } catch (err) {
      logError("billing", "stripe webhook handling failed", err);
      // 500 so Stripe retries — safe because of the idempotency check above.
      return res.status(500).json({ message: "Webhook handling failed" });
    }
  });


  app.get("/api/admin/billing", requireAdmin, async (_req: Request, res: Response) => {

    try {

      await ensureStore();

      return res.json(getAdminBillingDashboard());

    } catch (err) {

      logError("billing", "admin dashboard failed", err);

      return res.status(500).json({ message: "Failed to load billing admin" });

    }

  });



  app.patch("/api/admin/billing/plans/:planId", requireAdmin, async (req: Request, res: Response) => {

    try {

      await ensureStore();

      const planId = String(req.params.planId ?? "") as PlanId;

      const parsed = adminTogglePlanSchema.safeParse(req.body);

      if (!parsed.success) {

        return res.status(400).json({ message: "Invalid payload" });

      }



      const plan = adminSetPlanEnabled(planId, parsed.data.enabled);

      if (!plan) {

        return res.status(404).json({ message: "Plan not found" });

      }



      return res.json({ plan, dashboard: getAdminBillingDashboard() });

    } catch (err) {

      logError("billing", "admin toggle plan failed", err);

      return res.status(500).json({ message: "Failed to update plan" });

    }

  });



  app.patch(

    "/api/admin/billing/plans/:planId/features/:featureKey",

    requireAdmin,

    async (req: Request, res: Response) => {

      try {

        await ensureStore();

        const parsed = adminToggleFeatureSchema.safeParse({

          plan_id: req.params.planId,

          feature_key: req.params.featureKey,

          enabled: req.body?.enabled,

        });

        if (!parsed.success) {

          return res.status(400).json({ message: "Invalid feature toggle" });

        }



        const row = adminTogglePlanFeature(

          parsed.data.plan_id,

          parsed.data.feature_key,

          parsed.data.enabled,

        );

        return res.json({ feature: row, dashboard: getAdminBillingDashboard() });

      } catch (err) {

        logError("billing", "admin toggle feature failed", err);

        return res.status(500).json({ message: "Failed to update feature" });

      }

    },

  );



  /**
   * Read-only user billing lookup by email — lets the admin console find a
   * real user (rather than requiring a hand-typed internal user_id) before
   * granting/inspecting their plan. Deliberately returns only the fields
   * needed to operate billing (no profile data, no raw Stripe ids).
   */

  app.get("/api/admin/billing/users/lookup", requireAdmin, async (req: Request, res: Response) => {

    try {

      await ensureStore();

      const parsed = adminUserLookupSchema.safeParse({ email: req.query.email });

      if (!parsed.success) {

        return res.status(400).json({ message: "Provide ?email=" });

      }

      const user = findUserByEmail(parsed.data.email);

      if (!user) {

        return res.status(404).json({ message: "No user found with that email" });

      }

      const billing = resolveUserBilling(user.user_id);

      return res.json({

        user_id: user.user_id,

        email: user.email,

        created_at: user.created_at,

        last_login_at: user.last_login_at,

        effective_plan_id: billing.effective_plan_id,

        subscription: billing.subscription

          ? {

              plan_id: billing.subscription.plan_id,

              status: billing.subscription.status,

              source: billing.subscription.source,

              cancel_at_period_end: billing.subscription.cancel_at_period_end ?? null,

              current_period_end: billing.subscription.current_period_end ?? null,

            }

          : null,

        manage_billing_available: billing.manage_billing_available,

      });

    } catch (err) {

      logError("billing", "admin user lookup failed", err);

      return res.status(500).json({ message: "Lookup failed" });

    }

  });

  app.patch("/api/admin/billing/users/:userId", requireAdmin, async (req: Request, res: Response) => {

    try {

      await ensureStore();

      const userId = String(req.params.userId ?? "");

      const parsed = adminSetUserPlanSchema.safeParse(req.body);

      if (!parsed.success) {

        return res.status(400).json({ message: "Invalid user plan payload" });

      }

      if (parsed.data.plan_id === "hall_pro") {

        return res.status(400).json({ message: "Hall Pro is hall-scoped — use hall admin tools" });

      }

      // Grants against a nonexistent user silently created an orphaned
      // user_subscriptions row before (SQLite foreign_keys enforcement is
      // off in this codebase) — verify the user is real first so a typo'd
      // user_id fails loudly instead of looking like a successful grant.

      if (!getUserById(userId)) {

        return res.status(404).json({ message: "User not found" });

      }

      const billing = adminSetUserPlan(userId, parsed.data.plan_id, parsed.data.status ?? "active");

      return res.json({ billing });

    } catch (err) {

      if (err instanceof AdminGrantBlockedError) {

        return res.status(409).json({ message: err.message });

      }

      logError("billing", "admin set user plan failed", err);

      return res.status(500).json({ message: "Failed to set user plan" });

    }

  });


  app.patch("/api/admin/billing/halls/:hallId", requireAdmin, async (req: Request, res: Response) => {

    try {

      await ensureStore();

      const hallId = String(req.params.hallId ?? "");

      const status = String(req.body?.status ?? "active") as "active" | "trialing" | "cancelled";

      const subscription = adminSetHallPlan(hallId, status);

      return res.json({ subscription, dashboard: getAdminBillingDashboard() });

    } catch (err) {

      logError("billing", "admin set hall plan failed", err);

      return res.status(500).json({ message: "Failed to set hall plan" });

    }

  });

  app.patch(
    "/api/admin/billing/flags/:flagKey",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        await ensureStore();
        const flagKey = String(req.params.flagKey ?? "");
        const parsed = adminSetGlobalFlagSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: "Invalid payload" });
        }
        const flag = adminSetGlobalFlag(flagKey, parsed.data.enabled);
        if (!flag) {
          return res.status(404).json({ message: "Unknown flag" });
        }
        return res.json({ flag, dashboard: getAdminBillingDashboard() });
      } catch (err) {
        logError("billing", "admin set global flag failed", err);
        return res.status(500).json({ message: "Failed to update flag" });
      }
    },
  );
}

