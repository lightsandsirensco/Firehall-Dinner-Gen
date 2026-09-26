/**
 * Firehall Meals Pro V1 Feature 3 — Meal Memory API.
 *
 * Authenticated-only. A user may only ever read/write/delete their OWN
 * history — user id always comes from the server-verified session
 * (`req._authUserId`), never from the request body. The durable
 * cross-device read/write paths are gated behind the `meal_memory`
 * entitlement; deleting your own existing row is always allowed (privacy/
 * control action, not a paid-feature consumption).
 */
import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import { logError } from "../logger.js";
import { hasFeature } from "../../shared/billing/types.js";
import { resolveUserBilling } from "../billing/store.js";
import { mealHistoryCreateSchema } from "../../shared/meal-history/schema.js";
import type { MealHistoryListResponse } from "../../shared/meal-history/types.js";
import {
  deleteMealHistoryEntryForUser,
  initMealHistoryStore,
  listMealHistoryForUser,
  recordMealCookedForUser,
} from "./store.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initMealHistoryStore();
    storeReady = true;
  }
}

export function registerMealHistoryRoutes(app: Express): void {
  // Retrieve the signed-in user's own recent cooked-meal history.
  // Non-entitled users get `entitled: false` + an empty list (not an error) —
  // keeps the client's empty/upsell state simple and consistent with GET
  // never leaking whether history rows exist for a downgraded former-Pro user.
  app.get("/api/meal-history", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      const billing = await resolveUserBilling(userId);
      const entitled = hasFeature(billing.features, "meal_memory");
      const response: MealHistoryListResponse = {
        entitled,
        entries: entitled ? await listMealHistoryForUser(userId, 20) : [],
      };
      return res.json(response);
    } catch (err) {
      logError("meal-history", "list failed", err);
      return res.status(500).json({ message: "Failed to load meal history" });
    }
  });

  // Record an explicit "Mark as Cooked" event. Pro-only — the client only
  // calls this when entitled, but the entitlement check here is the real
  // gate (defense against a hand-crafted request from a non-Pro session).
  app.post("/api/meal-history", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      const billing = await resolveUserBilling(userId);
      if (!hasFeature(billing.features, "meal_memory")) {
        return res.status(403).json({
          message: "Firehall Meals Pro remembers your cooked meals across devices.",
        });
      }

      const parsed = mealHistoryCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid recipe" });
      }

      const result = await recordMealCookedForUser(userId, parsed.data.recipe_slug);
      if (!result.ok) {
        return res.status(400).json({ message: "Recipe not found" });
      }

      // No separate server-side analytics event here — the existing
      // `meal_cooked` client event (trackMealCooked, fired from the same
      // Mark-as-Cooked completion in start-cooking-button.tsx) already
      // covers this per section 17's "reuse existing pattern" — a second,
      // server-side event for the identical moment would double-count.
      return res.status(201).json({ ok: true, entry: result.entry });
    } catch (err) {
      logError("meal-history", "create failed", err);
      return res.status(500).json({ message: "Failed to record cooked meal" });
    }
  });

  // Remove one of the signed-in user's own history entries — always
  // allowed regardless of current entitlement (removing your own data is a
  // privacy/control action, not a paid-feature consumption).
  app.delete(
    "/api/meal-history/:id",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const userId = req._authUserId!;
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ message: "Invalid history entry" });
        }

        const deleted = await deleteMealHistoryEntryForUser(userId, id);
        if (!deleted) {
          return res.status(404).json({ message: "History entry not found" });
        }

        return res.json({ ok: true });
      } catch (err) {
        logError("meal-history", "delete failed", err);
        return res.status(500).json({ message: "Failed to remove history entry" });
      }
    },
  );
}
