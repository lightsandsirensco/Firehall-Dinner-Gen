import type { Express, Request, Response } from "express";

import { requireCsrf } from "../csrf.js";

import { logError } from "../logger.js";

import { requireAdmin } from "../admin-auth.js";

import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";

import { insertAnalyticsEvents } from "../analytics/analytics-store.js";

import { memberHasPermission } from "../hall-membership/store.js";

import {

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

  initBillingStore,

  resolveUserBilling,

  selectUserPlan,

  startHallProTrial,

} from "./store.js";

import {

  adminSetUserPlanSchema,

  adminToggleFeatureSchema,

  adminTogglePlanSchema,

  hallBillingActionSchema,

  selectPlanSchema,

} from "../../shared/billing/schema.js";

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

    | "hall_pro_converted",

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



      const billing = adminSetUserPlan(userId, parsed.data.plan_id, parsed.data.status ?? "active");

      return res.json({ billing });

    } catch (err) {

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

}

