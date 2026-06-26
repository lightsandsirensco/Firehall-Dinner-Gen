/**
 * Admin user CRM — list, detail, notes, exports.
 */

import { nanoid } from "nanoid";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { runDbMigrations } from "../db/migrate.js";
import type {
  AdminLeadRow,
  AdminUserActivityItem,
  AdminUserDetail,
  AdminUserFilter,
  AdminUserListResponse,
  AdminUserMembership,
  AdminUserRow,
  AdminUserSavedRecipe,
} from "../../shared/admin-users/types.js";
import type { PlanId } from "../../shared/billing/types.js";
import type { HallRole } from "../../shared/hall-membership/types.js";
import { getLeadsForEmail } from "./leads-store.js";

let db: SqliteDatabase;

export function bindAdminUsersDb(database: SqliteDatabase): void {
  db = database;
}

export async function initAdminUsersStore(): Promise<void> {
  await runDbMigrations();
  db = await getSharedLocalDb();
}

function getDb(): SqliteDatabase {
  if (!db) throw new Error("Admin users store not initialized");
  return db;
}

function displayName(row: Record<string, unknown>, email: string | null): string {
  const display = row.display_name ? String(row.display_name).trim() : "";
  if (display) return display;
  const first = row.first_name ? String(row.first_name).trim() : "";
  const last = row.last_name ? String(row.last_name).trim() : "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return email ?? "Guest";
}

function userFilterClause(filter: AdminUserFilter): { where: string; params: unknown[] } {
  switch (filter) {
    case "new_users":
      return { where: "u.created_at >= datetime('now', '-7 days')", params: [] };
    case "active_users":
      return {
        where: `(u.last_login_at >= datetime('now', '-30 days')
          OR EXISTS (
            SELECT 1 FROM hall_activity_events hae
            WHERE hae.user_id = u.user_id AND hae.occurred_at >= datetime('now', '-30 days')
          ))`,
        params: [],
      };
    case "hall_members":
      return {
        where: `EXISTS (SELECT 1 FROM hall_memberships hm WHERE hm.user_id = u.user_id)`,
        params: [],
      };
    case "hall_admins":
      return {
        where: `EXISTS (
          SELECT 1 FROM hall_memberships hm
          WHERE hm.user_id = u.user_id AND hm.role = 'captain'
        )`,
        params: [],
      };
    case "personal_plan":
      return {
        where: `EXISTS (
          SELECT 1 FROM user_subscriptions us
          WHERE us.user_id = u.user_id AND us.plan_id = 'personal' AND us.status IN ('active', 'trialing')
        )`,
        params: [],
      };
    case "hall_pro":
      return {
        where: `EXISTS (
          SELECT 1 FROM hall_memberships hm
          JOIN hall_subscriptions hs ON hs.hall_id = hm.hall_id
          WHERE hm.user_id = u.user_id AND hs.plan_id = 'hall_pro' AND hs.status IN ('active', 'trialing')
        )`,
        params: [],
      };
    case "no_hall":
      return {
        where: `NOT EXISTS (SELECT 1 FROM hall_memberships hm WHERE hm.user_id = u.user_id)`,
        params: [],
      };
    case "email_leads_only":
      return {
        where: `EXISTS (SELECT 1 FROM email_leads el WHERE lower(el.email) = lower(u.email))`,
        params: [],
      };
    case "pilot_leads":
      return {
        where: `EXISTS (SELECT 1 FROM admin_user_meta am WHERE am.user_id = u.user_id AND am.is_pilot_lead = 1)`,
        params: [],
      };
    default:
      return { where: "1=1", params: [] };
  }
}

