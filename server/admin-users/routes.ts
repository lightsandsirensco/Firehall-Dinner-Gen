import type { Express, Request, Response } from "express";
import { z } from "zod";
import { logError } from "../logger.js";
import { getMagicLinkFunnelStats, insertAnalyticsEvents } from "../analytics/analytics-store.js";
import { subscribeToList } from "../klaviyo.js";
import { adminSetUserPlan, startHallProTrial } from "../billing/store.js";
import type { PlanId } from "../../shared/billing/types.js";
import type {
  AdminLeadFilter,
  AdminUserDetail,
  EmailDirectoryFilter,
  ExternalContactFilter,
  FounderLeadFilters,
  FounderLeadSortKey,
  FounderLeadStatus,
  RegisteredUserFilter,
} from "../../shared/admin-users/types.js";
import {
  backfillLeadsFromAnalytics,
  countEmailLeads,
  initAdminLeadsStore,
  listEmailLeads,
  markLeadKlaviyoSynced,
  normalizeLeadSource,
  recordEmailLead,
} from "./leads-store.js";
import { hasMarketingConsent, recordConsentOptIn } from "../marketing-consent/store.js";
import {
  bindFounderLeadsDb,
  deleteTestAccount,
  exportFounderLeadsCsv,
  exportFounderLeadsExcel,
  getFounderLeadDetail,
  initFounderLeadsStore,
  listFounderLeads,
  listHallNamesForFilter,
  markTestAccount,
} from "./founder-leads.js";
import {
  adminCreateHallInvite,
  exportLeadsCsv,
  getAdminUserDetail,
  getPrimaryHallIdForUser,
  initAdminUsersStore,
  updateAdminUserMeta,
} from "./store.js";
import {
  emailDirectoryCsv,
  getLeadCapturesForEmail,
  getRegisteredUser,
  queryEmailDirectory,
  queryRegisteredUsers,
  recordEmailLeadCapture,
  registeredUsersCsv,
} from "./email-directory.js";
import { externalContactsCsv, queryExternalContacts } from "./klaviyo-contacts.js";
import { pgOne } from "../db/pg-sql.js";
import { createAuthSession, getAuthCookieName } from "../auth/auth-store.js";
import { getSharedLocalDb } from "../sqlite.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initAdminLeadsStore();
    await initAdminUsersStore();
    await initFounderLeadsStore();
    bindFounderLeadsDb(await getSharedLocalDb());
    storeReady = true;
  }
}

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

const SORT_KEYS = new Set<FounderLeadSortKey>([
  "email",
  "name",
  "signup_date",
  "last_seen",
  "source",
  "plan",
  "login_count",
  "last_login",
  "recipes_saved",
  "meals_generated",
  "votes_cast",
  "shopping_lists_created",
  "status",
]);

function parseLeadFilter(raw: unknown): AdminLeadFilter {
  const key = String(raw ?? "all");
  return LEAD_FILTERS.has(key as AdminLeadFilter) ? (key as AdminLeadFilter) : "all";
}

const REGISTERED_USER_FILTERS = new Set<RegisteredUserFilter>([
  "all",
  "new_7d",
  "active_30d",
  "pro",
  "free",
  "subscribed",
  "not_subscribed",
]);

const DIRECTORY_FILTERS = new Set<EmailDirectoryFilter>([
  "all",
  "registered_users",
  "marketing_subscribers",
  "other_emails",
  "unsubscribed",
]);

function parseRegisteredUserFilter(raw: unknown): RegisteredUserFilter {
  const key = String(raw ?? "all");
  return REGISTERED_USER_FILTERS.has(key as RegisteredUserFilter) ? (key as RegisteredUserFilter) : "all";
}

function parseDirectoryFilter(raw: unknown): EmailDirectoryFilter {
  const key = String(raw ?? "all");
  return DIRECTORY_FILTERS.has(key as EmailDirectoryFilter) ? (key as EmailDirectoryFilter) : "all";
}

const EXTERNAL_FILTERS = new Set<ExternalContactFilter>(["all", "klaviyo_subscribed", "not_klaviyo_subscribed", "also_lights_sirens"]);

function parseExternalFilter(raw: unknown): ExternalContactFilter {
  const key = String(raw ?? "all");
  return EXTERNAL_FILTERS.has(key as ExternalContactFilter) ? (key as ExternalContactFilter) : "all";
}

function queryString(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 200) : undefined;
}

