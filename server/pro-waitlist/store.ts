/**
 * Pro early-access waitlist (Postgres pro_waitlist_signups). Postgres is the
 * record of the signup; Klaviyo is synced afterwards and retried from here, so
 * a Klaviyo outage never loses or blocks a registration.
 */
import { isPgConfigured } from "../db/pg-client.js";
import { pgAll, pgOne, pgRun } from "../db/pg-sql.js";
import { getConsent } from "../marketing-consent/store.js";
import { isPermanentKlaviyoError, syncProWaitlistSignup, validateKlaviyoConfig } from "../klaviyo.js";
import { log, logError, maskEmail } from "../logger.js";

export const PRO_WAITLIST_CONSENT_SCOPE = "pro_launch_notifications";
export const PRO_WAITLIST_CONSENT_TEXT =
  "Email me when Firehall Meals Pro launches. Pro launch updates only — not the recipe newsletter.";
export const PRO_WAITLIST_MAX_ATTEMPTS = 8;
const CLAIM_LEASE_MS = 5 * 60 * 1000;

export type ProWaitlistKlaviyoStatus = "pending" | "synced" | "skipped_suppressed" | "failed";

export interface ProWaitlistEntry {
  email: string;
  user_id: string | null;
  source: string;
  consent_scope: string;
  joined_at: string;
  klaviyo_status: ProWaitlistKlaviyoStatus;
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function toEntry(row: Record<string, unknown>): ProWaitlistEntry {
  return {
    email: String(row.email),
    user_id: row.user_id ? String(row.user_id) : null,
    source: String(row.source),
    consent_scope: String(row.consent_scope),
    joined_at: new Date(row.joined_at as string).toISOString(),
    klaviyo_status: String(row.klaviyo_status) as ProWaitlistKlaviyoStatus,
  };
}

export async function getProWaitlistEntry(email: string): Promise<ProWaitlistEntry | null> {
  const row = await pgOne<Record<string, unknown>>(`SELECT * FROM pro_waitlist_signups WHERE email = $1`, [normalize(email)]);
  return row ? toEntry(row) : null;
}

/**
 * Idempotent join. Returns already_joined (with the original entry) for a
 * repeat signup; the original source/timestamp are never overwritten.
 */
export async function joinProWaitlist(input: {
  email: string;
  userId?: string | null;
  source: string;
}): Promise<{ status: "joined" | "already_joined"; entry: ProWaitlistEntry }> {
  const email = normalize(input.email);
  const inserted = await pgOne<Record<string, unknown>>(
    `INSERT INTO pro_waitlist_signups (email, user_id, source, consent_scope, consent_text)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO NOTHING
     RETURNING *`,
    [email, input.userId ?? null, input.source.slice(0, 80), PRO_WAITLIST_CONSENT_SCOPE, PRO_WAITLIST_CONSENT_TEXT],
  );
  if (inserted) return { status: "joined", entry: toEntry(inserted) };

  if (input.userId) {
    await pgRun(`UPDATE pro_waitlist_signups SET user_id = $2 WHERE email = $1 AND user_id IS NULL`, [email, input.userId]);
  }
  const existing = await getProWaitlistEntry(email);
  if (!existing) throw new Error("waitlist row vanished after conflict");
  return { status: "already_joined", entry: existing };
}

/** Minutes until the next retry: 5, 15, 45 … capped at 12 hours. */
function retryDelayMs(attempts: number): number {
  return Math.min(5 * 3 ** Math.max(0, attempts - 1), 12 * 60) * 60 * 1000;
}

async function recordSyncOutcome(email: string, attempts: number, status: ProWaitlistKlaviyoStatus, error: string | null): Promise<void> {
  await pgRun(
    `UPDATE pro_waitlist_signups SET
       klaviyo_status = $2, klaviyo_attempts = $3, klaviyo_last_error = $4,
       klaviyo_next_attempt_at = now() + ($5 || ' milliseconds')::interval,
       klaviyo_synced_at = CASE WHEN $2 = 'synced' THEN now() ELSE klaviyo_synced_at END
     WHERE email = $1`,
    [email, status, attempts, error?.slice(0, 500) ?? null, String(retryDelayMs(attempts))],
  );
}

/** One sync attempt for a stored signup. Never throws; the outcome is persisted. */
export async function syncProWaitlistEntry(email: string, previousAttempts: number): Promise<ProWaitlistKlaviyoStatus> {
  const entry = await getProWaitlistEntry(email);
  if (!entry || entry.klaviyo_status === "synced" || entry.klaviyo_status === "skipped_suppressed") {
    return entry?.klaviyo_status ?? "failed";
  }
  const attempts = previousAttempts + 1;
  try {
    // Someone who unsubscribed from Firehall Meals email is never re-subscribed by a waitlist request.
    const consent = await getConsent(email);
    const result = consent?.unsubscribed_at
      ? "skipped_suppressed"
      : await syncProWaitlistSignup(email, { source: entry.source, joined_at: entry.joined_at });
    await recordSyncOutcome(email, attempts, result, null);
    log(`[pro-waitlist] klaviyo ${result} email=${maskEmail(email)}`, "klaviyo");
    return result;
  } catch (err) {
    const status: ProWaitlistKlaviyoStatus =
      isPermanentKlaviyoError(err) || attempts >= PRO_WAITLIST_MAX_ATTEMPTS ? "failed" : "pending";
    await recordSyncOutcome(email, attempts, status, err instanceof Error ? err.message : String(err)).catch((e) =>
      logError("pro-waitlist", "could not record sync failure", e),
    );
    logError("pro-waitlist", `klaviyo sync ${status} email=${maskEmail(email)} attempt=${attempts}`, err);
    return status;
  }
}

/** Retries due pending rows once (lease prevents double-sends across instances). */
export async function processProWaitlistSyncQueue(limit = 10): Promise<number> {
  if (!validateKlaviyoConfig().ok || !isPgConfigured()) return 0;
  const due = await pgAll<{ email: string; klaviyo_attempts: number }>(
    `UPDATE pro_waitlist_signups SET klaviyo_next_attempt_at = now() + ($2 || ' milliseconds')::interval
     WHERE email IN (
       SELECT email FROM pro_waitlist_signups
       WHERE klaviyo_status = 'pending' AND klaviyo_next_attempt_at <= now()
       ORDER BY klaviyo_next_attempt_at LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING email, klaviyo_attempts`,
    [limit, String(CLAIM_LEASE_MS)],
  );
  for (const row of due) await syncProWaitlistEntry(row.email, row.klaviyo_attempts);
  return due.length;
}

let timer: NodeJS.Timeout | null = null;

export function startProWaitlistSyncWorker(intervalMs = 5 * 60 * 1000): void {
  if (timer || !isPgConfigured()) return;
  const tick = () =>
    void processProWaitlistSyncQueue().catch((err) => {
      if ((err as { code?: string })?.code === "42P01") return; // migration 0023 not applied yet
      logError("pro-waitlist", "sync worker failed", err);
    });
  timer = setInterval(tick, intervalMs);
  timer.unref();
  setTimeout(tick, 45_000).unref();
}

/** Admin view: normalized waitlist emails with join time and Klaviyo sync state. */
export async function loadProWaitlist(): Promise<Map<string, { joined_at: string; klaviyo_status: ProWaitlistKlaviyoStatus }>> {
  const rows = await pgAll<{ email: string; joined_at: Date; klaviyo_status: string }>(
    `SELECT email, joined_at, klaviyo_status FROM pro_waitlist_signups`,
  );
  return new Map(
    rows.map((r) => [
      normalize(r.email),
      { joined_at: new Date(r.joined_at).toISOString(), klaviyo_status: r.klaviyo_status as ProWaitlistKlaviyoStatus },
    ]),
  );
}
