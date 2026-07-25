/**
 * Founder Leads Dashboard — merged email CRM (one row per email).
 */

import type {
  FounderLeadAnalytics,
  FounderLeadDetail,
  FounderLeadFilters,
  FounderLeadListResponse,
  FounderLeadPlanLabel,
  FounderLeadRow,
  FounderLeadSortKey,
  FounderLeadStatus,
  FounderLeadTimelineItem,
} from "../../shared/admin-users/types.js";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { syncAllLeadConversions } from "./leads-store.js";

let db: SqliteDatabase;

export function bindFounderLeadsDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) throw new Error("Founder leads store not initialized");
  return db;
}

export async function initFounderLeadsStore(): Promise<void> {
  db = await getSharedLocalDb();
}

function planLabel(planId: string | null | undefined, hallPro: boolean): FounderLeadPlanLabel {
  if (hallPro) return "Hall Pro";
  if (planId === "personal") return "Firefighter Plus";
  return "Free";
}

function deriveStatus(input: {
  signupDate: string;
  lastSeen: string | null;
  accountCreated: boolean;
}): FounderLeadStatus {
  const now = Date.now();
  const signupMs = Date.parse(input.signupDate) || 0;
  const lastMs = input.lastSeen ? Date.parse(input.lastSeen) || 0 : 0;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  if (lastMs && now - lastMs <= thirtyDays) return "Active";
  if (!input.accountCreated && now - signupMs <= sevenDays) return "New";
  if (input.accountCreated && now - signupMs <= sevenDays && (!lastMs || now - lastMs <= sevenDays)) {
    return "New";
  }
  if (input.accountCreated && (!lastMs || now - lastMs > thirtyDays)) return "Dormant";
  if (!input.accountCreated && now - signupMs > sevenDays) return "Dormant";
  return "New";
}

interface RawMergedLead {
  email: string;
  user_id: string | null;
  name: string;
  signup_date: string;
  last_seen: string | null;
  source: string;
  sources: string;
  account_created: number;
  hall_id: string | null;
  hall_role: string | null;
  hall_name: string | null;
  plan_id: string | null;
  hall_pro: number;
  auth_provider: string | null;
  login_count: number;
  last_login: string | null;
  recipes_saved: number;
  meals_generated: number;
  votes_cast: number;
  shopping_lists_created: number;
  is_test_account: number;
  klaviyo_synced: number;
  magic_link_used: number;
}

function rowToFounderLead(row: RawMergedLead): FounderLeadRow {
  const sources = String(row.sources || row.source || "unknown")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const primarySource = sources[0] || row.source || "unknown";
  const accountCreated = Number(row.account_created) === 1;
  const hallPro = Number(row.hall_pro) === 1;
  const lastSeen = row.last_seen || row.last_login || null;
  const emailVerified =
    accountCreated &&
    (Number(row.magic_link_used) > 0 ||
      row.auth_provider === "google" ||
      row.auth_provider === "apple" ||
      row.auth_provider === "email");

  return {
    lead_key: row.email,
    email: row.email,
    name: row.name || row.email.split("@")[0] || row.email,
    signup_date: row.signup_date,
    last_seen: lastSeen,
    source: primarySource,
    sources: Array.from(new Set(sources)),
    account_created: accountCreated,
    user_id: row.user_id,
    hall_id: row.hall_id,
    hall_role: row.hall_role,
    hall_name: row.hall_name,
    plan: planLabel(row.plan_id, hallPro),
    email_verified: Boolean(emailVerified),
    login_count: Number(row.login_count ?? 0),
    last_login: row.last_login,
    recipes_saved: Number(row.recipes_saved ?? 0),
    meals_generated: Number(row.meals_generated ?? 0),
    votes_cast: Number(row.votes_cast ?? 0),
    shopping_lists_created: Number(row.shopping_lists_created ?? 0),
    status: deriveStatus({
      signupDate: row.signup_date,
      lastSeen,
      accountCreated,
    }),
    is_test_account: Number(row.is_test_account) === 1,
    klaviyo_synced: Number(row.klaviyo_synced) === 1,
  };
}

