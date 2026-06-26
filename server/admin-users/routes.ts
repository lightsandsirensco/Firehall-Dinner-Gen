import type { Express, Request, Response } from "express";
import { z } from "zod";
import { logError } from "../logger.js";
import { insertAnalyticsEvents } from "../analytics/analytics-store.js";
import { subscribeToList } from "../klaviyo.js";
import { adminSetUserPlan } from "../billing/store.js";
import type { PlanId } from "../../shared/billing/types.js";
import type { AdminLeadFilter, AdminSignupFilter, AdminUserFilter } from "../../shared/admin-users/types.js";
import {
  backfillLeadsFromAnalytics,
  countEmailLeads,
  initAdminLeadsStore,
  listEmailLeads,
  markLeadKlaviyoSynced,
  recordEmailLead,
} from "./leads-store.js";
import {
  adminCreateHallInvite,
  exportLeadsCsv,
  exportSignupsCsv,
  exportUsersCsv,
  getAdminUserDetail,
  getPrimaryHallIdForUser,
  initAdminUsersStore,
  listAdminSignups,
  listAdminUsers,
  updateAdminUserMeta,
} from "./store.js";
import { startHallProTrial } from "../billing/store.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initAdminLeadsStore();
    await initAdminUsersStore();
    storeReady = true;
  }
}

const USER_FILTERS = new Set<AdminUserFilter>([
  "all",
  "new_users",
  "active_users",
  "hall_members",
  "hall_admins",
  "personal_plan",
  "hall_pro",
  "no_hall",
  "email_leads_only",
  "pilot_leads",
]);

const LEAD_FILTERS = new Set<AdminLeadFilter>([
  "all",
  "homepage",
  "generator",
  "red_lead",
  "hall_program",
  "pricing",
  "pilot",
  "shopping_list",
  "klaviyo_only",
  "converted",
  "not_converted",
  "hall_created",
]);

const SIGNUP_FILTERS = new Set<AdminSignupFilter>([
  "all",
  "registered_users",
  "email_leads_only",
  "joined_hall",
  "no_hall_yet",
  "hall_admins",
  "canteen_managers",
  "hall_pro_trial",
  "active_last_7_days",
  "inactive",
]);

function parseUserFilter(raw: unknown): AdminUserFilter {
  const key = String(raw ?? "all");
  return USER_FILTERS.has(key as AdminUserFilter) ? (key as AdminUserFilter) : "all";
}

function parseLeadFilter(raw: unknown): AdminLeadFilter {
  const key = String(raw ?? "all");
  return LEAD_FILTERS.has(key as AdminLeadFilter) ? (key as AdminLeadFilter) : "all";
}

function parseSignupFilter(raw: unknown): AdminSignupFilter {
  const key = String(raw ?? "all");
  return SIGNUP_FILTERS.has(key as AdminSignupFilter) ? (key as AdminSignupFilter) : "all";
}

function trackAdminEvent(
  req: Request,
  eventType:
    | "admin_users_viewed"
    | "admin_user_opened"
    | "admin_leads_viewed"
    | "admin_signups_viewed"
    | "admin_signup_opened"
    | "admin_signups_exported",
  metadata?: Record<string, string | number | boolean>,
): void {
  try {
    const sessionId = (req as Request & { _sessionId?: string })._sessionId ?? "admin";
    insertAnalyticsEvents([{ event_type: eventType, route: req.path, metadata }], sessionId);
  } catch {
    /* non-fatal */
  }
}

const patchUserSchema = z.object({
  internal_notes: z.string().max(8000).optional(),
  is_pilot_lead: z.boolean().optional(),
  plan_id: z.enum(["guest", "personal"]).optional(),
});

