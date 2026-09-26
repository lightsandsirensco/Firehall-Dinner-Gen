import crypto from "crypto";
import { nanoid } from "nanoid";
import { normalizeShiftDays } from "../../shared/shift-reminder/schema.js";
import {
  DEFAULT_SHIFT_REMINDER_TIME,
  DEFAULT_SHIFT_REMINDER_TIMEZONE,
} from "../../shared/shift-reminder/types.js";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { verifyPgConnection } from "../db/pg-client.js";
import { pgAll, pgOne, pgRun, pgTx } from "../db/pg-sql.js";
import type {
  AuthMeResponse,
  AuthProvider,
  UserAccount,
  UserPreferences,
  UserProfile,
  UserSavedRecipeRow,
} from "../../shared/auth/types.js";
import { authCapabilities } from "../../shared/auth/types.js";
import type { HallSummary } from "../../shared/hall-membership/types.js";
import { listUserHallSummaries } from "../hall-membership/store.js";
import { resolveUserBilling } from "../billing/store.js";
import { hasFeature, type UserBillingState } from "../../shared/billing/types.js";
import { sanitizeFoodPreferenceKeys } from "../../shared/ingredient-preferences/definitions.js";

const AUTH_COOKIE_NAME = "fh_auth";
const SESSION_DAYS = 30;
const MAGIC_LINK_MINUTES = 30;

export function getAuthCookieName(): string {
  return AUTH_COOKIE_NAME;
}

/**
 * Auth is Postgres-only (users, sessions, identities, profiles, preferences,
 * saved recipes) — see PRODUCTION DATABASE MIGRATION PLAN. This fails closed:
 * if DATABASE_URL is missing/unreachable, the server must not start serving
 * auth traffic against a silently-empty or stale local store.
 */
export async function initAuthStore(): Promise<void> {
  await verifyPgConnection();
}

/**
 * @deprecated Auth no longer lives in SQLite. This is a no-op compatibility
 * stub kept ONLY so existing test scripts (scripts/test-auth.ts and others
 * that call bindAuthDb() as shared test setup) still compile. Point
 * DATABASE_URL at a real (ideally disposable) test Postgres database to
 * exercise the migrated auth store — an in-memory sql.js mock can no longer
 * back it.
 */
