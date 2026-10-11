/**
 * Meal History API — Free/Premium.
 *
 * Authenticated-only. A user may only ever read/write/delete their OWN
 * history — user id always comes from the server-verified session
 * (`req._authUserId`), never from the request body. Every signed-in user
 * (`meal_history`) accumulates durable history; the tier only limits what is
 * visible/editable (shared/meal-history/access.ts). Nothing here ever deletes
 * rows because of a plan change. Deleting your own row is always allowed.
 */
import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import { logError } from "../logger.js";
import { resolveUserBilling } from "../billing/store.js";
import { resolveMealHistoryAccess } from "../../shared/meal-history/access.js";
import {
  mealHistoryCreateSchema,
  mealHistoryFeedbackSchema,
  mealHistoryImportSchema,
} from "../../shared/meal-history/schema.js";
import type { MealHistoryImportResponse } from "../../shared/meal-history/types.js";
import {
  deleteMealHistoryEntryForUser,
  importMealHistoryForUser,
  initMealHistoryStore,
  recordMealCookedForUser,
} from "./store.js";
import { buildMealHistoryList, storeMealHistoryDeps, submitFeedbackWithAccess } from "./service.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initMealHistoryStore();
    storeReady = true;
  }
}

async function accessFor(userId: string) {
  const billing = await resolveUserBilling(userId);
  return resolveMealHistoryAccess(billing.features);
}

function intQuery(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d{1,6}$/.test(value)) return undefined;
  return Number(value);
}

const SIGN_IN_MESSAGE = "Sign in to keep your meal history.";

export function registerMealHistoryRoutes(app: Express): void {
  // Visible history for the current tier (Free: last 30 days + locked count; Premium: everything + favorites).
  app.get("/api/meal-history", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      const response = await buildMealHistoryList(storeMealHistoryDeps, userId, await accessFor(userId), {
        offset: intQuery(req.query.offset),
        limit: intQuery(req.query.limit),
      });
      return res.json(response);
    } catch (err) {
      logError("meal-history", "list failed", err);
      return res.status(500).json({ message: "Failed to load meal history" });
    }
  });

  // Record an explicit "Made This" / Cook Mode completion — every signed-in user.
  app.post("/api/meal-history", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      if (!(await accessFor(userId)).canLog) {
        return res.status(403).json({ message: SIGN_IN_MESSAGE });
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

      // `meal_logged` fires client-side from the same call site; no server event to avoid double counting.
      return res.status(201).json({ ok: true, entry: result.entry });
    } catch (err) {
      logError("meal-history", "create failed", err);
      return res.status(500).json({ message: "Failed to record cooked meal" });
    }
  });

  // Backfill device-local cooked entries. Idempotent and insert-only; older
  // entries are stored for Free users too (hidden until upgrade, never dropped).
  app.post(
    "/api/meal-history/import",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const userId = req._authUserId!;
        if (!(await accessFor(userId)).canLog) {
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

  // Rating / make-again / tags / note. Free: meals inside the visible window; Premium: any meal.
  app.patch(
    "/api/meal-history/:id/feedback",
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

        const parsed = mealHistoryFeedbackSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: "Invalid feedback" });
        }

        const outcome = await submitFeedbackWithAccess(
          storeMealHistoryDeps,
          userId,
          await accessFor(userId),
          id,
          parsed.data,
        );
        if (!outcome.ok) {
          return res.status(outcome.status).json({ message: outcome.message });
        }
        return res.json({ ok: true, entry: outcome.entry });
      } catch (err) {
        logError("meal-history", "feedback failed", err);
        return res.status(500).json({ message: "Failed to save feedback" });
      }
    },
  );

  // Remove one of the signed-in user's own history entries — always allowed.
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