export function registerAdminUsersRoutes(app: Express): void {
  app.get("/api/admin/signups", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const filter = parseSignupFilter(req.query.filter);
      const limit = Math.min(Number(req.query.limit) || 500, 2000);
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const source = typeof req.query.source === "string" ? req.query.source : undefined;
      const data = listAdminSignups(filter, { limit, q, source });
      trackAdminEvent(req, "admin_signups_viewed", {
        filter,
        total: data.total,
        query: q ?? "",
      });
      return res.json(data);
    } catch (err) {
      logError("admin-users", "list signups failed", err);
      return res.status(500).json({ message: "Failed to load signups" });
    }
  });

  app.get("/api/admin/signups/export", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const filter = parseSignupFilter(req.query.filter);
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const source = typeof req.query.source === "string" ? req.query.source : undefined;
      const csv = exportSignupsCsv(filter, { q, source });
      trackAdminEvent(req, "admin_signups_exported", { filter, query: q ?? "" });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="signups-${filter}.csv"`);
      return res.send(csv);
    } catch (err) {
      logError("admin-users", "export signups failed", err);
      return res.status(500).json({ message: "Failed to export signups" });
    }
  });

  const signupOpenedSchema = z.object({
    email: z.string().email().optional(),
    user_id: z.string().optional(),
    row_id: z.string().optional(),
  });

  app.post("/api/admin/signups/opened", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const parsed = signupOpenedSchema.safeParse(req.body ?? {});
      trackAdminEvent(req, "admin_signup_opened", {
        email: parsed.success ? (parsed.data.email ?? "") : "",
        user_id: parsed.success ? (parsed.data.user_id ?? "") : "",
        row_id: parsed.success ? (parsed.data.row_id ?? "") : "",
      });
      return res.json({ ok: true });
    } catch (err) {
      logError("admin-users", "track signup opened failed", err);
      return res.status(500).json({ message: "Failed to track event" });
    }
  });

  app.get("/api/admin/users", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const filter = parseUserFilter(req.query.filter);
      const limit = Math.min(Number(req.query.limit) || 500, 2000);
      const data = listAdminUsers(filter, limit);
      trackAdminEvent(req, "admin_users_viewed", { filter, total: data.total });
      return res.json(data);
    } catch (err) {
      logError("admin-users", "list users failed", err);
      return res.status(500).json({ message: "Failed to load users" });
    }
  });

  app.get("/api/admin/users/export", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const filter = parseUserFilter(req.query.filter);
      const csv = exportUsersCsv(filter);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="users-${filter}.csv"`);
      return res.send(csv);
    } catch (err) {
      logError("admin-users", "export users failed", err);
      return res.status(500).json({ message: "Failed to export users" });
    }
  });

  app.get("/api/admin/users/:userId", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const userId = String(req.params.userId ?? "");
      const detail = getAdminUserDetail(userId);
      if (!detail) return res.status(404).json({ message: "User not found" });
      trackAdminEvent(req, "admin_user_opened", { user_id: userId });
      return res.json(detail);
    } catch (err) {
      logError("admin-users", "get user failed", err);
      return res.status(500).json({ message: "Failed to load user" });
    }
  });

  app.post("/api/admin/users/:userId/hall-pro-trial", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const userId = String(req.params.userId ?? "");
      const hallId = getPrimaryHallIdForUser(userId);
      if (!hallId) return res.status(400).json({ message: "User has no hall membership" });
      const subscription = startHallProTrial(hallId, userId);
      const detail = getAdminUserDetail(userId);
      if (!detail) return res.status(404).json({ message: "User not found" });
      return res.json({ ok: true, subscription, detail });
    } catch (err) {
      logError("admin-users", "hall pro trial failed", err);
      return res.status(500).json({ message: "Failed to start Hall Pro trial" });
    }
  });

  app.patch("/api/admin/users/:userId", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const userId = String(req.params.userId ?? "");
      const parsed = patchUserSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

      if (parsed.data.internal_notes !== undefined || parsed.data.is_pilot_lead !== undefined) {
        updateAdminUserMeta(userId, {
          internal_notes: parsed.data.internal_notes,
          is_pilot_lead: parsed.data.is_pilot_lead,
        });
      }

      if (parsed.data.plan_id) {
        adminSetUserPlan(userId, parsed.data.plan_id as PlanId, "active");
      }

      const detail = getAdminUserDetail(userId);
      if (!detail) return res.status(404).json({ message: "User not found" });
      return res.json(detail);
    } catch (err) {
      logError("admin-users", "patch user failed", err);
      return res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post("/api/admin/users/:userId/klaviyo", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const userId = String(req.params.userId ?? "");
      const detail = getAdminUserDetail(userId);
      if (!detail?.user.email) return res.status(400).json({ message: "User has no email" });

      await subscribeToList(detail.user.email);
      markLeadKlaviyoSynced(detail.user.email);
      return res.json({ ok: true, email: detail.user.email });
    } catch (err) {
      logError("admin-users", "klaviyo subscribe failed", err);
      return res.status(502).json({ message: "Klaviyo subscribe failed" });
    }
  });

  app.post("/api/admin/users/:userId/resend-invite", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const userId = String(req.params.userId ?? "");
      const hallId = getPrimaryHallIdForUser(userId);
      if (!hallId) return res.status(400).json({ message: "User has no hall membership" });

      const invite = adminCreateHallInvite(hallId, userId);
      if (!invite) return res.status(404).json({ message: "Hall not found" });
      return res.json(invite);
    } catch (err) {
      logError("admin-users", "resend invite failed", err);
      return res.status(500).json({ message: "Failed to create invite" });
    }
  });

  app.get("/api/admin/leads", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const filter = parseLeadFilter(req.query.filter);
      const limit = Math.min(Number(req.query.limit) || 500, 2000);
      const leads = listEmailLeads(filter, limit);
      const total = countEmailLeads(filter);
      trackAdminEvent(req, "admin_leads_viewed", { filter, total });
      return res.json({ leads, total, filter });
    } catch (err) {
      logError("admin-users", "list leads failed", err);
      return res.status(500).json({ message: "Failed to load leads" });
    }
  });

  app.get("/api/admin/leads/export", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const filter = parseLeadFilter(req.query.filter);
      const leads = listEmailLeads(filter, 5000);
      const csv = exportLeadsCsv(leads);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="leads-${filter}.csv"`);
      return res.send(csv);
    } catch (err) {
      logError("admin-users", "export leads failed", err);
      return res.status(500).json({ message: "Failed to export leads" });
    }
  });

  app.post("/api/admin/leads/backfill", async (_req: Request, res: Response) => {
    try {
      await ensureStore();
      const inserted = backfillLeadsFromAnalytics();
      return res.json({ ok: true, inserted });
    } catch (err) {
      logError("admin-users", "backfill leads failed", err);
      return res.status(500).json({ message: "Backfill failed" });
    }
  });
}

/** Record a lead from public email capture endpoints (non-fatal). */
export async function captureEmailLead(input: {
  email: string;
  source: string;
  signup_form?: string;
  klaviyo_synced?: boolean;
}): Promise<void> {
  try {
    await ensureStore();
    recordEmailLead(input);
  } catch (err) {
    logError("admin-users", "capture lead failed", err);
  }
}
