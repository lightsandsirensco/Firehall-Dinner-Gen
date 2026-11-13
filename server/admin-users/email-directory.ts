/**
 * Postgres-backed admin views for /admin/users and /admin/signups.
 *
 * Read-only over durable tables: users, user_profiles, user_subscriptions,
 * personal_pro_trials, user_marketing_consent, klaviyo_subscription_queue,
 * auth_magic_links, email_lead_captures. Nothing here reads the instance-local
 * SQLite cache, and nothing here writes except recordEmailLeadCapture().
 *
 * Consent comes ONLY from user_marketing_consent. Klaviyo queue status is
 * shown separately and never implies consent.
 */
import { nanoid } from "nanoid";
import { pgAll, pgRun } from "../db/pg-sql.js";
import { hasSubscribedPro, isProTrialActive } from "../../shared/billing/pro-trial.js";
import type { UserSubscription } from "../../shared/billing/types.js";
import type {
  EmailCategory,
  EmailDirectoryFilter,
  EmailDirectoryListResponse,
  EmailDirectoryRow,
  EmailDirectorySummary,
  KlaviyoSyncStatus,
  MarketingConsentStatus,
  RegisteredUserFilter,
  RegisteredUserListResponse,
  RegisteredUserRow,
} from "../../shared/admin-users/types.js";

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_PAGE_SIZE = 200;

function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function iso(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function minIso(values: Array<string | null>): string | null {
  const present = values.filter((v): v is string => Boolean(v)).sort();
  return present[0] ?? null;
}

function maxIso(values: Array<string | null>): string | null {
  const present = values.filter((v): v is string => Boolean(v)).sort();
  return present[present.length - 1] ?? null;
}

function displayName(row: Record<string, unknown>): string | null {
  const display = typeof row.display_name === "string" ? row.display_name.trim() : "";
  if (display) return display;
  const full = [row.first_name, row.last_name]
    .filter((p): p is string => typeof p === "string" && p.trim() !== "")
    .map((p) => p.trim())
    .join(" ");
  return full || null;
}

interface ConsentRecord {
  marketing_consent: boolean;
  consent_source: string | null;
  consent_captured_at: string | null;
  unsubscribed_at: string | null;
  updated_at: string | null;
}

function consentStatus(c: ConsentRecord | undefined): MarketingConsentStatus {
  if (!c) return "not_consented";
  if (c.unsubscribed_at) return "unsubscribed";
  return c.marketing_consent ? "subscribed" : "not_consented";
}

async function loadConsent(): Promise<Map<string, ConsentRecord>> {
  const rows = await pgAll<Record<string, unknown>>(
    `SELECT email, marketing_consent, consent_source, consent_captured_at, unsubscribed_at, updated_at
     FROM user_marketing_consent`,
  );
  const map = new Map<string, ConsentRecord>();
  for (const r of rows) {
    map.set(normalizeEmail(r.email), {
      marketing_consent: Number(r.marketing_consent) === 1,
      consent_source: r.consent_source ? String(r.consent_source) : null,
      consent_captured_at: iso(r.consent_captured_at),
      unsubscribed_at: iso(r.unsubscribed_at),
      updated_at: iso(r.updated_at),
    });
  }
  return map;
}

async function loadKlaviyoQueue(): Promise<Map<string, KlaviyoSyncStatus>> {
  const rows = await pgAll<{ email: string; status: string }>(
    `SELECT email, status FROM klaviyo_subscription_queue`,
  );
  return new Map(rows.map((r) => [normalizeEmail(r.email), r.status as KlaviyoSyncStatus]));
}

function matchesQuery(q: string, ...fields: Array<string | null | undefined>): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((f) => typeof f === "string" && f.toLowerCase().includes(needle));
}

export function paginate<T>(rows: T[], page: number, pageSize: number): { slice: T[]; page: number; pageSize: number } {
  const size = Math.min(Math.max(Math.floor(pageSize) || 50, 1), MAX_PAGE_SIZE);
  const lastPage = Math.max(Math.ceil(rows.length / size), 1);
  const p = Math.min(Math.max(Math.floor(page) || 1, 1), lastPage);
  return { slice: rows.slice((p - 1) * size, p * size), page: p, pageSize: size };
}

// ---------------------------------------------------------------------------
// Writes (capture path only)
// ---------------------------------------------------------------------------

/**
 * Durable record that an email was submitted through a capture form. Never
 * records consent. A repeat submission from the same source only bumps the
 * activity fields — the original row is otherwise left as-is.
 */
