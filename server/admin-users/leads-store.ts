/**
 * Email lead capture — local CRM store (Klaviyo is outbound-only).
 */

import { nanoid } from "nanoid";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { runDbMigrations } from "../db/migrate.js";
import type { AdminLeadFilter, AdminLeadRow, EmailLeadSource } from "../../shared/admin-users/types.js";

let db: SqliteDatabase;

export function bindAdminLeadsDb(database: SqliteDatabase): void {
  db = database;
}

export async function initAdminLeadsStore(): Promise<void> {
  await runDbMigrations();
  db = await getSharedLocalDb();
}

function getDb(): SqliteDatabase {
  if (!db) throw new Error("Admin leads store not initialized");
  return db;
}

const SOURCE_MAP: Record<string, EmailLeadSource> = {
  homepage: "homepage",
  generator: "generator",
  generation: "generator",
  "red-lead-page": "red_lead",
  red_lead: "red_lead",
  hall_program: "hall_program",
  pricing: "pricing",
  plans: "pricing",
  pilot: "pilot",
  shopping_list: "shopping_list",
};

export function normalizeLeadSource(raw: string): EmailLeadSource {
  const key = raw.trim().toLowerCase().replace(/-/g, "_");
  return SOURCE_MAP[key] ?? SOURCE_MAP[raw.trim().toLowerCase()] ?? "unknown";
}

