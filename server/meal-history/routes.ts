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
import {
  mealHistoryCreateSchema,
  mealHistoryFeedbackSchema,
  mealHistoryImportSchema,
} from "../../shared/meal-history/schema.js";
import type { MealHistoryImportResponse, MealHistoryListResponse } from "../../shared/meal-history/types.js";
import {
  deleteMealHistoryEntryForUser,
  importMealHistoryForUser,
  initMealHistoryStore,
  listMealHistoryForUser,
  recordMealCookedForUser,
  submitMealFeedbackForUser,
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

      const { recipe_slug, client_entry_id, ...context } = parsed.data;
      const result = await recordMealCookedForUser(userId, recipe_slug, context, client_entry_id);
      if (!result.ok) {
        return res.status(400).json({ message: "Recipe not found" });
      }

      // No separate server-side analytics event here — the existing
      // `meal_cooked`/`meal_logged` client events fire from the same
      // logging call site (start-cooking-button.tsx) — a second,
      // server-side event for the identical moment would double-count.
      return res.status(201).json({ ok: true, entry: result.entry });
    } catch (err) {
      logError("meal-history", "create failed", err);
      return res.status(500).json({ message: "Failed to record cooked meal" });
    }
  });

  // Backfill device-local cooked entries into the canonical table. Idempotent
  // (keyed by client_entry_id), insert-only, same `meal_memory` gate as a
  // live write. Non-entitled users get `entitled: false` and nothing is
  // written, so the client keeps its local copy and retries after upgrade.
  app.post(
    "/api/meal-history/import",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const userId = req._authUserId!;
        const billing = await resolveUserBilling(userId);
        if (!hasFeature(billing.features, "meal_memory")) {
          const response: MealHistoryImportResponse = { entitled: false, imported: 0, duplicates: 0, skipped: 0 };
          return res.json(response);
        }

        const parsed = mealHistoryImportSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: "Invalid history import" });
        }

        const result = await importMealHistoryForUser(userId, parsed.data.entries);
        if (!result.ok) {
          return res.status(503).json({ message: "History import is not available yet" });
        }
        const response: MealHistoryImportResponse = {
          entitled: true,
          imported: result.imported,
          duplicates: result.duplicates,
          skipped: result.skipped,
        };
        return res.json(response);
      } catch (err) {
        logError("meal-history", "import failed", err);
        return res.status(500).json({ message: "Failed to import meal history" });
      }
    },
  );

  // Post-meal crew feedback — a partial update onto a history row the user
  // already owns. Every field optional; safe to call multiple times to edit
  // rating/note later. Same `meal_memory` gate as creating the row itself.
  app.patch(
    "/api/meal-history/:id/feedback",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const userId = req._authUserId!;
        const billing = await resolveUserBilling(userId);
        if (!hasFeature(billing.features, "meal_memory")) {
          return res.status(403).json({
            message: "Firehall Meals Pro remembers your cooked meals across devices.",
          });
        }

        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ message: "Invalid history entry" });
        }

        const parsed = mealHistoryFeedbackSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: "Invalid feedback" });
        }

        const result = await submitMealFeedbackForUser(userId, id, parsed.data);
        if (!result.ok) {
          return res.status(404).json({ message: "History entry not found" });
        }

        return res.json({ ok: true, entry: result.entry });
      } catch (err) {
        logError("meal-history", "feedback failed", err);
        return res.status(500).json({ message: "Failed to save feedback" });
      }
    },
  );

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