/**
 * Identity, plan and consent come from Postgres. Hall memberships, activity and
 * internal notes still live in the local SQLite cache and are merged in when present.
 */
async function buildAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const user = await getRegisteredUser(userId);
  if (!user) return null;
  const local = getAdminUserDetail(userId);
  const profile = await pgOne<Record<string, unknown>>(
    `SELECT first_name, last_name, display_name, department, hall_name, shift_label, crew_size
     FROM user_profiles WHERE user_id = $1`,
    [userId],
  );
  const leads = user.email ? await getLeadCapturesForEmail(user.email) : [];
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);

  return {
    user: {
      user_id: user.user_id,
      name: user.name ?? user.email ?? user.user_id,
      email: user.email,
      signup_date: user.signup_date,
      last_active: user.last_login,
      plan: user.plan === "pro" ? "firefighter_plus" : "personal",
      hall_pro: local?.user.hall_pro ?? false,
      hall_name: local?.user.hall_name ?? null,
      shift: local?.user.shift ?? null,
      hall_role: local?.user.hall_role ?? null,
      meals_generated: user.meals_cooked,
      votes_created: local?.user.votes_created ?? 0,
      saved_recipes: user.recipes_saved,
      email_capture_source: leads[0]?.source ?? null,
      is_pilot_lead: local?.is_pilot_lead ?? false,
      auth_provider: user.auth_provider,
      is_guest: false,
    },
    profile: profile
      ? {
          first_name: str(profile.first_name),
          last_name: str(profile.last_name),
          display_name: str(profile.display_name),
          department: str(profile.department),
          profile_hall_name: str(profile.hall_name),
          shift_label: str(profile.shift_label),
          crew_size: profile.crew_size == null ? null : Number(profile.crew_size),
        }
      : null,
    memberships: local?.memberships ?? [],
    billing: {
      personal_plan: user.plan === "pro" ? "firefighter_plus" : "personal",
      personal_status: user.plan_detail,
      hall_pro_halls: local?.billing.hall_pro_halls ?? [],
    },
    saved_recipes: local?.saved_recipes ?? [],
    activity: local?.activity ?? [],
    klaviyo: {
      on_list: user.klaviyo_sync === "sent",
      lead_sources: leads.map((l) => l.source),
      last_lead_at: leads[0]?.last_submitted_at ?? null,
    },
    internal_notes: local?.internal_notes ?? "",
    is_pilot_lead: local?.is_pilot_lead ?? false,
  };
}

