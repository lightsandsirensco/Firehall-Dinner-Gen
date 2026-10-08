/**
 * Personal schedule API — authenticated, own-data only (user id always from
 * the verified session). No entitlement gate in this phase.
 *
 *   GET    /api/schedule                  → { schedule, overrides }
 *   PUT    /api/schedule                  → create/replace the pattern
 *   DELETE /api/schedule                  → remove schedule + overrides
 *   POST   /api/schedule/overrides        → add extra / cancel / modify
 *   DELETE /api/schedule/overrides/:id
 *   GET    /api/schedule/shifts?from&to   → generated instances (ISO instants)
 *   GET    /api/schedule/next             → next (and current) shift
 *   GET    /api/schedule/meal-preferences → { preferences }
 *   PUT    /api/schedule/meal-preferences → replace meal-slot preferences
 *   GET    /api/schedule/meal-slots?from&to → [{ shift, mealSlots }]
 */
import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import { logError } from "../logger.js";
import {
  SHIFT_QUERY_MAX_DAYS,
  mealSlotPreferencesSchema,
  personalScheduleInputSchema,
  scheduleOverrideInputSchema,
} from "../../shared/schedule/schema.js";
import {
  getCurrentShift,
  getNextShift,
  getShiftsInRange,
  validateOverrideForSchedule,
} from "../../shared/schedule/engine.js";
import { mealSlotsForShift } from "../../shared/schedule/meal-slots.js";
import {
  deleteOverrideForUser,
  deleteScheduleForUser,
  getMealSlotPreferencesForUser,
  getScheduleForUser,
  saveMealSlotPreferencesForUser,
  initScheduleStore,
  listOverridesForUser,
  saveOverrideForUser,
  upsertScheduleForUser,
} from "./store.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initScheduleStore();
    storeReady = true;
  }
}

const DAY_MS = 86_400_000;

function parseInstant(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

export function registerScheduleRoutes(app: Express): void {
  app.get("/api/schedule", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      const schedule = await getScheduleForUser(userId);
      const overrides = schedule ? await listOverridesForUser(userId) : [];
      return res.json({ schedule, overrides });
    } catch (err) {
      logError("schedule", "get failed", err);
      return res.status(500).json({ message: "Failed to load schedule" });
    }
  });

  app.put("/api/schedule", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const parsed = personalScheduleInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid schedule", issues: parsed.error.issues.map((i) => i.message) });
      }
      const schedule = await upsertScheduleForUser(req._authUserId!, parsed.data);
      return res.json({ schedule });
    } catch (err) {
      logError("schedule", "save failed", err);
      return res.status(500).json({ message: "Failed to save schedule" });
    }
  });

  app.delete("/api/schedule", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const deleted = await deleteScheduleForUser(req._authUserId!);
      if (!deleted) return res.status(404).json({ message: "No schedule" });
      return res.json({ ok: true });
    } catch (err) {
      logError("schedule", "delete failed", err);
      return res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  app.post("/api/schedule/overrides", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      const schedule = await getScheduleForUser(userId);
      if (!schedule) return res.status(404).json({ message: "Set up your schedule first" });

      const parsed = scheduleOverrideInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid change", issues: parsed.error.issues.map((i) => i.message) });
      }
      const problem = validateOverrideForSchedule(schedule, parsed.data);
      if (problem) return res.status(400).json({ message: problem });

      const override = await saveOverrideForUser(userId, parsed.data);
      return res.status(201).json({ override });
    } catch (err) {
      logError("schedule", "override save failed", err);
      return res.status(500).json({ message: "Failed to save change" });
    }
  });

  app.delete(
    "/api/schedule/overrides/:id",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid change" });
        const deleted = await deleteOverrideForUser(req._authUserId!, id);
        if (!deleted) return res.status(404).json({ message: "Change not found" });
        return res.json({ ok: true });
      } catch (err) {
        logError("schedule", "override delete failed", err);
        return res.status(500).json({ message: "Failed to remove change" });
      }
    },
  );

  app.get("/api/schedule/shifts", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const from = parseInstant(req.query.from);
      const to = parseInstant(req.query.to);
      if (!from || !to || to <= from) {
        return res.status(400).json({ message: "from and to must be ISO instants with from < to" });
      }
      if (to.getTime() - from.getTime() > SHIFT_QUERY_MAX_DAYS * DAY_MS) {
        return res.status(400).json({ message: `Range may not exceed ${SHIFT_QUERY_MAX_DAYS} days` });
      }
      const userId = req._authUserId!;
      const schedule = await getScheduleForUser(userId);
      if (!schedule) return res.json({ schedule: null, shifts: [] });
      const overrides = await listOverridesForUser(userId);
      const shifts = getShiftsInRange(schedule, overrides, { from, to }, {
        includeCancelled: req.query.includeCancelled === "1",
      });
      return res.json({ timezone: schedule.timezone, shifts });
    } catch (err) {
      logError("schedule", "shifts failed", err);
      return res.status(500).json({ message: "Failed to load shifts" });
    }
  });

  app.get("/api/schedule/meal-preferences", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      return res.json({ preferences: await getMealSlotPreferencesForUser(req._authUserId!) });
    } catch (err) {
      logError("schedule", "meal preferences get failed", err);
      return res.status(500).json({ message: "Failed to load meal preferences" });
    }
  });

  app.put("/api/schedule/meal-preferences", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const parsed = mealSlotPreferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: "Invalid meal preferences", issues: parsed.error.issues.map((i) => i.message) });
      }
      const preferences = await saveMealSlotPreferencesForUser(req._authUserId!, parsed.data);
      return res.json({ preferences });
    } catch (err) {
      logError("schedule", "meal preferences save failed", err);
      return res.status(500).json({ message: "Failed to save meal preferences" });
    }
  });

  app.get("/api/schedule/meal-slots", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const from = parseInstant(req.query.from);
      const to = parseInstant(req.query.to);
      if (!from || !to || to <= from) {
        return res.status(400).json({ message: "from and to must be ISO instants with from < to" });
      }
      if (to.getTime() - from.getTime() > SHIFT_QUERY_MAX_DAYS * DAY_MS) {
        return res.status(400).json({ message: `Range may not exceed ${SHIFT_QUERY_MAX_DAYS} days` });
      }
      const userId = req._authUserId!;
      const schedule = await getScheduleForUser(userId);
      if (!schedule) return res.json({ schedule: null, shifts: [] });
      const [overrides, preferences] = await Promise.all([
        listOverridesForUser(userId),
        getMealSlotPreferencesForUser(userId),
      ]);
      const shifts = getShiftsInRange(schedule, overrides, { from, to }).map((shift) => ({
        shift,
        mealSlots: mealSlotsForShift(shift, preferences),
      }));
      return res.json({ timezone: schedule.timezone, shifts });
    } catch (err) {
      logError("schedule", "meal slots failed", err);
      return res.status(500).json({ message: "Failed to load meal slots" });
    }
  });

  app.get("/api/schedule/next", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      const schedule = await getScheduleForUser(userId);
      if (!schedule) return res.json({ current: null, next: null });
      const overrides = await listOverridesForUser(userId);
      const now = new Date();
      return res.json({
        timezone: schedule.timezone,
        current: getCurrentShift(schedule, overrides, now),
        next: getNextShift(schedule, overrides, now),
      });
    } catch (err) {
      logError("schedule", "next failed", err);
      return res.status(500).json({ message: "Failed to load next shift" });
    }
  });
}