const USER_SELECT = `
  SELECT
    u.user_id,
    u.email,
    u.auth_provider,
    u.is_guest,
    u.created_at AS signup_date,
    COALESCE(u.last_login_at, u.updated_at) AS last_active,
    p.first_name,
    p.last_name,
    p.display_name,
    COALESCE(us.plan_id, 'guest') AS plan,
    (
      SELECT COUNT(*) FROM hall_activity_events hae
      WHERE hae.user_id = u.user_id AND hae.event_type = 'meal_cooked'
    ) AS meals_generated,
    (
      SELECT COUNT(*) FROM hall_activity_events hae
      WHERE hae.user_id = u.user_id AND hae.event_type = 'vote_created'
    ) AS votes_created,
    (
      SELECT COUNT(*) FROM user_saved_recipes usr WHERE usr.user_id = u.user_id
    ) AS saved_recipes,
    (
      SELECT el.source FROM email_leads el
      WHERE lower(el.email) = lower(u.email)
      ORDER BY el.captured_at ASC LIMIT 1
    ) AS email_capture_source,
    COALESCE(am.is_pilot_lead, 0) AS is_pilot_lead,
    (
      SELECT h.name FROM hall_memberships hm
      JOIN halls h ON h.hall_id = hm.hall_id
      WHERE hm.user_id = u.user_id
      ORDER BY CASE hm.role WHEN 'captain' THEN 0 WHEN 'canteen_manager' THEN 1 ELSE 2 END, hm.joined_at
      LIMIT 1
    ) AS hall_name,
    (
      SELECT hs.name FROM hall_memberships hm
      LEFT JOIN hall_shifts hs ON hs.shift_id = hm.shift_id
      WHERE hm.user_id = u.user_id
      ORDER BY CASE hm.role WHEN 'captain' THEN 0 WHEN 'canteen_manager' THEN 1 ELSE 2 END, hm.joined_at
      LIMIT 1
    ) AS shift,
    (
      SELECT hm.role FROM hall_memberships hm
      WHERE hm.user_id = u.user_id
      ORDER BY CASE hm.role WHEN 'captain' THEN 0 WHEN 'canteen_manager' THEN 1 ELSE 2 END, hm.joined_at
      LIMIT 1
    ) AS hall_role,
    (
      SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END FROM hall_memberships hm
      JOIN hall_subscriptions hsub ON hsub.hall_id = hm.hall_id
      WHERE hm.user_id = u.user_id AND hsub.plan_id = 'hall_pro' AND hsub.status IN ('active', 'trialing')
    ) AS hall_pro
  FROM users u
  LEFT JOIN user_profiles p ON p.user_id = u.user_id
  LEFT JOIN user_subscriptions us ON us.user_id = u.user_id AND us.status IN ('active', 'trialing')
  LEFT JOIN admin_user_meta am ON am.user_id = u.user_id
`;

function rowToUser(row: Record<string, unknown>): AdminUserRow {
  const email = row.email ? String(row.email) : null;
  return {
    user_id: String(row.user_id),
    name: displayName(row, email),
    email,
    signup_date: String(row.signup_date),
    last_active: row.last_active ? String(row.last_active) : null,
    plan: (String(row.plan) as PlanId | "guest") || "guest",
    hall_pro: Number(row.hall_pro) === 1,
    hall_name: row.hall_name ? String(row.hall_name) : null,
    shift: row.shift ? String(row.shift) : null,
    hall_role: row.hall_role ? (String(row.hall_role) as HallRole) : null,
    meals_generated: Number(row.meals_generated ?? 0),
    votes_created: Number(row.votes_created ?? 0),
    saved_recipes: Number(row.saved_recipes ?? 0),
    email_capture_source: row.email_capture_source ? String(row.email_capture_source) : null,
    is_pilot_lead: Number(row.is_pilot_lead) === 1,
    auth_provider: String(row.auth_provider),
    is_guest: Number(row.is_guest) === 1,
  };
}

export function listAdminUsers(filter: AdminUserFilter = "all", limit = 500): AdminUserListResponse {
  const d = getDb();
  const { where, params } = userFilterClause(filter);
  const rows = d
    .prepare(
      `${USER_SELECT} WHERE u.is_guest = 0 AND ${where}
       GROUP BY u.user_id
       ORDER BY u.created_at DESC LIMIT ?`,
    )
    .all(...(params as Array<string | number>), limit) as Array<Record<string, unknown>>;

  const countRow = d
    .prepare(`SELECT COUNT(DISTINCT u.user_id) AS c FROM users u WHERE u.is_guest = 0 AND ${where}`)
    .get(...(params as Array<string | number>)) as { c: number };

  return {
    users: rows.map(rowToUser),
    total: Number(countRow?.c ?? 0),
    filter,
  };
}