export async function recordEmailLeadCapture(input: {
  email: string;
  source: string;
  signup_form?: string | null;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) return;
  await pgRun(
    `INSERT INTO email_lead_captures (id, email, source, signup_form)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email, source) DO UPDATE SET
       last_submitted_at = now(),
       submission_count = email_lead_captures.submission_count + 1`,
    [nanoid(16), email, input.source, input.signup_form ?? null],
  );
}

// ---------------------------------------------------------------------------
// Registered users (/admin/users)
// ---------------------------------------------------------------------------

export async function loadRegisteredUsers(now: Date = new Date()): Promise<RegisteredUserRow[]> {
  const [rows, consent, queue] = await Promise.all([
    pgAll<Record<string, unknown>>(
      `SELECT u.user_id, u.email, u.auth_provider, u.created_at, u.last_login_at,
              p.display_name, p.first_name, p.last_name,
              us.plan_id, us.status AS sub_status, us.source AS sub_source,
              us.expires_at, us.past_due_since,
              t.trial_expires_at,
              (SELECT count(*) FROM user_meal_history h WHERE h.user_id = u.user_id) AS meals_cooked,
              (SELECT count(*) FROM user_saved_recipes s WHERE s.user_id = u.user_id) AS recipes_saved
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.user_id
       LEFT JOIN user_subscriptions us ON us.user_id = u.user_id
       LEFT JOIN personal_pro_trials t ON t.user_id = u.user_id
       WHERE u.is_guest = 0`,
    ),
    loadConsent(),
    loadKlaviyoQueue(),
  ]);

  return rows.map((r) => {
    const email = normalizeEmail(r.email) || null;
    const subscription = r.plan_id
      ? ({
          plan_id: String(r.plan_id),
          status: String(r.sub_status),
          source: String(r.sub_source),
          expires_at: iso(r.expires_at),
          past_due_since: iso(r.past_due_since) ?? undefined,
        } as unknown as UserSubscription)
      : null;
    const trialExpires = iso(r.trial_expires_at);
    const paidPro = hasSubscribedPro(subscription, now);
    const trialPro = !paidPro && isProTrialActive(trialExpires ? { trial_expires_at: trialExpires } : null, now);

    let planDetail = "Free";
    if (paidPro) {
      const via = subscription?.source === "stripe" ? "Stripe" : subscription?.source === "admin_grant" ? "admin grant" : "self-selected";
      planDetail = subscription?.status === "past_due" ? `Pro · ${via} · payment past due` : `Pro · ${via}`;
    } else if (trialPro && trialExpires) {
      planDetail = `Pro trial · ends ${trialExpires.slice(0, 10)}`;
    }

    return {
      user_id: String(r.user_id),
      email,
      name: displayName(r),
      auth_provider: String(r.auth_provider),
      signup_date: iso(r.created_at) ?? "",
      last_login: iso(r.last_login_at),
      plan: paidPro || trialPro ? "pro" : "free",
      plan_detail: planDetail,
      consent: consentStatus(email ? consent.get(email) : undefined),
      klaviyo_sync: email ? (queue.get(email) ?? null) : null,
      meals_cooked: Number(r.meals_cooked ?? 0),
      recipes_saved: Number(r.recipes_saved ?? 0),
    };
  });
}

/** Core identity for one registered user from Postgres; null when no such non-guest user exists. */
export async function getRegisteredUser(userId: string): Promise<RegisteredUserRow | null> {
  const users = await loadRegisteredUsers();
  return users.find((u) => u.user_id === userId) ?? null;
}

export async function getLeadCapturesForEmail(
  email: string,
): Promise<Array<{ source: string; first_captured_at: string; last_submitted_at: string }>> {
  const rows = await pgAll<Record<string, unknown>>(
    `SELECT source, first_captured_at, last_submitted_at FROM email_lead_captures
     WHERE email = $1 ORDER BY last_submitted_at DESC`,
    [normalizeEmail(email)],
  );
  return rows.map((r) => ({
    source: String(r.source),
    first_captured_at: iso(r.first_captured_at) ?? "",
    last_submitted_at: iso(r.last_submitted_at) ?? "",
  }));
}

function userMatchesFilter(u: RegisteredUserRow, filter: RegisteredUserFilter, now: Date): boolean {
  switch (filter) {
    case "new_7d":
      return Date.parse(u.signup_date) >= now.getTime() - 7 * DAY_MS;
    case "active_30d":
      return Boolean(u.last_login) && Date.parse(u.last_login as string) >= now.getTime() - 30 * DAY_MS;
    case "pro":
      return u.plan === "pro";
    case "free":
      return u.plan === "free";
    case "subscribed":
      return u.consent === "subscribed";
    case "not_subscribed":
      return u.consent !== "subscribed";
    default:
      return true;
  }
}