function loadMergedLeads(): FounderLeadRow[] {
  const d = getDb();
  syncAllLeadConversions();

  const rows = d
    .prepare(
      `
      WITH lead_emails AS (
        SELECT lower(email) AS email FROM email_leads
        UNION
        SELECT lower(email) AS email FROM users WHERE email IS NOT NULL AND is_guest = 0
      ),
      lead_agg AS (
        SELECT
          lower(el.email) AS email,
          MIN(el.captured_at) AS first_captured,
          MAX(COALESCE(el.last_activity_at, el.captured_at)) AS last_lead_activity,
          GROUP_CONCAT(el.source) AS sources,
          MAX(el.klaviyo_synced) AS klaviyo_synced,
          MAX(el.converted_user_id) AS converted_user_id
        FROM email_leads el
        GROUP BY lower(el.email)
      )
      SELECT
        le.email AS email,
        u.user_id AS user_id,
        COALESCE(
          NULLIF(TRIM(COALESCE(p.display_name, '')), ''),
          NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
          CASE WHEN le.email LIKE '%@%' THEN substr(le.email, 1, instr(le.email, '@') - 1) ELSE le.email END
        ) AS name,
        COALESCE(la.first_captured, u.created_at) AS signup_date,
        COALESCE(
          u.last_login_at,
          la.last_lead_activity,
          u.updated_at,
          la.first_captured,
          u.created_at
        ) AS last_seen,
        COALESCE(
          (SELECT el2.source FROM email_leads el2
           WHERE lower(el2.email) = le.email
           ORDER BY el2.captured_at ASC LIMIT 1),
          CASE u.auth_provider
            WHEN 'email' THEN 'magic_link'
            WHEN 'google' THEN 'google'
            WHEN 'apple' THEN 'apple'
            ELSE 'account'
          END
        ) AS source,
        COALESCE(la.sources,
          CASE u.auth_provider
            WHEN 'email' THEN 'magic_link'
            WHEN 'google' THEN 'google'
            WHEN 'apple' THEN 'apple'
            ELSE 'account'
          END
        ) AS sources,
        CASE WHEN u.user_id IS NOT NULL THEN 1 ELSE 0 END AS account_created,
        (
          SELECT hm.hall_id FROM hall_memberships hm
          WHERE hm.user_id = u.user_id
          ORDER BY CASE hm.role WHEN 'captain' THEN 0 WHEN 'canteen_manager' THEN 1 ELSE 2 END, hm.joined_at
          LIMIT 1
        ) AS hall_id,
        (
          SELECT hm.role FROM hall_memberships hm
          WHERE hm.user_id = u.user_id
          ORDER BY CASE hm.role WHEN 'captain' THEN 0 WHEN 'canteen_manager' THEN 1 ELSE 2 END, hm.joined_at
          LIMIT 1
        ) AS hall_role,
        (
          SELECT h.name FROM hall_memberships hm
          JOIN halls h ON h.hall_id = hm.hall_id
          WHERE hm.user_id = u.user_id
          ORDER BY CASE hm.role WHEN 'captain' THEN 0 WHEN 'canteen_manager' THEN 1 ELSE 2 END, hm.joined_at
          LIMIT 1
        ) AS hall_name,
        COALESCE(us.plan_id, 'guest') AS plan_id,
        (
          SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END FROM hall_memberships hm
          JOIN hall_subscriptions hsub ON hsub.hall_id = hm.hall_id
          WHERE hm.user_id = u.user_id AND hsub.plan_id = 'hall_pro' AND hsub.status IN ('active', 'trialing')
        ) AS hall_pro,
        u.auth_provider AS auth_provider,
        (
          SELECT COUNT(*) FROM auth_magic_links aml
          WHERE lower(aml.email) = le.email AND aml.used_at IS NOT NULL
        ) AS login_count,
        u.last_login_at AS last_login,
        (
          SELECT COUNT(*) FROM user_saved_recipes usr WHERE usr.user_id = u.user_id
        ) AS recipes_saved,
        (
          SELECT COUNT(*) FROM hall_activity_events hae
          WHERE hae.user_id = u.user_id AND hae.event_type = 'meal_cooked'
        ) AS meals_generated,
        (
          SELECT COUNT(*) FROM hall_activity_events hae
          WHERE hae.user_id = u.user_id AND hae.event_type = 'vote_created'
        ) AS votes_cast,
        (
          SELECT COUNT(*) FROM hall_shopping_lists hsl
          WHERE hsl.created_by_user_id = u.user_id
        ) AS shopping_lists_created,
        COALESCE(am.is_test_account, 0) AS is_test_account,
        COALESCE(la.klaviyo_synced, 0) AS klaviyo_synced,
        (
          SELECT COUNT(*) FROM auth_magic_links aml
          WHERE lower(aml.email) = le.email AND aml.used_at IS NOT NULL
        ) AS magic_link_used
      FROM lead_emails le
      LEFT JOIN lead_agg la ON la.email = le.email
      LEFT JOIN users u ON lower(u.email) = le.email AND u.is_guest = 0
      LEFT JOIN user_profiles p ON p.user_id = u.user_id
      LEFT JOIN user_subscriptions us ON us.user_id = u.user_id AND us.status IN ('active', 'trialing')
      LEFT JOIN admin_user_meta am ON am.user_id = u.user_id
      ORDER BY COALESCE(la.first_captured, u.created_at) DESC
      `,
    )
    .all() as unknown as RawMergedLead[];

  return rows.map(rowToFounderLead).map((lead) => {
    if (lead.account_created && lead.last_login && lead.login_count < 1) {
      return { ...lead, login_count: 1 };
    }
    return lead;
  });
}

