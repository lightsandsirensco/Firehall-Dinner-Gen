/**
 * Durable retry queue for Klaviyo marketing subscriptions (Postgres
 * klaviyo_subscription_queue). Survives restarts and is shared by every
 * Autoscale instance; claiming a row pushes next_attempt_at forward first so
 * two instances never send the same row at once.
 */
import { isPgConfigured } from "../db/pg-client.js";
import { pgAll, pgOne, pgRun } from "../db/pg-sql.js";

export const KLAVIYO_MAX_ATTEMPTS = 8;
const CLAIM_LEASE_MS = 5 * 60 * 1000;

export interface KlaviyoQueueRow {
  email: string;
  attempts: number;
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** Minutes until the next retry: 5, 15, 45 … capped at 12 hours. */
export function klaviyoRetryDelayMs(attempts: number): number {
  return Math.min(5 * 3 ** Math.max(0, attempts - 1), 12 * 60) * 60 * 1000;
}

export async function enqueueKlaviyoSubscription(email: string, error: string, permanent: boolean): Promise<void> {
  if (!isPgConfigured()) return;
  await pgRun(
    `INSERT INTO klaviyo_subscription_queue (email, status, attempts, last_error, next_attempt_at)
     VALUES ($1, $2, 1, $3, now() + ($4 || ' milliseconds')::interval)
     ON CONFLICT (email) DO UPDATE SET
       status = EXCLUDED.status,
       attempts = klaviyo_subscription_queue.attempts + 1,
       last_error = EXCLUDED.last_error,
       next_attempt_at = EXCLUDED.next_attempt_at,
       updated_at = now()`,
    [normalize(email), permanent ? "failed" : "pending", error.slice(0, 500), String(klaviyoRetryDelayMs(1))],
  );
}

export async function markKlaviyoSubscriptionSent(email: string): Promise<void> {
  if (!isPgConfigured()) return;
  await pgRun(
    `UPDATE klaviyo_subscription_queue SET status = 'sent', last_error = NULL, updated_at = now()
     WHERE email = $1 AND status <> 'sent'`,
    [normalize(email)],
  );
}

export async function recordKlaviyoRetryFailure(row: KlaviyoQueueRow, error: string, permanent: boolean): Promise<void> {
  const attempts = row.attempts + 1;
  const status = permanent || attempts >= KLAVIYO_MAX_ATTEMPTS ? "failed" : "pending";
  await pgRun(
    `UPDATE klaviyo_subscription_queue
     SET status = $2, attempts = $3, last_error = $4,
         next_attempt_at = now() + ($5 || ' milliseconds')::interval, updated_at = now()
     WHERE email = $1`,
    [row.email, status, attempts, error.slice(0, 500), String(klaviyoRetryDelayMs(attempts))],
  );
}

export async function cancelKlaviyoSubscription(email: string, reason: string): Promise<void> {
  await pgRun(
    `UPDATE klaviyo_subscription_queue SET status = 'cancelled', last_error = $2, updated_at = now() WHERE email = $1`,
    [normalize(email), reason],
  );
}

/** Claims due rows (lease prevents double-sends across instances). */
export async function claimDueKlaviyoSubscriptions(limit = 10): Promise<KlaviyoQueueRow[]> {
  return pgAll<KlaviyoQueueRow>(
    `UPDATE klaviyo_subscription_queue SET next_attempt_at = now() + ($2 || ' milliseconds')::interval
     WHERE email IN (
       SELECT email FROM klaviyo_subscription_queue
       WHERE status = 'pending' AND next_attempt_at <= now()
       ORDER BY next_attempt_at LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING email, attempts`,
    [limit, String(CLAIM_LEASE_MS)],
  );
}

/** Retry is allowed only while the Postgres consent record is an active opt-in. */
export async function hasActiveMarketingConsent(email: string): Promise<boolean> {
  const row = await pgOne<{ ok: boolean }>(
    `SELECT (marketing_consent = 1 AND unsubscribed_at IS NULL) AS ok
     FROM user_marketing_consent WHERE lower(email) = $1`,
    [normalize(email)],
  );
  return Boolean(row?.ok);
}

export async function getKlaviyoQueueSummary(): Promise<{
  pending: number;
  failed: number;
  recent_failures: Array<{ email: string; attempts: number; last_error: string | null; updated_at: string }>;
} | null> {
  if (!isPgConfigured()) return null;
  try {
    const counts = await pgAll<{ status: string; n: number }>(
      `SELECT status, count(*)::int AS n FROM klaviyo_subscription_queue WHERE status IN ('pending','failed') GROUP BY status`,
    );
    const recent = await pgAll<{ email: string; attempts: number; last_error: string | null; updated_at: string }>(
      `SELECT email, attempts, last_error, updated_at::text FROM klaviyo_subscription_queue
       WHERE status IN ('pending','failed') ORDER BY updated_at DESC LIMIT 20`,
    );
    const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
    return { pending: n("pending"), failed: n("failed"), recent_failures: recent };
  } catch {
    return null;
  }
}