export function getAdminUserDetail(userId: string): AdminUserDetail | null {
  const d = getDb();
  const row = d
    .prepare(`${USER_SELECT} WHERE u.user_id = ? GROUP BY u.user_id`)
    .get(userId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const user = rowToUser(row);
  const email = user.email?.toLowerCase() ?? "";

  const profileRow = d
    .prepare(`SELECT * FROM user_profiles WHERE user_id = ?`)
    .get(userId) as Record<string, unknown> | undefined;

  const subRow = d
    .prepare(`SELECT plan_id, status FROM user_subscriptions WHERE user_id = ?`)
    .get(userId) as { plan_id: string; status: string } | undefined;

  const hallProRows = d
    .prepare(
      `SELECT h.hall_id, h.name AS hall_name, hsub.status
       FROM hall_memberships hm
       JOIN halls h ON h.hall_id = hm.hall_id
       JOIN hall_subscriptions hsub ON hsub.hall_id = hm.hall_id
       WHERE hm.user_id = ? AND hsub.plan_id = 'hall_pro'`,
    )
    .all(userId) as Array<{ hall_id: string; hall_name: string; status: string }>;

  const membershipRows = d
    .prepare(
      `SELECT hm.hall_id, h.name AS hall_name, hm.role, hm.joined_at, hs.name AS shift_name,
        CASE WHEN hsub.status IN ('active', 'trialing') THEN 1 ELSE 0 END AS hall_pro_active
       FROM hall_memberships hm
       JOIN halls h ON h.hall_id = hm.hall_id
       LEFT JOIN hall_shifts hs ON hs.shift_id = hm.shift_id
       LEFT JOIN hall_subscriptions hsub ON hsub.hall_id = hm.hall_id AND hsub.plan_id = 'hall_pro'
       WHERE hm.user_id = ?
       ORDER BY hm.joined_at`,
    )
    .all(userId) as Array<Record<string, unknown>>;

  const memberships: AdminUserMembership[] = membershipRows.map((m) => ({
    hall_id: String(m.hall_id),
    hall_name: String(m.hall_name),
    role: String(m.role) as HallRole,
    shift_name: m.shift_name ? String(m.shift_name) : null,
    joined_at: String(m.joined_at),
    hall_pro_active: Number(m.hall_pro_active) === 1,
  }));

  const savedRows = d
    .prepare(
      `SELECT recipe_key, recipe_json, saved_at FROM user_saved_recipes
       WHERE user_id = ? ORDER BY saved_at DESC LIMIT 50`,
    )
    .all(userId) as Array<Record<string, unknown>>;

  const saved_recipes: AdminUserSavedRecipe[] = savedRows.map((s) => {
    let title = String(s.recipe_key);
    try {
      const parsed = JSON.parse(String(s.recipe_json)) as { title?: string; recipe_title?: string };
      title = parsed.title ?? parsed.recipe_title ?? title;
    } catch {
      /* use recipe_key */
    }
    return {
      recipe_slug: String(s.recipe_key),
      recipe_title: title,
      saved_at: String(s.saved_at),
    };
  });

  const activity = buildUserActivityTimeline(userId, email);

  const metaRow = d
    .prepare(`SELECT internal_notes, is_pilot_lead FROM admin_user_meta WHERE user_id = ?`)
    .get(userId) as { internal_notes: string; is_pilot_lead: number } | undefined;

  const leads = email ? getLeadsForEmail(email) : [];

  return {
    user,
    profile: profileRow
      ? {
          first_name: profileRow.first_name ? String(profileRow.first_name) : null,
          last_name: profileRow.last_name ? String(profileRow.last_name) : null,
          display_name: profileRow.display_name ? String(profileRow.display_name) : null,
          department: profileRow.department ? String(profileRow.department) : null,
          profile_hall_name: profileRow.hall_name ? String(profileRow.hall_name) : null,
          shift_label: profileRow.shift_label ? String(profileRow.shift_label) : null,
          crew_size:
            profileRow.crew_size != null ? Number(profileRow.crew_size) : null,
        }
      : null,
    memberships,
    billing: {
      personal_plan: (subRow?.plan_id as PlanId) ?? "guest",
      personal_status: subRow?.status ?? null,
      hall_pro_halls: hallProRows.map((h) => ({
        hall_id: h.hall_id,
        hall_name: h.hall_name,
        status: h.status,
      })),
    },
    saved_recipes,
    activity,
    klaviyo: {
      on_list: leads.some((l) => l.klaviyo_synced),
      lead_sources: [...new Set(leads.map((l) => l.source))],
      last_lead_at: leads[0]?.captured_at ?? null,
    },
    internal_notes: metaRow?.internal_notes ?? "",
    is_pilot_lead: Number(metaRow?.is_pilot_lead) === 1,
  };
}

function buildUserActivityTimeline(userId: string, email: string): AdminUserActivityItem[] {
  const d = getDb();
  const items: AdminUserActivityItem[] = [];

  const hallEvents = d
    .prepare(
      `SELECT occurred_at, event_type, title, recipe_slug, shift_label
       FROM hall_activity_events WHERE user_id = ?
       ORDER BY occurred_at DESC LIMIT 40`,
    )
    .all(userId) as Array<Record<string, unknown>>;

  for (const e of hallEvents) {
    const type = String(e.event_type);
    items.push({
      occurred_at: String(e.occurred_at),
      event_type: type,
      label: type.replace(/_/g, " "),
      detail: e.title ? String(e.title) : e.recipe_slug ? String(e.recipe_slug) : undefined,
    });
  }

  if (email) {
    try {
      const analyticsRows = d
        .prepare(
          `SELECT occurred_at, event_type, metadata_json FROM analytics_events
           WHERE event_type IN ('account_created', 'login', 'meal_generated', 'hall_created', 'hall_joined', 'email_capture')
           AND metadata_json LIKE ?
           ORDER BY occurred_at DESC LIMIT 30`,
        )
        .all(`%${email}%`) as Array<Record<string, unknown>>;

      for (const e of analyticsRows) {
        items.push({
          occurred_at: String(e.occurred_at),
          event_type: String(e.event_type),
          label: String(e.event_type).replace(/_/g, " "),
        });
      }
    } catch {
      /* analytics table may be absent in minimal test DBs */
    }
  }

  items.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));
  return items.slice(0, 50);
}