function matchesFilters(lead: FounderLeadRow, filters: FounderLeadFilters): boolean {
  const q = filters.q?.trim().toLowerCase() ?? "";
  if (q) {
    const hay = [lead.email, lead.name, lead.hall_name ?? "", lead.source, ...lead.sources]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }

  if (filters.source) {
    const src = filters.source.toLowerCase();
    if (!lead.sources.some((s) => s.toLowerCase() === src) && lead.source.toLowerCase() !== src) {
      return false;
    }
  }

  if (filters.plan === "free" && lead.plan !== "Free") return false;
  if (filters.plan === "firefighter_plus" && lead.plan !== "Firefighter Plus") return false;
  if (filters.plan === "hall_pro" && lead.plan !== "Hall Pro") return false;

  if (filters.hall) {
    const hallQ = filters.hall.trim().toLowerCase();
    if (!(lead.hall_name ?? "").toLowerCase().includes(hallQ)) return false;
  }

  if (filters.verified === "yes" && !lead.email_verified) return false;
  if (filters.verified === "no" && lead.email_verified) return false;

  if (filters.status && lead.status !== filters.status) return false;

  if (filters.account === "yes" && !lead.account_created) return false;
  if (filters.account === "no" && lead.account_created) return false;

  if (filters.signup_from && lead.signup_date < filters.signup_from) return false;
  if (filters.signup_to) {
    const to = filters.signup_to;
    if (lead.signup_date.slice(0, 10) > to.slice(0, 10)) return false;
  }

  if (filters.last_login_from) {
    if (!lead.last_login || lead.last_login < filters.last_login_from) return false;
  }
  if (filters.last_login_to) {
    if (!lead.last_login || lead.last_login.slice(0, 10) > filters.last_login_to.slice(0, 10)) {
      return false;
    }
  }

  return true;
}

function compareLeads(
  a: FounderLeadRow,
  b: FounderLeadRow,
  sort: FounderLeadSortKey,
  dir: "asc" | "desc",
): number {
  const mul = dir === "asc" ? 1 : -1;
  const num = (x: number, y: number) => (x === y ? 0 : x < y ? -1 : 1) * mul;
  const str = (x: string | null, y: string | null) =>
    (x ?? "").localeCompare(y ?? "", undefined, { sensitivity: "base" }) * mul;

  switch (sort) {
    case "email":
      return str(a.email, b.email);
    case "name":
      return str(a.name, b.name);
    case "signup_date":
      return str(a.signup_date, b.signup_date);
    case "last_seen":
      return str(a.last_seen, b.last_seen);
    case "source":
      return str(a.source, b.source);
    case "plan":
      return str(a.plan, b.plan);
    case "login_count":
      return num(a.login_count, b.login_count);
    case "last_login":
      return str(a.last_login, b.last_login);
    case "recipes_saved":
      return num(a.recipes_saved, b.recipes_saved);
    case "meals_generated":
      return num(a.meals_generated, b.meals_generated);
    case "votes_cast":
      return num(a.votes_cast, b.votes_cast);
    case "shopping_lists_created":
      return num(a.shopping_lists_created, b.shopping_lists_created);
    case "status":
      return str(a.status, b.status);
    default:
      return str(a.signup_date, b.signup_date);
  }
}