export async function queryRegisteredUsers(opts: {
  filter?: RegisteredUserFilter;
  q?: string;
  page?: number;
  page_size?: number;
  all?: boolean;
  now?: Date;
}): Promise<RegisteredUserListResponse> {
  const now = opts.now ?? new Date();
  const filter = opts.filter ?? "all";
  const q = (opts.q ?? "").trim();
  const users = await loadRegisteredUsers(now);

  const matched = users
    .filter((u) => userMatchesFilter(u, filter, now))
    .filter((u) => matchesQuery(q, u.email, u.name, u.user_id))
    .sort((a, b) => b.signup_date.localeCompare(a.signup_date) || a.user_id.localeCompare(b.user_id));

  const summary = {
    total: users.length,
    new_7d: users.filter((u) => userMatchesFilter(u, "new_7d", now)).length,
    active_30d: users.filter((u) => userMatchesFilter(u, "active_30d", now)).length,
    pro: users.filter((u) => u.plan === "pro").length,
    subscribed: users.filter((u) => u.consent === "subscribed").length,
  };

  if (opts.all) {
    return { users: matched, total: matched.length, page: 1, page_size: matched.length, filter, query: q || null, summary };
  }
  const { slice, page, pageSize } = paginate(matched, opts.page ?? 1, opts.page_size ?? 50);
  return { users: slice, total: matched.length, page, page_size: pageSize, filter, query: q || null, summary };
}

// ---------------------------------------------------------------------------
// Unified email directory (/admin/signups)
// ---------------------------------------------------------------------------

interface DirectoryAccumulator {
  email: string;
  user_id: string | null;
  name: string | null;
  firsts: Array<string | null>;
  lasts: Array<string | null>;
  sources: Set<string>;
}

export async function loadEmailDirectory(): Promise<EmailDirectoryRow[]> {
  const [users, leads, links, consent, queue] = await Promise.all([
    pgAll<Record<string, unknown>>(
      `SELECT u.user_id, u.email, u.auth_provider, u.created_at, u.last_login_at,
              p.display_name, p.first_name, p.last_name
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.user_id
       WHERE u.is_guest = 0 AND u.email IS NOT NULL AND u.email <> ''`,
    ),
    pgAll<Record<string, unknown>>(
      `SELECT email, source, first_captured_at, last_submitted_at FROM email_lead_captures`,
    ),
    pgAll<Record<string, unknown>>(
      `SELECT lower(email) AS email, min(created_at) AS first_at, max(created_at) AS last_at
       FROM auth_magic_links GROUP BY lower(email)`,
    ),
    loadConsent(),
    loadKlaviyoQueue(),
  ]);

  const byEmail = new Map<string, DirectoryAccumulator>();
  const entry = (rawEmail: unknown): DirectoryAccumulator | null => {
    const email = normalizeEmail(rawEmail);
    if (!email || !email.includes("@")) return null;
    let acc = byEmail.get(email);
    if (!acc) {
      acc = { email, user_id: null, name: null, firsts: [], lasts: [], sources: new Set() };
      byEmail.set(email, acc);
    }
    return acc;
  };

  for (const u of users) {
    const acc = entry(u.email);
    if (!acc) continue;
    acc.user_id = String(u.user_id);
    acc.name = displayName(u);
    acc.firsts.push(iso(u.created_at));
    acc.lasts.push(iso(u.last_login_at) ?? iso(u.created_at));
    acc.sources.add(`account_${String(u.auth_provider)}`);
  }
  for (const l of leads) {
    const acc = entry(l.email);
    if (!acc) continue;
    acc.firsts.push(iso(l.first_captured_at));
    acc.lasts.push(iso(l.last_submitted_at));
    acc.sources.add(String(l.source));
  }
  for (const m of links) {
    const acc = entry(m.email);
    if (!acc) continue;
    acc.firsts.push(iso(m.first_at));
    acc.lasts.push(iso(m.last_at));
    acc.sources.add("sign_in_request");
  }
  // Consent rows only add an email when it was actually opted in through
  // Firehall Meals. Suppression-only rows written by Klaviyo webhooks (which
  // can belong to other brands' contacts in the shared Klaviyo account) do not.
  for (const [email, c] of consent) {
    if (!c.consent_captured_at && !byEmail.has(email)) continue;
    const acc = entry(email);
    if (!acc) continue;
    acc.firsts.push(c.consent_captured_at);
    acc.lasts.push(c.updated_at);
    if (c.consent_source) acc.sources.add(`opt_in_${c.consent_source}`);
  }

  const rows: EmailDirectoryRow[] = [];
  for (const acc of byEmail.values()) {
    const c = consent.get(acc.email);
    const status = consentStatus(c);
    const category: EmailCategory = acc.user_id
      ? "registered_user"
      : status === "subscribed"
        ? "marketing_subscriber"
        : "other";
    const first = minIso(acc.firsts) ?? "";
    rows.push({
      email: acc.email,
      category,
      user_id: acc.user_id,
      name: acc.name,
      first_seen: first,
      last_seen: maxIso(acc.lasts) ?? first,
      sources: [...acc.sources].sort(),
      consent: status,
      consent_source: c?.consent_source ?? null,
      consent_captured_at: c?.consent_captured_at ?? null,
      unsubscribed_at: c?.unsubscribed_at ?? null,
      klaviyo_sync: queue.get(acc.email) ?? null,
    });
  }
  return rows;
}