function parseFounderFilters(query: Request["query"]): FounderLeadFilters {
  const sortRaw = typeof query.sort === "string" ? query.sort : "signup_date";
  const sort = SORT_KEYS.has(sortRaw as FounderLeadSortKey)
    ? (sortRaw as FounderLeadSortKey)
    : "signup_date";
  const statusRaw = typeof query.status === "string" ? query.status : null;
  const status =
    statusRaw === "New" || statusRaw === "Active" || statusRaw === "Dormant"
      ? (statusRaw as FounderLeadStatus)
      : null;
  const planRaw = typeof query.plan === "string" ? query.plan : null;
  const plan =
    planRaw === "free" || planRaw === "firefighter_plus" || planRaw === "hall_pro" ? planRaw : null;
  const verifiedRaw = typeof query.verified === "string" ? query.verified : null;
  const verified = verifiedRaw === "yes" || verifiedRaw === "no" ? verifiedRaw : null;
  const accountRaw = typeof query.account === "string" ? query.account : null;
  const account = accountRaw === "yes" || accountRaw === "no" ? accountRaw : null;

  return {
    q: typeof query.q === "string" ? query.q : undefined,
    source: typeof query.source === "string" && query.source ? query.source : null,
    plan,
    hall: typeof query.hall === "string" && query.hall ? query.hall : null,
    verified,
    status,
    account,
    signup_from: typeof query.signup_from === "string" ? query.signup_from : null,
    signup_to: typeof query.signup_to === "string" ? query.signup_to : null,
    last_login_from: typeof query.last_login_from === "string" ? query.last_login_from : null,
    last_login_to: typeof query.last_login_to === "string" ? query.last_login_to : null,
    sort,
    sort_dir: query.sort_dir === "asc" ? "asc" : "desc",
    page: Math.max(Number(query.page) || 1, 1),
    page_size: Math.min(Number(query.page_size) || 50, 500),
  };
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

function authCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export function registerAdminUsersRoutes(app: Express): void {
  app.get("/api/admin/signups", async (req: Request, res: Response) => {
    try {
      const filter = parseDirectoryFilter(req.query.filter);
      const q = queryString(req.query.q);
      const data = await queryEmailDirectory({
        filter,
        q,
        source: queryString(req.query.source),
        page: Number(req.query.page) || 1,
        page_size: Number(req.query.page_size) || 50,
      });
      trackAdminEvent(req, "admin_signups_viewed", { filter, total: data.total, query: q ?? "" });
      let funnel;
      try {
        funnel = getMagicLinkFunnelStats("30d");
      } catch {
        funnel = undefined;
      }
      return res.json({ ...data, magic_link_funnel: funnel });
    } catch (err) {
      logError("admin-users", "list signups failed", err);
      return res.status(500).json({ message: "Failed to load signups" });
    }
  });

  app.get("/api/admin/signups/export", async (req: Request, res: Response) => {
    try {
      const filter = parseDirectoryFilter(req.query.filter);
      const q = queryString(req.query.q);
      const data = await queryEmailDirectory({ filter, q, source: queryString(req.query.source), all: true });
      const csv = emailDirectoryCsv(data.emails);
      trackAdminEvent(req, "admin_signups_exported", { filter, query: q ?? "", total: data.total });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="signups-${filter}.csv"`);
      return res.send(csv);
    } catch (err) {
      logError("admin-users", "export signups failed", err);
      return res.status(500).json({ message: "Failed to export signups" });
    }
  });

  app.get("/api/admin/signups/external", async (req: Request, res: Response) => {
    try {
      const filter = parseExternalFilter(req.query.filter);
      const data = await queryExternalContacts({
        filter,
        q: queryString(req.query.q),
        page: Number(req.query.page) || 1,
        page_size: Number(req.query.page_size) || 50,
        refresh: req.query.refresh === "1",
      });
      return res.json(data);
    } catch (err) {
      logError("admin-users", "list external contacts failed", err);
      return res.status(500).json({ message: "Failed to load external contacts" });
    }
  });

  app.get("/api/admin/signups/external/export", async (req: Request, res: Response) => {
    try {
      const filter = parseExternalFilter(req.query.filter);
      const data = await queryExternalContacts({ filter, q: queryString(req.query.q), all: true });
      if (!data.available) return res.status(503).json({ message: data.unavailable_reason ?? "Klaviyo unavailable" });
      trackAdminEvent(req, "admin_signups_exported", { filter: `external_${filter}`, total: data.total });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="external-klaviyo-contacts-${filter}.csv"`);
      return res.send(externalContactsCsv(data.contacts));
    } catch (err) {
      logError("admin-users", "export external contacts failed", err);
      return res.status(500).json({ message: "Failed to export external contacts" });
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
      const filter = parseRegisteredUserFilter(req.query.filter);
      const data = await queryRegisteredUsers({
        filter,
        q: queryString(req.query.q),
        page: Number(req.query.page) || 1,
        page_size: Number(req.query.page_size) || 50,
      });
      trackAdminEvent(req, "admin_users_viewed", { filter, total: data.total });
      return res.json(data);
    } catch (err) {
      logError("admin-users", "list users failed", err);
      return res.status(500).json({ message: "Failed to load users" });
    }
  });

  app.get("/api/admin/users/export", async (req: Request, res: Response) => {
    try {
      const filter = parseRegisteredUserFilter(req.query.filter);
      const data = await queryRegisteredUsers({ filter, q: queryString(req.query.q), all: true });
      const csv = registeredUsersCsv(data.users);
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
      const detail = await buildAdminUserDetail(userId);
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
      const detail = await buildAdminUserDetail(userId);
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
        try {
          updateAdminUserMeta(userId, {
            internal_notes: parsed.data.internal_notes,
            is_pilot_lead: parsed.data.is_pilot_lead,
          });
        } catch (err) {
          if (err instanceof Error && err.message === "User not found") {
            return res.status(409).json({
              message: "Notes and pilot flags are not available for accounts created after the Postgres migration yet.",
            });
          }
          throw err;
        }
      }

      if (parsed.data.plan_id) {
        await adminSetUserPlan(userId, parsed.data.plan_id as PlanId, "active");
      }

      const detail = await buildAdminUserDetail(userId);
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
      const detail = await buildAdminUserDetail(userId);
      if (!detail?.user.email) return res.status(400).json({ message: "User has no email" });
      if (!(await hasMarketingConsent(detail.user.email))) {
        return res.status(409).json({ message: "This user has not opted in to marketing email." });
      }

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

  app.post("/api/admin/users/:userId/impersonate", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const userId = String(req.params.userId ?? "");
      const detail = await buildAdminUserDetail(userId);
      if (!detail) return res.status(404).json({ message: "User not found" });
      const session = await createAuthSession(userId, false);
      res.cookie(getAuthCookieName(), session.token, authCookieOptions());
      return res.json({ ok: true, user_id: userId, redirect: "/me/profile" });
    } catch (err) {
      logError("admin-users", "impersonate failed", err);
      return res.status(500).json({ message: "Failed to impersonate user" });
    }
  });

  app.post("/api/admin/users/:userId/mark-test", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const userId = String(req.params.userId ?? "");
      const isTest = req.body?.is_test_account !== false;
      markTestAccount(userId, Boolean(isTest));
      return res.json({ ok: true, user_id: userId, is_test_account: Boolean(isTest) });
    } catch (err) {
      logError("admin-users", "mark test failed", err);
      return res.status(500).json({ message: err instanceof Error ? err.message : "Failed" });
    }
  });

  app.delete("/api/admin/users/:userId/test-account", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const userId = String(req.params.userId ?? "");
      deleteTestAccount(userId);
      return res.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      logError("admin-users", "delete test failed", err);
      return res.status(400).json({ message: msg });
    }
  });

  app.get("/api/admin/leads", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      if (req.query.legacy === "1") {
        const filter = parseLeadFilter(req.query.filter);
        const limit = Math.min(Number(req.query.limit) || 500, 2000);
        const leads = listEmailLeads(filter, limit);
        const total = countEmailLeads(filter);
        trackAdminEvent(req, "admin_leads_viewed", { filter, total });
        return res.json({ leads, total, filter });
      }

      const filters = parseFounderFilters(req.query);
      const data = listFounderLeads(filters);
      trackAdminEvent(req, "admin_leads_viewed", {
        filter: "founder",
        total: data.total,
        query: filters.q ?? "",
      });
      return res.json({
        ...data,
        halls: listHallNamesForFilter(),
      });
    } catch (err) {
      logError("admin-users", "list leads failed", err);
      return res.status(500).json({ message: "Failed to load leads" });
    }
  });

  app.get("/api/admin/leads/export", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const filters = parseFounderFilters(req.query);
      const format = typeof req.query.format === "string" ? req.query.format : "csv";

      if (format === "excel" || format === "xls" || format === "xlsx") {
        const xml = exportFounderLeadsExcel(filters);
        res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="founder-leads.xls"`);
        return res.send(xml);
      }

      if (req.query.legacy === "1") {
        const filter = parseLeadFilter(req.query.filter);
        const leads = listEmailLeads(filter, 5000);
        const csv = exportLeadsCsv(leads);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="leads-${filter}.csv"`);
        return res.send(csv);
      }

      const csv = exportFounderLeadsCsv(filters);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="founder-leads.csv"`);
      return res.send(csv);
    } catch (err) {
      logError("admin-users", "export leads failed", err);
      return res.status(500).json({ message: "Failed to export leads" });
    }
  });

  app.get("/api/admin/leads/detail", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const email = typeof req.query.email === "string" ? req.query.email : "";
      if (!email.includes("@")) return res.status(400).json({ message: "email required" });
      const detail = getFounderLeadDetail(email);
      if (!detail) return res.status(404).json({ message: "Lead not found" });
      return res.json(detail);
    } catch (err) {
      logError("admin-users", "lead detail failed", err);
      return res.status(500).json({ message: "Failed to load lead detail" });
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
  marketing_consent?: boolean;
}): Promise<void> {
  // Postgres is the durable consent record; it must not depend on the local
  // SQLite CRM succeeding, and a failure must never become an unhandled rejection.
  if (input.marketing_consent) {
    try {
      await recordConsentOptIn({ email: input.email, source: normalizeLeadSource(input.source) });
    } catch (err) {
      logError("admin-users", "record marketing consent failed", err);
    }
  }
  try {
    await recordEmailLeadCapture({
      email: input.email,
      source: normalizeLeadSource(input.source),
      signup_form: input.signup_form,
    });
  } catch (err) {
    logError("admin-users", "record email lead capture failed", err);
  }
  try {
    await ensureStore();
    recordEmailLead(input);
  } catch (err) {
    logError("admin-users", "capture lead failed", err);
  }
}