export function computeFounderLeadAnalytics(leads: FounderLeadRow[]): FounderLeadAnalytics {
  const totalEmails = leads.length;
  const registered = leads.filter((l) => l.account_created);
  const totalRegistered = registered.length;
  const conversionRate =
    totalEmails === 0 ? 0 : Math.round((totalRegistered / totalEmails) * 1000) / 10;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const activeUsers30d = registered.filter((l) => {
    const t = l.last_seen ? Date.parse(l.last_seen) : 0;
    return t >= thirtyDaysAgo;
  }).length;

  const hallMembers = leads.filter((l) => Boolean(l.hall_id)).length;
  const hallProUsers = leads.filter((l) => l.plan === "Hall Pro").length;
  const firefighterPlusUsers = leads.filter((l) => l.plan === "Firefighter Plus").length;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const todaysSignups = leads.filter((l) => l.signup_date >= todayIso).length;
  const thisWeeksSignups = leads.filter((l) => l.signup_date >= weekAgo).length;
  const thisMonth = leads.filter((l) => l.signup_date >= monthAgo).length;
  const prevMonth = leads.filter(
    (l) => l.signup_date >= twoMonthsAgo && l.signup_date < monthAgo,
  ).length;
  const monthlyGrowth =
    prevMonth === 0
      ? thisMonth > 0
        ? 100
        : 0
      : Math.round(((thisMonth - prevMonth) / prevMonth) * 1000) / 10;

  return {
    total_emails: totalEmails,
    total_registered_users: totalRegistered,
    conversion_rate: conversionRate,
    active_users_30d: activeUsers30d,
    hall_members: hallMembers,
    hall_pro_users: hallProUsers,
    firefighter_plus_users: firefighterPlusUsers,
    todays_signups: todaysSignups,
    this_weeks_signups: thisWeeksSignups,
    monthly_growth: monthlyGrowth,
  };
}

export function listFounderLeads(filters: FounderLeadFilters = {}): FounderLeadListResponse {
  const all = loadMergedLeads();
  const analytics = computeFounderLeadAnalytics(all);
  const filtered = all.filter((l) => matchesFilters(l, filters));
  const sort = filters.sort ?? "signup_date";
  const sortDir = filters.sort_dir ?? "desc";
  filtered.sort((a, b) => compareLeads(a, b, sort, sortDir));

  const pageSize = Math.min(Math.max(filters.page_size ?? 50, 1), 500);
  const page = Math.max(filters.page ?? 1, 1);
  const start = (page - 1) * pageSize;

  return {
    leads: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    page_size: pageSize,
    analytics,
    query: filters.q?.trim() || null,
  };
}

export function getFounderLeadByEmail(email: string): FounderLeadRow | null {
  const key = email.trim().toLowerCase();
  return loadMergedLeads().find((l) => l.email === key) ?? null;
}