function directoryMatchesFilter(r: EmailDirectoryRow, filter: EmailDirectoryFilter): boolean {
  switch (filter) {
    case "registered_users":
      return r.category === "registered_user";
    case "marketing_subscribers":
      return r.consent === "subscribed";
    case "other_emails":
      return r.category === "other";
    case "unsubscribed":
      return r.consent === "unsubscribed";
    default:
      return true;
  }
}

export function summarizeDirectory(rows: EmailDirectoryRow[]): EmailDirectorySummary {
  return {
    total_unique_emails: rows.length,
    registered_users: rows.filter((r) => r.category === "registered_user").length,
    marketing_subscribers: rows.filter((r) => r.consent === "subscribed").length,
    registered_and_subscribed: rows.filter((r) => r.category === "registered_user" && r.consent === "subscribed").length,
    other_emails: rows.filter((r) => r.category === "other").length,
    unsubscribed: rows.filter((r) => r.consent === "unsubscribed").length,
  };
}

export async function queryEmailDirectory(opts: {
  filter?: EmailDirectoryFilter;
  q?: string;
  source?: string | null;
  page?: number;
  page_size?: number;
  all?: boolean;
}): Promise<EmailDirectoryListResponse> {
  const filter = opts.filter ?? "all";
  const q = (opts.q ?? "").trim();
  const source = opts.source?.trim() || null;
  const rows = await loadEmailDirectory();

  const matched = rows
    .filter((r) => directoryMatchesFilter(r, filter))
    .filter((r) => !source || r.sources.includes(source))
    .filter((r) => matchesQuery(q, r.email, r.name))
    .sort((a, b) => b.last_seen.localeCompare(a.last_seen) || a.email.localeCompare(b.email));

  const base = {
    filter,
    source_filter: source,
    query: q || null,
    summary: summarizeDirectory(rows),
    sources_available: [...new Set(rows.flatMap((r) => r.sources))].sort(),
  };
  if (opts.all) {
    return { ...base, emails: matched, total: matched.length, page: 1, page_size: matched.length };
  }
  const { slice, page, pageSize } = paginate(matched, opts.page ?? 1, opts.page_size ?? 50);
  return { ...base, emails: slice, total: matched.length, page, page_size: pageSize };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** RFC 4180 quoting plus a guard against spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

export function registeredUsersCsv(users: RegisteredUserRow[]): string {
  return toCsv(
    ["user_id", "email", "name", "auth_provider", "signup_date", "last_login", "plan", "plan_detail", "marketing_consent", "klaviyo_sync", "meals_cooked", "recipes_saved"],
    users.map((u) => [u.user_id, u.email, u.name, u.auth_provider, u.signup_date, u.last_login, u.plan, u.plan_detail, u.consent, u.klaviyo_sync ?? "", u.meals_cooked, u.recipes_saved]),
  );
}

export function emailDirectoryCsv(rows: EmailDirectoryRow[]): string {
  return toCsv(
    ["email", "category", "user_id", "name", "first_seen", "last_seen", "sources", "marketing_consent", "consent_source", "consent_captured_at", "unsubscribed_at", "klaviyo_sync"],
    rows.map((r) => [r.email, r.category, r.user_id, r.name, r.first_seen, r.last_seen, r.sources.join(" | "), r.consent, r.consent_source, r.consent_captured_at, r.unsubscribed_at, r.klaviyo_sync ?? ""]),
  );
}