export function bindAuthDb(_database: SqliteDatabase): void {
  console.warn(
    "[auth-store] bindAuthDb() is a no-op — auth is Postgres-only now. " +
      "Set DATABASE_URL to a test database to exercise this store.",
  );
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Postgres TIMESTAMPTZ columns come back as JS Date objects — reproduce the
 * exact ISO-8601 string shape the app (and SQLite before it) always used. */
function isoOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function iso(value: unknown): string {
  return isoOrNull(value) ?? new Date(0).toISOString();
}

function rowToUser(row: Record<string, unknown>): UserAccount {
  return {
    user_id: String(row.user_id),
    email: row.email ? String(row.email) : null,
    auth_provider: row.auth_provider as AuthProvider,
    is_guest: Number(row.is_guest) === 1,
    hall_pro_enabled: Number(row.hall_pro_enabled) === 1,
    created_at: iso(row.created_at),
    last_login_at: isoOrNull(row.last_login_at),
  };
}

function rowToProfile(row: Record<string, unknown> | undefined, email: string | null): UserProfile | null {
  if (!row) return null;
  return {
    first_name: row.first_name ? String(row.first_name) : null,
    last_name: row.last_name ? String(row.last_name) : null,
    display_name: row.display_name ? String(row.display_name) : null,
    email,
    profile_photo_url: row.profile_photo_url ? String(row.profile_photo_url) : null,
    department: row.department ? String(row.department) : null,
    hall_name: row.hall_name ? String(row.hall_name) : null,
    shift_label: row.shift_label ? String(row.shift_label) : null,
    crew_size: row.crew_size != null ? Number(row.crew_size) : null,
  };
}

function rowToPreferences(row: Record<string, unknown> | undefined): UserPreferences | null {
  if (!row) return null;
  return {
    preferred_proteins: parseJsonArray(row.preferred_proteins_json as string),
    dietary_restrictions: parseJsonArray(row.dietary_restrictions_json as string),
    appliance_preferences: parseJsonArray(row.appliance_preferences_json as string),
    excluded_ingredients: sanitizeFoodPreferenceKeys(parseJsonArray(row.excluded_ingredients_json as string)),
    shift_reminders_enabled: Number(row.shift_reminders_enabled) === 1,
    shift_days: normalizeShiftDays(
      (() => {
        try {
          return JSON.parse(String(row.shift_days_json ?? "[]"));
        } catch {
          return [];
        }
      })(),
    ),
    shift_reminder_time:
      typeof row.shift_reminder_time === "string" && row.shift_reminder_time
        ? row.shift_reminder_time
        : DEFAULT_SHIFT_REMINDER_TIME,
    shift_reminder_timezone:
      typeof row.shift_reminder_timezone === "string" && row.shift_reminder_timezone
        ? row.shift_reminder_timezone
        : DEFAULT_SHIFT_REMINDER_TIMEZONE,
  };
}

async function ensureProfileAndPreferences(userId: string): Promise<void> {
  await pgRun(`INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
  await pgRun(`INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
}

export function createUserId(): string {
  return nanoid(16);
}

export interface AuthSessionResult {
  token: string;
  user: UserAccount;
  isNewAccount: boolean;
}

export async function createAuthSession(
  userId: string,
  isNewAccount: boolean,
): Promise<AuthSessionResult> {
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await pgRun(
    `INSERT INTO auth_sessions (session_token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
    [tokenHash, userId, expiresAt],
  );

  await pgRun(`UPDATE users SET last_login_at = now(), updated_at = now() WHERE user_id = $1`, [userId]);

  const userRow = (await pgOne(`SELECT * FROM users WHERE user_id = $1`, [userId]))!;
  return { token, user: rowToUser(userRow), isNewAccount };
}

export async function revokeAuthSession(token: string): Promise<void> {
  await pgRun(`DELETE FROM auth_sessions WHERE session_token_hash = $1`, [hashToken(token)]);
}

export async function getUserIdFromSessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = await pgOne<{ user_id: string; expires_at: Date; is_guest: number }>(
    `SELECT s.user_id, s.expires_at, u.is_guest
     FROM auth_sessions s
     JOIN users u ON u.user_id = s.user_id
     WHERE s.session_token_hash = $1`,
    [tokenHash],
  );

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pgRun(`DELETE FROM auth_sessions WHERE session_token_hash = $1`, [tokenHash]);
    return null;
  }
  if (Number(row.is_guest) === 1) return null;

  const refreshedExpires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await pgRun(`UPDATE auth_sessions SET expires_at = $1 WHERE session_token_hash = $2`, [
    refreshedExpires,
    tokenHash,
  ]);

  return row.user_id;
}

export async function getUserById(userId: string): Promise<UserAccount | null> {
  const row = await pgOne(`SELECT * FROM users WHERE user_id = $1`, [userId]);
  return row ? rowToUser(row) : null;
}

export async function findUserByEmail(email: string): Promise<UserAccount | null> {
  const normalized = email.trim().toLowerCase();
  const row = await pgOne(`SELECT * FROM users WHERE lower(email) = $1`, [normalized]);
  return row ? rowToUser(row) : null;
}

// ---------------------------------------------------------------------------
// auth_identities — the lookup source for OAuth sign-in (GOOGLE SIGN-IN
// SAFETY). Maps a verified (provider, provider_subject) pair to a single,
// existing user_id. See server/db/pg-migrations/0001_init.sql for the table.
// ---------------------------------------------------------------------------

export type IdentityProvider = "email" | "google" | "apple";

/** Thrown by linkIdentity() when the identity is already owned by a DIFFERENT user_id. */
export class IdentityOwnershipConflictError extends Error {
  constructor(provider: IdentityProvider) {
    super(`This ${provider} account is already linked to a different Firehall Meals account.`);
    this.name = "IdentityOwnershipConflictError";
  }
}

export async function findUserIdByIdentity(
  provider: IdentityProvider,
  subject: string,
): Promise<string | null> {
  const row = await pgOne<{ user_id: string }>(
    `SELECT user_id FROM auth_identities WHERE provider = $1 AND provider_subject = $2`,
    [provider, subject],
  );
  return row?.user_id ?? null;
}

/**
 * Every provider currently linked to a user_id — used by Account →
 * "Sign-in methods" and never anything more sensitive (no subjects/emails
 * of other identities are exposed to the client).
 */
export async function listLinkedIdentityProviders(userId: string): Promise<IdentityProvider[]> {
  const rows = await pgAll<{ provider: IdentityProvider }>(
    `SELECT DISTINCT provider FROM auth_identities WHERE user_id = $1`,
    [userId],
  );
  return rows.map((r) => r.provider);
}

/**
 * Links (provider, subject) → userId. Idempotent no-op if this exact
 * identity is already linked to this same user. Throws
 * IdentityOwnershipConflictError if already owned by a DIFFERENT user_id —
 * callers must never silently reassign ownership. user_id is always the
 * caller's own resolved id; never accepted or inferred from client data.
 */
export async function linkIdentity(
  userId: string,
  provider: IdentityProvider,
  subject: string,
  emailAtLinkTime: string | null,
): Promise<void> {
  const owner = await findUserIdByIdentity(provider, subject);
  if (owner) {
    if (owner !== userId) {
      throw new IdentityOwnershipConflictError(provider);
    }
    return; // already linked to this same user — idempotent no-op
  }
  await pgRun(
    `INSERT INTO auth_identities (provider, provider_subject, user_id, email_at_link_time) VALUES ($1, $2, $3, $4)`,
    [provider, subject, userId, emailAtLinkTime],
  );
}

export async function upsertEmailUser(email: string): Promise<{ user: UserAccount; isNew: boolean }> {
  const normalized = email.trim().toLowerCase();
  const existing = await findUserByEmail(normalized);
  if (existing) {
    // Defensive backfill: an existing email user without a matching
    // auth_identities row yet still gets one on next sign-in — same
    // user_id, never a new one. Never allowed to fail this sign-in.
    try {
      await linkIdentity(existing.user_id, "email", normalized, normalized);
    } catch {
      /* ownership conflict on a supposedly-unique email should be impossible; never block sign-in on it */
    }
    return { user: existing, isNew: false };
  }

  const userId = createUserId();
  const displayName = normalized.split("@")[0] ?? "Firefighter";
  await pgRun(
    `INSERT INTO users (user_id, email, auth_provider, is_guest, provider_subject) VALUES ($1, $2, 'email', 0, $3)`,
    [userId, normalized, normalized],
  );
  await ensureProfileAndPreferences(userId);
  await pgRun(`UPDATE user_profiles SET display_name = $1 WHERE user_id = $2`, [displayName, userId]);
  try {
    await linkIdentity(userId, "email", normalized, normalized);
  } catch {
    /* never block account creation on identity bookkeeping */
  }

  const userRow = (await pgOne(`SELECT * FROM users WHERE user_id = $1`, [userId]))!;
  return { user: rowToUser(userRow), isNew: true };
}

export type OAuthSignInResult =
  | { kind: "signed_in"; user: UserAccount; isNew: boolean }
  /**
   * A server-verified OAuth identity has never been seen before, AND its
   * verified email matches an existing Firehall Meals account that has NOT
   * already linked this identity. Per GOOGLE SIGN-IN SAFETY: never silently
   * merge, never create a duplicate user, never move data, never link based
   * solely on a client-provided/matching email. The caller (route) must
   * return a deliberate conflict (409) instead of signing anyone in.
   */
  | { kind: "email_collision"; existingEmail: string };

/**
 * Resolves a server-verified OAuth identity (Google or Apple) to a Firehall
 * Meals session-eligible user, using auth_identities as the lookup source.
 */
export async function resolveOAuthSignIn(input: {
  provider: "google" | "apple";
  subject: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<OAuthSignInResult> {
  // 1) Known identity → resolve the existing user_id.
  const existingUserId = await findUserIdByIdentity(input.provider, input.subject);
  if (existingUserId) {
    const userRow = await pgOne(`SELECT * FROM users WHERE user_id = $1`, [existingUserId]);
    if (userRow) {
      if (input.email && !userRow.email) {
        await pgRun(`UPDATE users SET email = $1, updated_at = now() WHERE user_id = $2`, [
          input.email.trim().toLowerCase(),
          existingUserId,
        ]);
      }
      const refreshed = (await pgOne(`SELECT * FROM users WHERE user_id = $1`, [existingUserId]))!;
      return { kind: "signed_in", user: rowToUser(refreshed), isNew: false };
    }
    // Identity points at a deleted user_id — release it so this subject can
    // create a genuinely new account below.
    await pgRun(`DELETE FROM auth_identities WHERE provider = $1 AND provider_subject = $2`, [
      input.provider,
      input.subject,
    ]);
  }

  // 2) Never-seen identity. If the verified email belongs to a DIFFERENT
  // existing account, this is a deliberate conflict, not a merge point.
  const normalizedEmail = input.email?.trim().toLowerCase() || null;
  if (normalizedEmail) {
    const existingByEmail = await findUserByEmail(normalizedEmail);
    if (existingByEmail) {
      return { kind: "email_collision", existingEmail: normalizedEmail };
    }
  }

  // 3) Genuinely new person — create the user and its identity together.
  const userId = createUserId();
  await pgRun(
    `INSERT INTO users (user_id, email, auth_provider, is_guest, provider_subject) VALUES ($1, $2, $3, 0, $4)`,
    [userId, normalizedEmail, input.provider, input.subject],
  );
  await ensureProfileAndPreferences(userId);
  await linkIdentity(userId, input.provider, input.subject, normalizedEmail);

  const displayName =
    [input.firstName, input.lastName].filter(Boolean).join(" ").trim() ||
    normalizedEmail?.split("@")[0] ||
    "Firefighter";

  await pgRun(
    `UPDATE user_profiles SET first_name = $1, last_name = $2, display_name = $3 WHERE user_id = $4`,
    [input.firstName ?? null, input.lastName ?? null, displayName, userId],
  );

  const userRow = (await pgOne(`SELECT * FROM users WHERE user_id = $1`, [userId]))!;
  return { kind: "signed_in", user: rowToUser(userRow), isNew: true };
}

export async function createMagicLink(
  email: string,
  returnTo?: string | null,
): Promise<{ rawToken: string; expiresAt: string }> {
  const normalized = email.trim().toLowerCase();
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_MINUTES * 60 * 1000).toISOString();
  const safeReturnTo = returnTo?.trim() || null;

  await pgRun(`DELETE FROM auth_magic_links WHERE email = $1 AND used_at IS NULL`, [normalized]);
  await pgRun(
    `INSERT INTO auth_magic_links (token_hash, email, expires_at, return_to) VALUES ($1, $2, $3, $4)`,
    [tokenHash, normalized, expiresAt, safeReturnTo],
  );

  return { rawToken, expiresAt };
}

export type MagicLinkConsumeResult =
  | { ok: true; email: string; returnTo: string | null }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export async function consumeMagicLink(rawToken: string): Promise<MagicLinkConsumeResult> {
  const tokenHash = hashToken(rawToken);
  const row = await pgOne<{ email: string; expires_at: Date; used_at: Date | null; return_to: string | null }>(
    `SELECT email, expires_at, used_at, return_to FROM auth_magic_links WHERE token_hash = $1`,
    [tokenHash],
  );

  if (!row) return { ok: false, reason: "invalid" };
  if (row.used_at) return { ok: false, reason: "used" };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  await pgRun(`UPDATE auth_magic_links SET used_at = now() WHERE token_hash = $1`, [tokenHash]);
  return { ok: true, email: row.email, returnTo: row.return_to };
}

function getUserHalls(userId: string): HallSummary[] {
  try {
    return listUserHallSummaries(userId);
  } catch {
    return [];
  }
}

/** Defensive wrapper — same graceful-degradation pattern as getUserHalls(). */
async function getLinkedProviders(userId: string): Promise<IdentityProvider[]> {
  try {
    return await listLinkedIdentityProviders(userId);
  } catch {
    return [];
  }
}

async function attachBilling(userId: string | null, user: UserAccount | null): Promise<UserBillingState> {
  try {
    return await resolveUserBilling(userId, { is_guest: !userId || !user });
  } catch {
    return resolveUserBilling(null, { is_guest: true });
  }
}

export async function getAuthMe(userId: string | null): Promise<AuthMeResponse> {
  if (!userId) {
    return {
      authenticated: false,
      user: null,
      profile: null,
      preferences: null,
      halls: [],
      billing: await attachBilling(null, null),
      linked_providers: [],
    };
  }

  const userRow = await pgOne(`SELECT * FROM users WHERE user_id = $1`, [userId]);
  if (!userRow || Number(userRow.is_guest) === 1) {
    return {
      authenticated: false,
      user: null,
      profile: null,
      preferences: null,
      halls: [],
      billing: await attachBilling(null, null),
      linked_providers: [],
    };
  }

  const user = rowToUser(userRow);
  const profileRow = await pgOne(`SELECT * FROM user_profiles WHERE user_id = $1`, [userId]);
  const prefRow = await pgOne(`SELECT * FROM user_preferences WHERE user_id = $1`, [userId]);

  return {
    authenticated: true,
    user,
    profile: rowToProfile(profileRow, user.email),
    preferences: rowToPreferences(prefRow),
    halls: getUserHalls(userId),
    billing: await attachBilling(userId, user),
    linked_providers: await getLinkedProviders(userId),
  };
}

export async function updateUserProfile(
  userId: string,
  patch: {
    first_name?: string | null;
    last_name?: string | null;
    display_name?: string | null;
    profile_photo_url?: string | null;
    department?: string | null;
    hall_name?: string | null;
    shift_label?: string | null;
    crew_size?: number | null;
    preferred_proteins?: string[];
    dietary_restrictions?: string[];
    appliance_preferences?: string[];
    excluded_ingredients?: string[];
    shift_reminders_enabled?: boolean;
    shift_days?: number[];
    shift_reminder_time?: string;
    shift_reminder_timezone?: string;
  },
): Promise<AuthMeResponse> {
  await ensureProfileAndPreferences(userId);

  const profileFields: Array<[string, unknown]> = [];
  if ("first_name" in patch) profileFields.push(["first_name", patch.first_name ?? null]);
  if ("last_name" in patch) profileFields.push(["last_name", patch.last_name ?? null]);
  if ("display_name" in patch) profileFields.push(["display_name", patch.display_name ?? null]);
  if ("profile_photo_url" in patch) profileFields.push(["profile_photo_url", patch.profile_photo_url ?? null]);
  if ("department" in patch) profileFields.push(["department", patch.department ?? null]);
  if ("hall_name" in patch) profileFields.push(["hall_name", patch.hall_name ?? null]);
  if ("shift_label" in patch) profileFields.push(["shift_label", patch.shift_label ?? null]);
  if ("crew_size" in patch) profileFields.push(["crew_size", patch.crew_size ?? null]);

  if (profileFields.length > 0) {
    const sets = profileFields.map(([col], i) => `${col} = $${i + 1}`).join(", ");
    const values = profileFields.map(([, v]) => v as string | number | null);
    await pgRun(
      `UPDATE user_profiles SET ${sets}, updated_at = now() WHERE user_id = $${profileFields.length + 1}`,
      [...values, userId],
    );
  }

  const prefFields: Array<[string, unknown]> = [];
  if (patch.preferred_proteins) {
    prefFields.push(["preferred_proteins_json", JSON.stringify(patch.preferred_proteins)]);
  }
  if (patch.dietary_restrictions) {
    prefFields.push(["dietary_restrictions_json", JSON.stringify(patch.dietary_restrictions)]);
  }
  if (patch.appliance_preferences) {
    prefFields.push(["appliance_preferences_json", JSON.stringify(patch.appliance_preferences)]);
  }
  if (patch.excluded_ingredients) {
    // "Foods to Avoid" is a Firehall Meals Pro capability — a non-Pro user
    // (including a downgraded former-Pro user) can never persist a non-empty
    // list here, even via a direct API call. Clearing to an empty list is
    // always allowed regardless of plan.
    const sanitized = sanitizeFoodPreferenceKeys(patch.excluded_ingredients);
    let allowed = sanitized.length === 0;
    if (!allowed) {
      const userRow = await pgOne(`SELECT * FROM users WHERE user_id = $1`, [userId]);
      const billing = await attachBilling(userId, userRow ? rowToUser(userRow) : null);
      allowed = hasFeature(billing.features, "ingredient_preferences");
    }
    prefFields.push(["excluded_ingredients_json", JSON.stringify(allowed ? sanitized : [])]);
  }
  if (typeof patch.shift_reminders_enabled === "boolean") {
    prefFields.push(["shift_reminders_enabled", patch.shift_reminders_enabled ? 1 : 0]);
  }
  if (patch.shift_days) {
    prefFields.push(["shift_days_json", JSON.stringify(normalizeShiftDays(patch.shift_days))]);
  }
  if (typeof patch.shift_reminder_time === "string") {
    prefFields.push(["shift_reminder_time", patch.shift_reminder_time]);
  }
  if (typeof patch.shift_reminder_timezone === "string") {
    prefFields.push(["shift_reminder_timezone", patch.shift_reminder_timezone]);
  }

  if (prefFields.length > 0) {
    const sets = prefFields.map(([col], i) => `${col} = $${i + 1}`).join(", ");
    const values = prefFields.map(([, v]) => v as string | number);
    await pgRun(
      `UPDATE user_preferences SET ${sets}, updated_at = now() WHERE user_id = $${prefFields.length + 1}`,
      [...values, userId],
    );
  }

  await pgRun(`UPDATE users SET updated_at = now() WHERE user_id = $1`, [userId]);
  return getAuthMe(userId);
}

export async function listSavedRecipes(userId: string): Promise<UserSavedRecipeRow[]> {
  const rows = await pgAll<{ recipe_key: string; recipe_json: string; saved_at: Date }>(
    `SELECT recipe_key, recipe_json, saved_at FROM user_saved_recipes WHERE user_id = $1 ORDER BY saved_at DESC`,
    [userId],
  );

  return rows.map((row) => ({
    recipe_key: row.recipe_key,
    recipe_json: JSON.parse(row.recipe_json),
    saved_at: iso(row.saved_at),
  }));
}

export async function syncSavedRecipes(
  userId: string,
  recipes: Array<{ recipe_key: string; recipe_json: unknown; saved_at?: string }>,
  options?: { replace?: boolean },
): Promise<number> {
  let upserted = 0;
  await pgTx(async (tx) => {
    for (const recipe of recipes) {
      await tx.run(
        `INSERT INTO user_saved_recipes (user_id, recipe_key, recipe_json, saved_at)
         VALUES ($1, $2, $3, COALESCE($4, now()))
         ON CONFLICT (user_id, recipe_key) DO UPDATE SET
           recipe_json = excluded.recipe_json,
           saved_at = CASE
             WHEN excluded.saved_at > user_saved_recipes.saved_at THEN excluded.saved_at
             ELSE user_saved_recipes.saved_at
           END`,
        [userId, recipe.recipe_key, JSON.stringify(recipe.recipe_json), recipe.saved_at ?? null],
      );
      upserted++;
    }
    if (options?.replace) {
      const keys = recipes.map((r) => r.recipe_key);
      if (keys.length === 0) {
        await tx.run(`DELETE FROM user_saved_recipes WHERE user_id = $1`, [userId]);
      } else {
        const placeholders = keys.map((_, i) => `$${i + 2}`).join(", ");
        await tx.run(
          `DELETE FROM user_saved_recipes WHERE user_id = $1 AND recipe_key NOT IN (${placeholders})`,
          [userId, ...keys],
        );
      }
    }
  });
  return upserted;
}

export function getAuthCapabilitiesForUser(user: UserAccount | null, billing?: UserBillingState) {
  return authCapabilities(user, billing);
}

export async function revokeAllAuthSessionsForUser(userId: string): Promise<void> {
  await pgRun(`DELETE FROM auth_sessions WHERE user_id = $1`, [userId]);
}

/**
 * Hall/canteen columns that reference a user purely as an OPTIONAL
 * attribution ("who did this") — these live in SQLite (Hall Pro is out of
 * scope for this migration) and are nullable in schema.
 */
const HALL_NULLABLE_USER_REFERENCE_COLUMNS: Array<{ table: string; column: string }> = [
  { table: "halls", column: "created_by_user_id" },
  { table: "halls", column: "canteen_manager_user_id" },
  { table: "hall_invites", column: "created_by_user_id" },
  { table: "hall_shopping_lists", column: "runner_user_id" },
  { table: "hall_shopping_lists", column: "created_by_user_id" },
  { table: "hall_shopping_list_items", column: "added_by_user_id" },
  { table: "hall_canteen_items", column: "submitted_by_user_id" },
  { table: "hall_canteen_items", column: "last_updated_by_user_id" },
  { table: "hall_canteen_items", column: "picked_up_by_user_id" },
  { table: "hall_canteen_items", column: "preferred_buyer_user_id" },
  { table: "hall_canteen_history", column: "user_id" },
  { table: "hall_activity_events", column: "user_id" },
  { table: "hall_subscriptions", column: "subscribed_by_user_id" },
  { table: "hall_canteen_dues_members", column: "enrolled_by_user_id" },
  { table: "hall_canteen_shortage_reports", column: "resolved_by_user_id" },
  { table: "hall_canteen_suggestions", column: "reviewed_by_user_id" },
  { table: "hall_canteen_weekly_orders", column: "purchaser_user_id" },
  { table: "hall_canteen_weekly_orders", column: "created_by_user_id" },
  { table: "hall_canteen_order_items", column: "assigned_buyer_user_id" },
  { table: "hall_canteen_manager_notes", column: "created_by_user_id" },
  { table: "hall_canteen_manager_notes", column: "updated_by_user_id" },
  { table: "hall_canteen_activity", column: "actor_user_id" },
  { table: "hall_events", column: "actor_user_id" },
  { table: "hall_board_tonight", column: "cook_user_id" },
  { table: "hall_board_tonight", column: "runner_user_id" },
  { table: "hall_logbook_entries", column: "author_user_id" },
  { table: "hall_inventory_ledger", column: "actor_user_id" },
];

/**
 * Permanently deletes a signed-in user's private account data.
 *
 * TWO-PHASE ACROSS TWO DATABASES (known limitation of this migration): the
 * migrated tables (Postgres) are deleted first inside one transaction, then
 * the still-SQLite Hall/shift/admin tables are deleted/nulled in a second,
 * separate transaction. There is no distributed transaction across the two
 * engines — a crash between phase 1 and phase 2 could leave SQLite-side
 * rows referencing a user_id that no longer exists in Postgres (harmless —
 * those columns are either nullable attribution or already orphan-tolerant)
 * but NOT re-run automatically. Flagged in the migration report; acceptable
 * for this phase since Hall Pro is on hold and account deletion is rare.
 *
 * DELETED from Postgres: auth_sessions, auth_identities, auth_magic_links
 * (by email), user_profiles, user_preferences, user_saved_recipes,
 * user_subscriptions, user_data_snapshots, user_meal_history, users.
 *
 * DELETED/NULLED from SQLite (unchanged from pre-migration behavior):
 * shift_reminder_sends, hall_memberships, hall_canteen_dues_members,
 * hall_logbook_reads, HALL_NULLABLE_USER_REFERENCE_COLUMNS, admin_user_meta,
 * email_leads.
 */
export async function deleteUserAccount(userId: string): Promise<{ ok: true; email: string | null }> {
  const userRow = await pgOne<{ email: string | null }>(`SELECT email FROM users WHERE user_id = $1`, [userId]);
  if (!userRow) {
    return { ok: true, email: null };
  }
  const email = userRow.email ? userRow.email.trim().toLowerCase() : null;

  // Phase 1 — Postgres (migrated tables).
  await pgTx(async (tx) => {
    await tx.run(`DELETE FROM auth_sessions WHERE user_id = $1`, [userId]);
    await tx.run(`DELETE FROM auth_identities WHERE user_id = $1`, [userId]);
    if (email) {
      await tx.run(`DELETE FROM auth_magic_links WHERE lower(email) = $1`, [email]);
    }
    await tx.run(`DELETE FROM user_profiles WHERE user_id = $1`, [userId]);
    await tx.run(`DELETE FROM user_preferences WHERE user_id = $1`, [userId]);
    await tx.run(`DELETE FROM user_saved_recipes WHERE user_id = $1`, [userId]);
    await tx.run(`DELETE FROM user_subscriptions WHERE user_id = $1`, [userId]);
    await tx.run(`DELETE FROM user_data_snapshots WHERE user_id = $1`, [userId]);
    await tx.run(`DELETE FROM user_meal_history WHERE user_id = $1`, [userId]);
    await tx.run(`DELETE FROM users WHERE user_id = $1`, [userId]);
  });

  // Phase 2 — SQLite (Hall Pro / shared content, untouched by this migration).
  const d = await getSharedLocalDb();
  const tx = d.transaction(() => {
    d.prepare(`DELETE FROM shift_reminder_sends WHERE user_id = ?`).run(userId);
    d.prepare(`DELETE FROM hall_memberships WHERE user_id = ?`).run(userId);
    d.prepare(`DELETE FROM hall_canteen_dues_members WHERE user_id = ?`).run(userId);
    d.prepare(`DELETE FROM hall_logbook_reads WHERE user_id = ?`).run(userId);
    for (const { table, column } of HALL_NULLABLE_USER_REFERENCE_COLUMNS) {
      d.prepare(`UPDATE ${table} SET ${column} = NULL WHERE ${column} = ?`).run(userId);
    }
    d.prepare(`DELETE FROM admin_user_meta WHERE user_id = ?`).run(userId);
    if (email) {
      d.prepare(`DELETE FROM email_leads WHERE lower(email) = ?`).run(email);
    }
  });
  tx();

  return { ok: true, email };
}
