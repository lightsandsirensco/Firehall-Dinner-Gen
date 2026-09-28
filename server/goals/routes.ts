/**
 * Firehall Meals Goals + Progress (V1) API. Gated behind the `meal_memory`
 * entitlement — Goals + Progress has no data to show without cooked-meal
 * history. User id always comes from the server-verified session.
 */
import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import { logError } from "../logger.js";
import { hasFeature } from "../../shared/billing/types.js";
import { resolveUserBilling } from "../billing/store.js";
import { setGoalSchema } from "../../shared/goals/schema.js";
import { GOAL_TYPES, type GoalType } from "../../shared/goals/types.js";
import { getGoalsForUser, initGoalsStore, removeUserGoal, setUserGoal } from "./store.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initGoalsStore();
    storeReady = true;
  }
}

const LOCKED_RESPONSE = {
  entitled: false,
  month_key: "",
  available_goal_types: [],
  active: [],
  completed: [],
  summary: null,
};

export function registerGoalsRoutes(app: Express): void {
  app.get("/api/goals", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      const billing = await resolveUserBilling(userId);
      if (!hasFeature(billing.features, "meal_memory")) {
        return res.json(LOCKED_RESPONSE);
      }
      return res.json(await getGoalsForUser(userId));
    } catch (err) {
      logError("goals", "list failed", err);
      return res.status(500).json({ message: "Failed to load goals" });
    }
  });

  app.post("/api/goals", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      const billing = await resolveUserBilling(userId);
      if (!hasFeature(billing.features, "meal_memory")) {
        return res.status(403).json({ message: "Firehall Meals Pro unlocks Goals + Progress." });
      }
      const parsed = setGoalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid goal" });
      }
      await setUserGoal(userId, parsed.data.goal_type, parsed.data.target);
      return res.status(201).json(await getGoalsForUser(userId));
    } catch (err) {
      logError("goals", "set failed", err);
      return res.status(500).json({ message: "Failed to save goal" });
    }
  });

  app.delete(
    "/api/goals/:goalType",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const userId = req._authUserId!;
        const goalType = String(req.params.goalType ?? "");
        if (!(GOAL_TYPES as readonly string[]).includes(goalType)) {
          return res.status(400).json({ message: "Unknown goal" });
        }
        await removeUserGoal(userId, goalType as GoalType);
        return res.json(await getGoalsForUser(userId));
      } catch (err) {
        logError("goals", "delete failed", err);
        return res.status(500).json({ message: "Failed to remove goal" });
      }
    },
  );
}