export function recordEmailLead(input: {
  email: string;
  source: string;
  signup_form?: string;
  klaviyo_synced?: boolean;
  metadata?: Record<string, string | number | boolean>;
}): void {
  const d = getDb();
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return;

  const source = normalizeLeadSource(input.source);
  const existing = d
    .prepare(`SELECT lead_id FROM email_leads WHERE email = ? AND source = ?`)
    .get(email, source) as { lead_id: string } | undefined;

  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;
  const now = new Date().toISOString();

  if (existing) {
    d.prepare(
      `UPDATE email_leads SET
        last_activity_at = ?,
        klaviyo_synced = CASE WHEN ? = 1 THEN 1 ELSE klaviyo_synced END,
        metadata_json = COALESCE(?, metadata_json)
       WHERE lead_id = ?`,
    ).run(now, input.klaviyo_synced ? 1 : 0, metadataJson, existing.lead_id);
    syncLeadConversionsForEmail(email);
    return;
  }

  d.prepare(
    `INSERT INTO email_leads (
      lead_id, email, source, signup_form, captured_at, last_activity_at,
      klaviyo_synced, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    nanoid(12),
    email,
    source,
    input.signup_form ?? null,
    now,
    now,
    input.klaviyo_synced ? 1 : 0,
    metadataJson,
  );
  syncLeadConversionsForEmail(email);
}

function syncLeadConversionsForEmail(email: string): void {
  const d = getDb();
  const user = d
    .prepare(`SELECT user_id FROM users WHERE lower(email) = ? AND is_guest = 0 LIMIT 1`)
    .get(email) as { user_id: string } | undefined;

  if (!user) return;

  const hallCreated = d
    .prepare(
      `SELECT 1 FROM hall_memberships hm
       JOIN users u ON u.user_id = hm.user_id
       WHERE lower(u.email) = ? LIMIT 1`,
    )
    .get(email);

  d.prepare(
    `UPDATE email_leads SET
      converted_user_id = ?,
      hall_created = CASE WHEN ? IS NOT NULL THEN 1 ELSE hall_created END,
      last_activity_at = datetime('now')
     WHERE lower(email) = ?`,
  ).run(user.user_id, hallCreated ? 1 : null, email);
}

export function syncAllLeadConversions(): void {
  const d = getDb();
  const emails = d
    .prepare(`SELECT DISTINCT email FROM email_leads WHERE converted_user_id IS NULL`)
    .all() as Array<{ email: string }>;
  for (const row of emails) {
    syncLeadConversionsForEmail(row.email);
  }

  const withUsers = d
    .prepare(`SELECT DISTINCT lower(email) AS email FROM users WHERE email IS NOT NULL AND is_guest = 0`)
    .all() as Array<{ email: string }>;
  for (const row of withUsers) {
    syncLeadConversionsForEmail(row.email);
  }
}

export function backfillLeadsFromAnalytics(): number {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT metadata_json, occurred_at FROM analytics_events
       WHERE event_type = 'email_capture'
       ORDER BY occurred_at ASC`,
    )
    .all() as Array<{ metadata_json: string; occurred_at: string }>;

  let inserted = 0;
  for (const row of rows) {
    try {
      const meta = JSON.parse(row.metadata_json || "{}") as Record<string, string>;
      const email = meta.email?.trim().toLowerCase();
      if (!email || !email.includes("@")) continue;
      const source = normalizeLeadSource(meta.source || meta.capture_type || "unknown");
      const exists = d
        .prepare(`SELECT 1 FROM email_leads WHERE email = ? AND source = ?`)
        .get(email, source);
      if (exists) continue;
      d.prepare(
        `INSERT INTO email_leads (lead_id, email, source, signup_form, captured_at, last_activity_at, klaviyo_synced, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      ).run(nanoid(12), email, source, meta.capture_type ?? null, row.occurred_at, row.occurred_at, row.metadata_json);
      inserted++;
    } catch {
      /* skip malformed */
    }
  }
  syncAllLeadConversions();
  return inserted;
}

function leadFilterClause(filter: AdminLeadFilter): { where: string; params: unknown[] } {
  switch (filter) {
    case "homepage":
    case "generator":
    case "red_lead":
    case "hall_program":
    case "pricing":
    case "pilot":
      return { where: "el.source = ?", params: [filter] };
    case "shopping_list":
      return { where: "el.source = 'shopping_list'", params: [] };
    case "klaviyo_only":
      return { where: "el.klaviyo_synced = 1", params: [] };
    case "converted":
      return { where: "el.converted_user_id IS NOT NULL", params: [] };
    case "not_converted":
      return { where: "el.converted_user_id IS NULL", params: [] };
    case "hall_created":
      return { where: "el.hall_created = 1", params: [] };
    default:
      return { where: "1=1", params: [] };
  }
}

function rowToLead(row: Record<string, unknown>): AdminLeadRow {
  return {
    lead_id: String(row.lead_id),
    email: String(row.email),
    source: String(row.source) as EmailLeadSource,
    signup_form: row.signup_form ? String(row.signup_form) : null,
    captured_at: String(row.captured_at),
    converted_to_user: Boolean(row.converted_user_id),
    converted_user_id: row.converted_user_id ? String(row.converted_user_id) : null,
    hall_created: Number(row.hall_created) === 1,
    last_activity: row.last_activity_at ? String(row.last_activity_at) : null,
    klaviyo_synced: Number(row.klaviyo_synced) === 1,
  };
}

export function listEmailLeads(filter: AdminLeadFilter = "all", limit = 500): AdminLeadRow[] {
  const d = getDb();
  syncAllLeadConversions();
  const { where, params } = leadFilterClause(filter);
  const rows = d
    .prepare(
      `SELECT * FROM email_leads el WHERE ${where}
       ORDER BY el.captured_at DESC LIMIT ?`,
    )
    .all(...(params as Array<string | number>), limit) as Array<Record<string, unknown>>;
  return rows.map(rowToLead);
}

export function countEmailLeads(filter: AdminLeadFilter = "all"): number {
  const d = getDb();
  const { where, params } = leadFilterClause(filter);
  const row = d
    .prepare(`SELECT COUNT(*) AS c FROM email_leads el WHERE ${where}`)
    .get(...(params as Array<string | number>)) as { c: number };
  return Number(row?.c ?? 0);
}

export function getLeadsForEmail(email: string): AdminLeadRow[] {
  const d = getDb();
  const rows = d
    .prepare(`SELECT * FROM email_leads WHERE lower(email) = ? ORDER BY captured_at DESC`)
    .all(email.trim().toLowerCase()) as Array<Record<string, unknown>>;
  return rows.map(rowToLead);
}

export function markLeadKlaviyoSynced(email: string): void {
  const d = getDb();
  d.prepare(`UPDATE email_leads SET klaviyo_synced = 1 WHERE lower(email) = ?`).run(
    email.trim().toLowerCase(),
  );
}