export function getFounderLeadDetail(email: string): FounderLeadDetail | null {
  const d = getDb();
  const lead = getFounderLeadByEmail(email);
  if (!lead) return null;

  const timeline: FounderLeadTimelineItem[] = [];
  const key = email.trim().toLowerCase();

  const leadRows = d
    .prepare(
      `SELECT source, signup_form, captured_at FROM email_leads
       WHERE lower(email) = ? ORDER BY captured_at ASC`,
    )
    .all(key) as Array<{
    source: string;
    signup_form: string | null;
    captured_at: string;
  }>;

  for (const row of leadRows) {
    timeline.push({
      occurred_at: row.captured_at,
      event_type: "signup",
      label: "Email captured",
      detail: `${row.source}${row.signup_form ? ` · ${row.signup_form}` : ""}`,
    });
  }

  const magicLinks = d
    .prepare(
      `SELECT created_at, used_at FROM auth_magic_links
       WHERE lower(email) = ? ORDER BY created_at DESC LIMIT 40`,
    )
    .all(key) as Array<{ created_at: string; used_at: string | null }>;

  for (const ml of magicLinks) {
    timeline.push({
      occurred_at: ml.created_at,
      event_type: "magic_link_request",
      label: "Magic link requested",
    });
    if (ml.used_at) {
      timeline.push({
        occurred_at: ml.used_at,
        event_type: "login",
        label: "Magic link login",
      });
    }
  }

  if (lead.user_id) {
    timeline.push({
      occurred_at: lead.signup_date,
      event_type: "account_created",
      label: "Account created",
    });
    if (lead.last_login) {
      timeline.push({
        occurred_at: lead.last_login,
        event_type: "last_login",
        label: "Last login",
      });
    }

    const memberships = d
      .prepare(
        `SELECT h.name, hm.role, hm.joined_at FROM hall_memberships hm
         JOIN halls h ON h.hall_id = hm.hall_id
         WHERE hm.user_id = ? ORDER BY hm.joined_at DESC`,
      )
      .all(lead.user_id) as Array<{ name: string; role: string; joined_at: string }>;

    for (const m of memberships) {
      timeline.push({
        occurred_at: m.joined_at,
        event_type: "hall_joined",
        label: "Joined hall",
        detail: `${m.name} · ${m.role}`,
      });
    }

    const saves = d
      .prepare(
        `SELECT recipe_key, saved_at FROM user_saved_recipes
         WHERE user_id = ? ORDER BY saved_at DESC LIMIT 20`,
      )
      .all(lead.user_id) as Array<{ recipe_key: string; saved_at: string }>;

    for (const s of saves) {
      timeline.push({
        occurred_at: s.saved_at,
        event_type: "recipe_saved",
        label: "Recipe saved",
        detail: s.recipe_key,
      });
    }

    const activity = d
      .prepare(
        `SELECT event_type, occurred_at, title FROM hall_activity_events
         WHERE user_id = ? ORDER BY occurred_at DESC LIMIT 40`,
      )
      .all(lead.user_id) as Array<{ event_type: string; occurred_at: string; title: string }>;

    for (const a of activity) {
      const label =
        a.event_type === "vote_created"
          ? "Vote cast"
          : a.event_type === "meal_cooked"
            ? "Meal generated / cooked"
            : a.event_type === "shopping_list_completed"
              ? "Shopping list completed"
              : a.event_type.replace(/_/g, " ");
      timeline.push({
        occurred_at: a.occurred_at,
        event_type: a.event_type,
        label,
        detail: a.title || undefined,
      });
    }

    const lists = d
      .prepare(
        `SELECT title, created_at, status FROM hall_shopping_lists
         WHERE created_by_user_id = ? ORDER BY created_at DESC LIMIT 20`,
      )
      .all(lead.user_id) as Array<{ title: string; created_at: string; status: string }>;

    for (const list of lists) {
      timeline.push({
        occurred_at: list.created_at,
        event_type: "shopping_list",
        label: "Shopping list created",
        detail: `${list.title} · ${list.status}`,
      });
    }
  }

  if (lead.last_seen) {
    timeline.push({
      occurred_at: lead.last_seen,
      event_type: "last_activity",
      label: "Last activity",
    });
  }

  timeline.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));

  return { lead, timeline: timeline.slice(0, 80) };
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportFounderLeadsCsv(filters: FounderLeadFilters = {}): string {
  const { leads } = listFounderLeads({ ...filters, page: 1, page_size: 5000 });
  const header = [
    "email",
    "name",
    "signup_date",
    "last_seen",
    "source",
    "sources",
    "account_created",
    "hall_id",
    "hall_role",
    "hall_name",
    "plan",
    "email_verified",
    "login_count",
    "last_login",
    "recipes_saved",
    "meals_generated",
    "votes_cast",
    "shopping_lists_created",
    "status",
    "is_test_account",
    "user_id",
  ].join(",");

  const lines = leads.map((l) =>
    [
      csvEscape(l.email),
      csvEscape(l.name),
      l.signup_date,
      l.last_seen ?? "",
      csvEscape(l.source),
      csvEscape(l.sources.join("|")),
      l.account_created ? "yes" : "no",
      l.hall_id ?? "",
      csvEscape(l.hall_role ?? ""),
      csvEscape(l.hall_name ?? ""),
      csvEscape(l.plan),
      l.email_verified ? "yes" : "no",
      l.login_count,
      l.last_login ?? "",
      l.recipes_saved,
      l.meals_generated,
      l.votes_cast,
      l.shopping_lists_created,
      l.status,
      l.is_test_account ? "yes" : "no",
      l.user_id ?? "",
    ].join(","),
  );

  return [header, ...lines].join("\n");
}

