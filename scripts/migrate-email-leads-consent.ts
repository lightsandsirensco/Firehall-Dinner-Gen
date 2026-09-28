/**
 * One-time backfill: copies already-consented (marketing_consent = 1) rows
 * from the legacy SQLite email_leads table into the new Postgres
 * user_marketing_consent source of truth (server/marketing-consent/store.ts).
 *
 * Rules (see task spec):
 *   - only marketing_consent = 1 becomes opted-in — never touches/creates a
 *     row for a non-consented lead.
 *   - normalizes + dedupes by email — the EARLIEST recorded consent
 *     timestamp per email wins (closest to the true original opt-in date).
 *   - preserves consent timestamp + source (prefixed `legacy_email_leads:`).
 *   - does NOT delete/modify any SQLite row — read-only against SQLite.
 *   - safe to re-run: recordConsentOptIn() is an idempotent upsert.
 *
 * Run with: npx tsx scripts/migrate-email-leads-consent.ts
 */
import "dotenv/config";
import { getSharedLocalDb } from "../server/sqlite.js";
import { runDbMigrations } from "../server/db/migrate.js";
import { recordConsentOptIn } from "../server/marketing-consent/store.js";
import { closePgPool } from "../server/db/pg-client.js";

interface LeadRow {
  email: string;
  source: string;
  consent_captured_at: string | null;
  captured_at: string;
}

async function main(): Promise<void> {
  await runDbMigrations();
  const db = await getSharedLocalDb();

  const rows = db
    .prepare(
      `SELECT email, source, consent_captured_at, captured_at FROM email_leads WHERE marketing_consent = 1`,
    )
    .all() as LeadRow[];

  const byEmail = new Map<string, { source: string; capturedAt: string }>();
  let skippedInvalid = 0;
  let duplicatesCollapsed = 0;

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      skippedInvalid++;
      continue;
    }
    const capturedAt = row.consent_captured_at || row.captured_at;
    const existing = byEmail.get(email);
    if (existing) {
      duplicatesCollapsed++;
      // Keep the EARLIEST timestamp/source as canonical for this email.
      if (capturedAt < existing.capturedAt) {
        byEmail.set(email, { source: row.source, capturedAt });
      }
      continue;
    }
    byEmail.set(email, { source: row.source, capturedAt });
  }

  let migrated = 0;
  for (const [email, { source, capturedAt }] of byEmail) {
    await recordConsentOptIn({
      email,
      source: `legacy_email_leads:${source}`,
      capturedAt,
    });
    migrated++;
  }

  console.log(
    `[migrate-email-leads-consent] scanned_consented_rows=${rows.length} skipped_invalid_email=${skippedInvalid} ` +
      `duplicates_collapsed=${duplicatesCollapsed} unique_emails_migrated=${migrated}`,
  );
  console.log(
    `[migrate-email-leads-consent] SQLite email_leads left completely untouched (read-only source for this migration).`,
  );
}

main()
  .then(async () => {
    await closePgPool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[migrate-email-leads-consent] FAILED:", err);
    await closePgPool();
    process.exit(1);
  });
