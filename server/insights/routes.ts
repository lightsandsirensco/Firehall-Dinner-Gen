/**
 * Firehall Meals Personalized Insights API — Pro-only (`meal_memory`
 * entitlement, same as Meal History/Meal Memory). Non-entitled users get
 * `entitled: false` + an empty insights array — the engine is never even
 * invoked for them, so no personalized insight is ever computed (let alone
 * exposed) for a free user.
 */
import type { Express, Response } from "express";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import { logError } from "../logger.js";
import { hasFeature } from "../../shared/billing/types.js";
import { resolveUserBilling } from "../billing/store.js";
import type { InsightsResponse } from "../../shared/insights/types.js";
import { getInsightsForUser, initInsightsStore } from "./store.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initInsightsStore();
    storeReady = true;
  }
}

export function registerInsightsRoutes(app: Express): void {
  app.get("/api/insights", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      const billing = await resolveUserBilling(userId);
      const entitled = hasFeature(billing.features, "meal_memory");

      const response: InsightsResponse = entitled
        ? await getInsightsForUser(userId)
        : { entitled: false, insights: [], generated_at: new Date().toISOString() };

      return res.json(response);
    } catch (err) {
      logError("insights", "list failed", err);
      return res.status(500).json({ message: "Failed to load insights" });
    }
  });
}