/** Excel-compatible SpreadsheetML (.xls) without extra dependencies. */
export function exportFounderLeadsExcel(filters: FounderLeadFilters = {}): string {
  const { leads } = listFounderLeads({ ...filters, page: 1, page_size: 5000 });
  const headers = [
    "Email",
    "Name",
    "Signup Date",
    "Last Seen",
    "Source",
    "Account Created",
    "Hall",
    "Hall Role",
    "Hall Name",
    "Plan",
    "Email Verified",
    "Login Count",
    "Last Login",
    "Recipes Saved",
    "Meals Generated",
    "Votes Cast",
    "Shopping Lists",
    "Status",
  ];

  const escapeXml = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const cell = (v: string | number) =>
    `<Cell><Data ss:Type="${typeof v === "number" ? "Number" : "String"}">${escapeXml(String(v))}</Data></Cell>`;

  const headerRow = `<Row>${headers.map((h) => cell(h)).join("")}</Row>`;
  const body = leads
    .map(
      (l) =>
        `<Row>${[
          l.email,
          l.name,
          l.signup_date,
          l.last_seen ?? "",
          l.source,
          l.account_created ? "Yes" : "No",
          l.hall_id ?? "",
          l.hall_role ?? "",
          l.hall_name ?? "",
          l.plan,
          l.email_verified ? "Yes" : "No",
          l.login_count,
          l.last_login ?? "",
          l.recipes_saved,
          l.meals_generated,
          l.votes_cast,
          l.shopping_lists_created,
          l.status,
        ]
          .map((v) => cell(v as string | number))
          .join("")}</Row>`,
    )
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Leads">
  <Table>
${headerRow}
${body}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function markTestAccount(userId: string, isTest: boolean): void {
  const d = getDb();
  const exists = d.prepare(`SELECT 1 FROM users WHERE user_id = ?`).get(userId);
  if (!exists) throw new Error("User not found");

  const current = d
    .prepare(`SELECT internal_notes, is_pilot_lead FROM admin_user_meta WHERE user_id = ?`)
    .get(userId) as { internal_notes: string; is_pilot_lead: number } | undefined;

  d.prepare(
    `INSERT INTO admin_user_meta (user_id, internal_notes, is_pilot_lead, is_test_account, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       is_test_account = excluded.is_test_account,
       updated_at = datetime('now')`,
  ).run(userId, current?.internal_notes ?? "", current?.is_pilot_lead ?? 0, isTest ? 1 : 0);
}

export function deleteTestAccount(userId: string): { ok: true } {
  const d = getDb();
  const meta = d
    .prepare(`SELECT is_test_account FROM admin_user_meta WHERE user_id = ?`)
    .get(userId) as { is_test_account: number } | undefined;

  if (!meta || Number(meta.is_test_account) !== 1) {
    throw new Error("Only accounts marked as test can be deleted");
  }

  const user = d
    .prepare(`SELECT email FROM users WHERE user_id = ?`)
    .get(userId) as { email: string | null } | undefined;
  if (!user) throw new Error("User not found");

  const tx = d.transaction(() => {
    if (user.email) {
      d.prepare(`DELETE FROM email_leads WHERE lower(email) = ?`).run(user.email.toLowerCase());
    }
    d.prepare(`DELETE FROM users WHERE user_id = ?`).run(userId);
  });
  tx();
  return { ok: true };
}

export function listHallNamesForFilter(): string[] {
  const d = getDb();
  const rows = d
    .prepare(`SELECT DISTINCT name FROM halls WHERE name IS NOT NULL ORDER BY name ASC LIMIT 200`)
    .all() as Array<{ name: string }>;
  return rows.map((r) => r.name);
}