export function updateAdminUserMeta(
  userId: string,
  patch: { internal_notes?: string; is_pilot_lead?: boolean },
): void {
  const d = getDb();
  const exists = d.prepare(`SELECT 1 FROM users WHERE user_id = ?`).get(userId);
  if (!exists) throw new Error("User not found");

  const current = d
    .prepare(`SELECT internal_notes, is_pilot_lead FROM admin_user_meta WHERE user_id = ?`)
    .get(userId) as { internal_notes: string; is_pilot_lead: number } | undefined;

  const notes = patch.internal_notes ?? current?.internal_notes ?? "";
  const pilot = patch.is_pilot_lead != null ? (patch.is_pilot_lead ? 1 : 0) : (current?.is_pilot_lead ?? 0);

  d.prepare(
    `INSERT INTO admin_user_meta (user_id, internal_notes, is_pilot_lead, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       internal_notes = excluded.internal_notes,
       is_pilot_lead = excluded.is_pilot_lead,
       updated_at = datetime('now')`,
  ).run(userId, notes, pilot);
}

export function exportUsersCsv(filter: AdminUserFilter = "all"): string {
  const { users } = listAdminUsers(filter, 5000);
  const header =
    "user_id,name,email,signup_date,last_active,plan,hall_pro,hall_name,shift,meals_generated,votes_created,saved_recipes,email_capture_source,is_pilot_lead";
  const lines = users.map((u) =>
    [
      u.user_id,
      csvEscape(u.name),
      csvEscape(u.email ?? ""),
      u.signup_date,
      u.last_active ?? "",
      u.plan,
      u.hall_pro ? "yes" : "no",
      csvEscape(u.hall_name ?? ""),
      csvEscape(u.shift ?? ""),
      u.meals_generated,
      u.votes_created,
      u.saved_recipes,
      csvEscape(u.email_capture_source ?? ""),
      u.is_pilot_lead ? "yes" : "no",
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

export function exportLeadsCsv(leads: AdminLeadRow[]): string {
  const header =
    "lead_id,email,source,signup_form,captured_at,converted,hall_created,last_activity,klaviyo_synced";
  const lines = leads.map((l) =>
    [
      l.lead_id,
      csvEscape(l.email),
      l.source,
      csvEscape(l.signup_form ?? ""),
      l.captured_at,
      l.converted_to_user ? "yes" : "no",
      l.hall_created ? "yes" : "no",
      l.last_activity ?? "",
      l.klaviyo_synced ? "yes" : "no",
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function getPrimaryHallIdForUser(userId: string): string | null {
  const d = getDb();
  const row = d
    .prepare(
      `SELECT hall_id FROM hall_memberships
       WHERE user_id = ?
       ORDER BY CASE role WHEN 'captain' THEN 0 WHEN 'canteen_manager' THEN 1 ELSE 2 END, joined_at
       LIMIT 1`,
    )
    .get(userId) as { hall_id: string } | undefined;
  return row?.hall_id ?? null;
}

export function adminCreateHallInvite(
  hallId: string,
  createdByUserId: string,
): { invite_url: string | null; invite_code: string | null } | null {
  const d = getDb();
  const hall = d.prepare(`SELECT hall_id FROM halls WHERE hall_id = ?`).get(hallId);
  if (!hall) return null;

  const inviteId = nanoid(12);
  const inviteToken = nanoid(16);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const baseUrl = process.env.PUBLIC_SITE_URL || process.env.APP_URL || "http://localhost:5000";
  const inviteUrl = `${baseUrl.replace(/\/$/, "")}/hall/join?token=${inviteToken}`;

  d.prepare(
    `INSERT INTO hall_invites (
      invite_id, hall_id, method, invite_token, invite_code,
      created_by_user_id, expires_at, max_uses
    ) VALUES (?, ?, 'link', ?, NULL, ?, ?, NULL)`,
  ).run(inviteId, hallId, inviteToken, createdByUserId, expiresAt);

  return { invite_url: inviteUrl, invite_code: null };
}
