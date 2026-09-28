/**
 * Postgres marketing-CONSENT source of truth (user_marketing_consent).
 *
 * Account creation, Pro purchase, and shop purchase must NEVER call
 * recordConsentOptIn() — only an explicit, unchecked-by-default opt-in
 * action (signup checkbox, lead-capture checkbox, or the one-time legacy
 * migration of already-consented SQLite leads) may. Absence of a row for
 * an email means "not consented" — a safe default that requires no extra
 * bookkeeping for the (common) unchecked case.
 *
 * linkExistingConsentToUser() is safe to call unconditionally on every
 * sign-in/signup, regardless of whether this signup's own checkbox was
 * checked — it only ever fills in a NULL user_id on an existing row and
 * never touches marketing_consent/unsubscribed_at, so a lead who opted in
 * before creating an account keeps that consent, and a lead who never
 * consented is never silently upgraded to "subscribed" just by signing up.
 */
import { nanoid } from "nanoid";
import { pgOne, pgRun } from "../db/pg-sql.js";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface ConsentRow {
  id: string;
  email: string;
  user_id: string | null;
  marketing_consent: boolean;
  consent_source: string | null;
  consent_captured_at: string | null;
  unsubscribed_at: string | null;
}

export async function getConsent(email: string): Promise<ConsentRow | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const row = await pgOne<Record<string, unknown>>(
    `SELECT id, email, user_id, marketing_consent, consent_source, consent_captured_at, unsubscribed_at
     FROM user_marketing_consent WHERE email = $1`,
    [normalized],
  );
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    user_id: row.user_id ? String(row.user_id) : null,
    marketing_consent: Number(row.marketing_consent) === 1,
    consent_source: row.consent_source ? String(row.consent_source) : null,
    consent_captured_at: row.consent_captured_at ? new Date(row.consent_captured_at as string).toISOString() : null,
    unsubscribed_at: row.unsubscribed_at ? new Date(row.unsubscribed_at as string).toISOString() : null,
  };
}

/** True only if a row exists AND marketing_consent = true. No row = not consented (safe default). */
export async function hasMarketingConsent(email: string): Promise<boolean> {
  const row = await getConsent(email);
  return row?.marketing_consent === true;
}

/**
 * Records an EXPLICIT opt-in (checkbox checked). Idempotent — safe to call
 * repeatedly. Re-opting in always clears any prior unsubscribed_at, since
 * this is a deliberate NEW consent action by the user (as opposed to an
 * automated profile sync, which must never touch this table's consent
 * fields at all).
 */
export async function recordConsentOptIn(input: {
  email: string;
  userId?: string | null;
  source: string;
  capturedAt?: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) return;
  const capturedAt = input.capturedAt ?? new Date().toISOString();

  await pgRun(
    `INSERT INTO user_marketing_consent
       (id, email, user_id, marketing_consent, consent_source, consent_captured_at, unsubscribed_at, updated_at, created_at)
     VALUES ($1, $2, $3, 1, $4, $5, NULL, now(), now())
     ON CONFLICT (email) DO UPDATE SET
       marketing_consent = 1,
       consent_source = excluded.consent_source,
       consent_captured_at = excluded.consent_captured_at,
       unsubscribed_at = NULL,
       user_id = COALESCE(user_marketing_consent.user_id, excluded.user_id),
       updated_at = now()`,
    [nanoid(16), email, input.userId ?? null, input.source, capturedAt],
  );
}

/**
 * Links a user account to any pre-existing consent row for the same email
 * WITHOUT changing consent/unsubscribed state. Safe to call on every
 * sign-in/signup: no-op if no row exists yet, or if a user_id is already
 * linked (never reassigns ownership).
 */
export async function linkExistingConsentToUser(email: string, userId: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized || !userId) return;
  await pgRun(
    `UPDATE user_marketing_consent SET user_id = $1, updated_at = now()
     WHERE email = $2 AND user_id IS NULL`,
    [userId, normalized],
  );
}

/**
 * Suppresses an email per an inbound Klaviyo webhook (unsubscribed /
 * manually suppressed). Upserts defensively so an email that never had a
 * local row (e.g. subscribed directly inside the Klaviyo UI) is still
 * suppressed locally going forward — a later profile sync must never
 * re-subscribe it, and profile syncs never call list-subscribe anyway (see
 * server/klaviyo.ts upsertKlaviyoProfile), so this is the only write path
 * that can ever flip marketing_consent back to false.
 */
export async function recordUnsubscribe(email: string, source: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) return;
  await pgRun(
    `INSERT INTO user_marketing_consent (id, email, marketing_consent, consent_source, unsubscribed_at, updated_at, created_at)
     VALUES ($1, $2, 0, $3, now(), now(), now())
     ON CONFLICT (email) DO UPDATE SET
       marketing_consent = 0,
       unsubscribed_at = now(),
       updated_at = now()`,
    [nanoid(16), normalized, source],
  );
}

export interface KlaviyoSafeProfileProperties {
  email: string;
  account_status: "active" | "guest";
  plan: "free" | "pro";
  signup_date: string;
  city: string | null;
  province_state: string | null;
  country: string | null;
  crew_size: number | null;
}

/**
 * Safe, non-sensitive Klaviyo profile properties for a registered user.
 * Deliberately excludes postal_code, allergies, dietary_restrictions,
 * private notes, and anything payment-related — those never leave Postgres.
 */
export async function getKlaviyoProfilePropertiesForUser(
  userId: string,
): Promise<KlaviyoSafeProfileProperties | null> {
  const row = await pgOne<Record<string, unknown>>(
    `SELECT u.email, u.is_guest, u.created_at,
            up.city, up.province_state, up.country, up.crew_size,
            us.plan_id, us.status
     FROM users u
     LEFT JOIN user_profiles up ON up.user_id = u.user_id
     LEFT JOIN user_subscriptions us ON us.user_id = u.user_id
     WHERE u.user_id = $1`,
    [userId],
  );
  if (!row || !row.email) return null;

  const isPro = row.plan_id === "firefighter_plus" && (row.status === "active" || row.status === "trialing");

  return {
    email: String(row.email),
    account_status: Number(row.is_guest) === 1 ? "guest" : "active",
    plan: isPro ? "pro" : "free",
    signup_date: new Date(row.created_at as string).toISOString(),
    city: (row.city as string) ?? null,
    province_state: (row.province_state as string) ?? null,
    country: (row.country as string) ?? null,
    crew_size: (row.crew_size as number) ?? null,
  };
}
