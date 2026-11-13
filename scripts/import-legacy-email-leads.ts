#!/usr/bin/env tsx
/**
 * One-time import of legacy SQLite email_leads into Postgres email_lead_captures.
 *
 * Input: the CSV from GET /api/admin/leads/export?legacy=1&filter=all (header
 * lead_id,email,source,signup_form,captured_at,...,last_activity,...).
 *
 *   npx tsx scripts/import-legacy-email-leads.ts <file.csv>            # dry run
 *   npx tsx scripts/import-legacy-email-leads.ts <file.csv> --apply    # write
 *
 * Insert-only: existing (email, source) rows are left untouched, and marketing
 * consent is never written (consent was migrated separately and lives only in
 * user_marketing_consent).
 */
import fs from "node:fs";
import { nanoid } from "nanoid";
import { loadProjectEnv } from "../server/lib/load-project-env.js";

export interface LegacyLeadRow {
  email: string;
  source: string;
  signup_form: string | null;
  captured_at: string | null;
  last_activity: string | null;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

function validIso(value: string | undefined): string | null {
  if (!value) return null;
  return Number.isNaN(Date.parse(value)) ? null : new Date(value).toISOString();
}

export function parseLegacyLeadsCsv(text: string): LegacyLeadRow[] {
  const [header, ...body] = parseCsv(text);
  if (!header) return [];
  const col = (name: string) => header.indexOf(name);
  const iEmail = col("email");
  const iSource = col("source");
  if (iEmail < 0 || iSource < 0) throw new Error("CSV must have email and source columns");
  const iForm = col("signup_form");
  const iCaptured = col("captured_at");
  const iLast = col("last_activity");

  const out: LegacyLeadRow[] = [];
  for (const r of body) {
    const email = (r[iEmail] ?? "").trim().toLowerCase();
    if (!email.includes("@")) continue;
    out.push({
      email,
      source: (r[iSource] ?? "").trim() || "unknown",
      signup_form: iForm >= 0 && r[iForm] ? r[iForm] : null,
      captured_at: iCaptured >= 0 ? validIso(r[iCaptured]) : null,
      last_activity: iLast >= 0 ? validIso(r[iLast]) : null,
    });
  }
  return out;
}

/** Returns how many rows were inserted (0 for rows that already existed). */
export async function importLegacyLeads(
  rows: LegacyLeadRow[],
  exec: (text: string, params: unknown[]) => Promise<{ rowCount?: number | null; affectedRows?: number }>,
): Promise<number> {
  let inserted = 0;
  for (const r of rows) {
    const result = await exec(
      `INSERT INTO email_lead_captures
         (id, email, source, signup_form, first_captured_at, last_submitted_at, imported_from)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()), COALESCE($6::timestamptz, $5::timestamptz, now()), 'sqlite_email_leads')
       ON CONFLICT (email, source) DO NOTHING`,
      [nanoid(16), r.email, r.source, r.signup_form, r.captured_at, r.last_activity],
    );
    inserted += Number(result.rowCount ?? result.affectedRows ?? 0);
  }
  return inserted;
}

async function main(): Promise<void> {
  const file = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!file || !fs.existsSync(file)) {
    console.error("Usage: import-legacy-email-leads.ts <legacy-leads.csv> [--apply]");
    process.exit(1);
  }
  const rows = parseLegacyLeadsCsv(fs.readFileSync(file, "utf8"));
  const unique = new Set(rows.map((r) => r.email)).size;
  console.log(`Parsed ${rows.length} lead rows (${unique} unique emails).`);
  if (!apply) {
    console.log("Dry run — nothing written. Re-run with --apply to insert.");
    return;
  }

  loadProjectEnv();
  const { getPgPool, closePgPool } = await import("../server/db/pg-client.js");
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").host;
    } catch {
      return "(unparseable DATABASE_URL)";
    }
  })();
  console.log(`Target database host: ${host}`);
  const pool = getPgPool();
  const inserted = await importLegacyLeads(rows, (text, params) => pool.query(text, params));
  console.log(`Inserted ${inserted} new rows; ${rows.length - inserted} already present and left unchanged.`);
  await closePgPool();
}

if (process.argv[1] && /import-legacy-email-leads/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
