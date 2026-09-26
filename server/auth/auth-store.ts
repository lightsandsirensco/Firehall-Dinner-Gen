import crypto from "crypto";
import { nanoid } from "nanoid";
import { normalizeShiftDays } from "../../shared/shift-reminder/schema.js";
import {
  DEFAULT_SHIFT_REMINDER_TIME,
  DEFAULT_SHIFT_REMINDER_TIMEZONE,
} from "../../shared/shift-reminder/types.js";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
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

let db: SqliteDatabase;

export function getAuthCookieName(): string {
  return AUTH_COOKIE_NAME;
}

export async function initAuthStore(): Promise<void> {
  db = await getSharedLocalDb();
}

/** Test hook — bind a specific SQLite database (validation scripts only). */
export function bindAuthDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Auth store not initialized — call initAuthStore() first");
  }
  return db;
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

function rowToUser(row: Record<string, unknown>): UserAccount {
  return {
    user_id: String(row.user_id),
    email: row.email ? String(row.email) : null,
    auth_provider: row.auth_provider as AuthProvider,
    is_guest: Number(row.is_guest) === 1,
    hall_pro_enabled: Number(row.hall_pro_enabled) === 1,
    created_at: String(row.created_at),
    last_login_at: row.last_login_at ? String(row.last_login_at) : null,
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

function ensureProfileAndPreferences(userId: string): void {
  const d = getDb();
  d.prepare(
    `INSERT OR IGNORE INTO user_profiles (user_id) VALUES (?)`,
  ).run(userId);
  d.prepare(
    `INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)`,
  ).run(userId);
}

export function createUserId(): string {
  return nanoid(16);
}

export interface AuthSessionResult {
  token: string;
  user: UserAccount;
  isNewAccount: boolean;
}

export function createAuthSession(
  userId: string,
  isNewAccount: boolean,
): AuthSessionResult {
  const d = getDb();
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  d.prepare(
    `INSERT INTO auth_sessions (session_token_hash, user_id, expires_at) VALUES (?, ?, ?)`,
  ).run(tokenHash, userId, expiresAt);

  d.prepare(`UPDATE users SET last_login_at = datetime('now'), updated_at = datetime('now') WHERE user_id = ?`).run(
    userId,
  );

  const userRow = d.prepare(`SELECT * FROM users WHERE user_id = ?`).get(userId) as Record<string, unknown>;
  return { token, user: rowToUser(userRow), isNewAccount };
}

export function revokeAuthSession(token: string): void {
  const d = getDb();
  d.prepare(`DELETE FROM auth_sessions WHERE session_token_hash = ?`).run(hashToken(token));
}

export function getUserIdFromSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const d = getDb();
  const tokenHash = hashToken(token);
  const row = d
    .prepare(
      `SELECT s.user_id, s.expires_at, u.is_guest
       FROM auth_sessions s
       JOIN users u ON u.user_id = s.user_id
       WHERE s.session_token_hash = ?`,
    )
    .get(tokenHash) as { user_id: string; expires_at: string; is_guest: number } | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    d.prepare(`DELETE FROM auth_sessions WHERE session_token_hash = ?`).run(tokenHash);
    return null;
  }
  if (Number(row.is_guest) === 1) return null;

  const refreshedExpires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  d.prepare(`UPDATE auth_sessions SET expires_at = ? WHERE session_token_hash = ?`).run(
    refreshedExpires,
    tokenHash,
  );

  return row.user_id;
}

export function getUserById(userId: string): UserAccount | null {
  const d = getDb();
  const row = d.prepare(`SELECT * FROM users WHERE user_id = ?`).get(userId) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToUser(row) : null;
}

export function findUserByEmail(email: string): UserAccount | null {
  const d = getDb();
  const row = d.prepare(`SELECT * FROM users WHERE email = ? COLLATE NOCASE`).get(email.trim().toLowerCase()) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToUser(row) : null;
}

// ---------------------------------------------------------------------------
// auth_identities — the lookup source for OAuth sign-in (GOOGLE SIGN-IN
// SAFETY). Maps a verified (provider, provider_subject) pair to a single,
// existing user_id. See server/db/migrations/048_auth_identities.sql for the
// table + backfill of pre-existing users.auth_provider/provider_subject data.
// ---------------------------------------------------------------------------

export type IdentityProvider = "email" | "google" | "apple";

/** Thrown by linkIdentity() when the identity is already owned by a DIFFERENT user_id. */
export class IdentityOwnershipConflictError extends Error {
  constructor(provider: IdentityProvider) {
    super(`This ${provider} account is already linked to a different Firehall Meals account.`);
    this.name = "IdentityOwnershipConflictError";
  }
}

export function findUserIdByIdentity(provider: IdentityProvider, subject: string): string | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT user_id FROM auth_identities WHERE provider = ? AND provider_subject = ?`)
    .get(provider, subject) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}

/**
 * Every provider currently linked to a user_id — used by Account →
 * "Sign-in methods" and never anything more sensitive (no subjects/emails
 * of other identities are exposed to the client).
 */
export function listLinkedIdentityProviders(userId: string): IdentityProvider[] {
  const d = getDb();
  const rows = d
    .prepare(`SELECT DISTINCT provider FROM auth_identities WHERE user_id = ?`)
    .all(userId) as Array<{ provider: IdentityProvider }>;
  return rows.map((r) => r.provider);
}

/**
 * Links (provider, subject) → userId. Idempotent no-op if this exact
 * identity is already linked to this same user (e.g. signing in again with
 * an already-linked Google account, or clicking "Connect Google" twice).
 * Throws IdentityOwnershipConflictError if the identity is already owned by
 * a DIFFERENT user_id — callers must never silently reassign ownership.
 * user_id is always the caller's own resolved id; this function never
 * accepts or infers a user_id from client-supplied data.
 */
export function linkIdentity(
  userId: string,
  provider: IdentityProvider,
  subject: string,
  emailAtLinkTime: string | null,
): void {
  const d = getDb();
  const owner = findUserIdByIdentity(provider, subject);
  if (owner) {
    if (owner !== userId) {
      throw new IdentityOwnershipConflictError(provider);
    }
    return; // already linked to this same user — idempotent no-op
  }
  d.prepare(
    `INSERT INTO auth_identities (provider, provider_subject, user_id, email_at_link_time) VALUES (?, ?, ?, ?)`,
  ).run(provider, subject, userId, emailAtLinkTime);
}

export function upsertEmailUser(email: string): { user: UserAccount; isNew: boolean } {
  const d = getDb();
  const normalized = email.trim().toLowerCase();
  const existing = findUserByEmail(normalized);
  if (existing) {
    // Defensive backfill: an existing email user from before auth_identities
    // existed (or a row the migration backfill somehow missed) still gets a
    // matching identity row the next time they sign in — same user_id,
    // never a new one. Never allowed to fail this sign-in: a genuine
    // ownership conflict here would mean two users already share an email,
    // which users.email UNIQUE already prevents.
    try {
      linkIdentity(existing.user_id, "email", normalized, normalized);
    } catch {
      /* ownership conflict on a supposedly-unique email should be impossible; never block sign-in on it */
    }
    return { user: existing, isNew: false };
  }

  const userId = createUserId();
  const displayName = normalized.split("@")[0] ?? "Firefighter";
  d.prepare(
    `INSERT INTO users (user_id, email, auth_provider, is_guest, provider_subject)
     VALUES (?, ?, 'email', 0, ?)`,
  ).run(userId, normalized, normalized);
  ensureProfileAndPreferences(userId);
  d.prepare(`UPDATE user_profiles SET display_name = ? WHERE user_id = ?`).run(displayName, userId);
  // Best-effort: the `users` row (created above) is the authoritative new
  // account event and must never be blocked by this. auth_identities is
  // additive/supplementary bookkeeping for OAuth lookup + the "Sign-in
  // methods" UI — collision protection for future OAuth sign-ins relies on
  // users.email (queried directly), not on this row existing.
  try {
    linkIdentity(userId, "email", normalized, normalized);
  } catch {
    /* never block account creation on identity bookkeeping */
  }

  const userRow = d.prepare(`SELECT * FROM users WHERE user_id = ?`).get(userId) as Record<string, unknown>;
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
 * Meals session-eligible user, using auth_identities as the lookup source —
 * NOT email, and NOT the legacy users.auth_provider/provider_subject columns
 * (kept only for backward compatibility; see migration 048). This is the
 * single entry point for both "new Google sign-up" and "returning Google
 * user" (task sections 5 & 6), and the email-collision guard (section 7).
 */
export function resolveOAuthSignIn(input: {
  provider: "google" | "apple";
  subject: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): OAuthSignInResult {
  const d = getDb();

  // 1) Known identity → resolve the existing user_id. This is the ONLY path
  // that returns an existing user for a returning OAuth sign-in; it never
  // consults email.
  const existingUserId = findUserIdByIdentity(input.provider, input.subject);
  if (existingUserId) {
    const userRow = d.prepare(`SELECT * FROM users WHERE user_id = ?`).get(existingUserId) as
      | Record<string, unknown>
      | undefined;
    if (userRow) {
      // Never overwrite an existing account email from an OAuth login — only
      // fill it in if the account genuinely has none on file yet.
      if (input.email && !userRow.email) {
        d.prepare(`UPDATE users SET email = ?, updated_at = datetime('now') WHERE user_id = ?`).run(
          input.email.trim().toLowerCase(),
          existingUserId,
        );
      }
      const refreshed = d.prepare(`SELECT * FROM users WHERE user_id = ?`).get(existingUserId) as Record<
        string,
        unknown
      >;
      return { kind: "signed_in", user: rowToUser(refreshed), isNew: false };
    }
    // The identity row points at a user_id that no longer exists (the
    // account was deleted — see deleteUserAccount). Clear the stale
    // identity row so this Google/Apple subject can create a genuinely new
    // account below, matching task section 14 (DELETION): "a deleted
    // Google user can create a genuinely new account later."
    d.prepare(`DELETE FROM auth_identities WHERE provider = ? AND provider_subject = ?`).run(
      input.provider,
      input.subject,
    );
  }

  // 2) Never-seen identity. If the verified email belongs to a DIFFERENT
  // existing account, this is a deliberate conflict, not a merge point.
  const normalizedEmail = input.email?.trim().toLowerCase() || null;
  if (normalizedEmail) {
    const existingByEmail = findUserByEmail(normalizedEmail);
    if (existingByEmail) {
      return { kind: "email_collision", existingEmail: normalizedEmail };
    }
  }

  // 3) Genuinely new person — create the user and its identity together.
  // users.auth_provider/provider_subject are still populated for backward
  // compatibility (migration 048 leaves them in place; nothing reads them
  // for OAuth resolution anymore, but nothing destroys them either).
  const userId = createUserId();
  d.prepare(
    `INSERT INTO users (user_id, email, auth_provider, is_guest, provider_subject)
     VALUES (?, ?, ?, 0, ?)`,
  ).run(userId, normalizedEmail, input.provider, input.subject);
  ensureProfileAndPreferences(userId);
  linkIdentity(userId, input.provider, input.subject, normalizedEmail);

  const displayName =
    [input.firstName, input.lastName].filter(Boolean).join(" ").trim() ||
    normalizedEmail?.split("@")[0] ||
    "Firefighter";

  d.prepare(
    `UPDATE user_profiles SET first_name = ?, last_name = ?, display_name = ? WHERE user_id = ?`,
  ).run(input.firstName ?? null, input.lastName ?? null, displayName, userId);

  const userRow = d.prepare(`SELECT * FROM users WHERE user_id = ?`).get(userId) as Record<string, unknown>;
  return { kind: "signed_in", user: rowToUser(userRow), isNew: true };
}

export function createMagicLink(
  email: string,
  returnTo?: string | null,
): { rawToken: string; expiresAt: string } {
  const d = getDb();
  const normalized = email.trim().toLowerCase();
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_MINUTES * 60 * 1000).toISOString();
  const safeReturnTo = returnTo?.trim() || null;

  d.prepare(`DELETE FROM auth_magic_links WHERE email = ? AND used_at IS NULL`).run(normalized);
  d.prepare(
    `INSERT INTO auth_magic_links (token_hash, email, expires_at, return_to) VALUES (?, ?, ?, ?)`,
  ).run(tokenHash, normalized, expiresAt, safeReturnTo);

  return { rawToken, expiresAt };
}

export type MagicLinkConsumeResult =
  | { ok: true; email: string; returnTo: string | null }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export function consumeMagicLink(rawToken: string): MagicLinkConsumeResult {
  const d = getDb();
  const tokenHash = hashToken(rawToken);
  const row = d
    .prepare(`SELECT email, expires_at, used_at, return_to FROM auth_magic_links WHERE token_hash = ?`)
    .get(tokenHash) as
    | { email: string; expires_at: string; used_at: string | null; return_to: string | null }
    | undefined;

  if (!row) return { ok: false, reason: "invalid" };
  if (row.used_at) return { ok: false, reason: "used" };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  d.prepare(`UPDATE auth_magic_links SET used_at = datetime('now') WHERE token_hash = ?`).run(tokenHash);
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
function getLinkedProviders(userId: string): IdentityProvider[] {
  try {
    return listLinkedIdentityProviders(userId);
  } catch {
    return [];
  }
}

function attachBilling(userId: string | null, user: UserAccount | null): UserBillingState {
  try {
    return resolveUserBilling(userId, {
      is_guest: !userId || !user,
    });
  } catch {
    return resolveUserBilling(null, { is_guest: true });
  }
}

export function getAuthMe(userId: string | null): AuthMeResponse {
  if (!userId) {
    return {
      authenticated: false,
      user: null,
      profile: null,
      preferences: null,
      halls: [],
      billing: attachBilling(null, null),
      linked_providers: [],
    };
  }

  const d = getDb();
  const userRow = d.prepare(`SELECT * FROM users WHERE user_id = ?`).get(userId) as
    | Record<string, unknown>
    | undefined;
  if (!userRow || Number(userRow.is_guest) === 1) {
    return {
      authenticated: false,
      user: null,
      profile: null,
      preferences: null,
      halls: [],
      billing: attachBilling(null, null),
      linked_providers: [],
    };
  }

  const user = rowToUser(userRow);
  const profileRow = d.prepare(`SELECT * FROM user_profiles WHERE user_id = ?`).get(userId) as
    | Record<string, unknown>
    | undefined;
  const prefRow = d.prepare(`SELECT * FROM user_preferences WHERE user_id = ?`).get(userId) as
    | Record<string, unknown>
    | undefined;

  return {
    authenticated: true,
    user,
    profile: rowToProfile(profileRow, user.email),
    preferences: rowToPreferences(prefRow),
    halls: getUserHalls(userId),
    billing: attachBilling(userId, user),
    linked_providers: getLinkedProviders(userId),
  };
}

export function updateUserProfile(
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
): AuthMeResponse {
  const d = getDb();
  ensureProfileAndPreferences(userId);

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
    const sets = profileFields.map(([col]) => `${col} = ?`).join(", ");
    const values = profileFields.map(([, v]) => v as string | number | null);
    d.prepare(
      `UPDATE user_profiles SET ${sets}, updated_at = datetime('now') WHERE user_id = ?`,
    ).run(...values, userId);
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
    // always allowed regardless of plan. Values are also sanitized against
    // the canonical curated key list so a stale/invalid key can never be
    // stored (see shared/ingredient-preferences/definitions.ts).
    const sanitized = sanitizeFoodPreferenceKeys(patch.excluded_ingredients);
    let allowed = sanitized.length === 0;
    if (!allowed) {
      const userRow = d.prepare(`SELECT * FROM users WHERE user_id = ?`).get(userId) as
        | Record<string, unknown>
        | undefined;
      const billing = attachBilling(userId, userRow ? rowToUser(userRow) : null);
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
    const sets = prefFields.map(([col]) => `${col} = ?`).join(", ");
    const values = prefFields.map(([, v]) => v as string | number);
    d.prepare(
      `UPDATE user_preferences SET ${sets}, updated_at = datetime('now') WHERE user_id = ?`,
    ).run(...values, userId);
  }

  d.prepare(`UPDATE users SET updated_at = datetime('now') WHERE user_id = ?`).run(userId);
  return getAuthMe(userId);
}

export function listSavedRecipes(userId: string): UserSavedRecipeRow[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT recipe_key, recipe_json, saved_at FROM user_saved_recipes WHERE user_id = ? ORDER BY saved_at DESC`,
    )
    .all(userId) as Array<{ recipe_key: string; recipe_json: string; saved_at: string }>;

  return rows.map((row) => ({
    recipe_key: row.recipe_key,
    recipe_json: JSON.parse(row.recipe_json),
    saved_at: row.saved_at,
  }));
}

export function syncSavedRecipes(
  userId: string,
  recipes: Array<{ recipe_key: string; recipe_json: unknown; saved_at?: string }>,
  options?: { replace?: boolean },
): number {
  const d = getDb();
  const stmt = d.prepare(
    `INSERT INTO user_saved_recipes (user_id, recipe_key, recipe_json, saved_at)
     VALUES (?, ?, ?, COALESCE(?, datetime('now')))
     ON CONFLICT(user_id, recipe_key) DO UPDATE SET
       recipe_json = excluded.recipe_json,
       saved_at = CASE
         WHEN excluded.saved_at > user_saved_recipes.saved_at THEN excluded.saved_at
         ELSE user_saved_recipes.saved_at
       END`,
  );

  let upserted = 0;
  const tx = d.transaction(() => {
    for (const recipe of recipes) {
      stmt.run(
        userId,
        recipe.recipe_key,
        JSON.stringify(recipe.recipe_json),
        recipe.saved_at ?? null,
      );
      upserted++;
    }
    if (options?.replace) {
      const keys = recipes.map((r) => r.recipe_key);
      if (keys.length === 0) {
        d.prepare(`DELETE FROM user_saved_recipes WHERE user_id = ?`).run(userId);
      } else {
        const placeholders = keys.map(() => "?").join(", ");
        d.prepare(
          `DELETE FROM user_saved_recipes WHERE user_id = ? AND recipe_key NOT IN (${placeholders})`,
        ).run(userId, ...keys);
      }
    }
  });
  tx();
  return upserted;
}

export function getAuthCapabilitiesForUser(user: UserAccount | null, billing?: UserBillingState) {
  return authCapabilities(user, billing);
}

export function revokeAllAuthSessionsForUser(userId: string): void {
  const d = getDb();
  d.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).run(userId);
}

/**
 * Hall/canteen columns that reference a user purely as an OPTIONAL
 * attribution ("who did this") — nullable in schema, and already treated as
 * nullable elsewhere in the app (e.g. a hall with no canteen manager
 * assigned yet is a normal, pre-existing state). Safe to clear to NULL on
 * account deletion: the Hall, its shared data, and other members are
 * completely unaffected — only the "who" attribution is cleared.
 *
 * This list intentionally excludes columns where the user_id is NOT NULL
 * and represents either (a) the user's own row (handled by direct row
 * deletion below, same precedent as hall_memberships) or (b) shared/
 * historical Hall content whose authorship can't be nulled without a
 * product decision (see the NOT TOUCHED list in deleteUserAccount's doc
 * comment).
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
 * DELETED (private, user-specific — safe to remove):
 * - auth_sessions (all sessions for this user — revokes access everywhere)
 * - auth_identities (every provider/subject mapping for this user_id — a
 *   deleted user's Google/Apple/email identity is fully released, so the
 *   same Google account can sign up again later as a genuinely new account;
 *   see GOOGLE SIGN-IN SAFETY)
 * - auth_magic_links matching this user's email
 * - user_profiles, user_preferences (personal profile + saved preferences)
 * - user_saved_recipes (personal favorites/saves)
 * - shift_reminder_sends (personal reminder delivery history)
 * - user_subscriptions (personal billing/entitlement row — Hall Pro/Stripe subs unaffected)
 * - user_data_snapshots (personal cloud-sync snapshots)
 * - user_meal_history (Firehall Meals Pro V1 Feature 3 — durable "Mark as
 *   Cooked" event log; no identifiable cooked-history events are retained
 *   after account deletion)
 * - hall_memberships for this user only (their membership link, not the Hall itself)
 * - hall_canteen_dues_members for this user only (their own dues enrollment —
 *   NOT NULL user_id, so the row is removed rather than nulled; other
 *   members' enrollments are untouched)
 * - hall_logbook_reads for this user only (their own "last read" marker —
 *   NOT NULL user_id, same treatment)
 * - admin_user_meta (internal admin notes about this user)
 * - email_leads matching this user's email (marketing CRM record)
 * - users row itself
 *
 * CLEARED TO NULL (optional "who did this" attribution only — see
 * HALL_NULLABLE_USER_REFERENCE_COLUMNS; the Hall, its shared data, and other
 * members are unaffected, e.g. halls.created_by_user_id / canteen_manager_user_id):
 * - every column listed in HALL_NULLABLE_USER_REFERENCE_COLUMNS
 *
 * INTENTIONALLY NOT TOUCHED (shared/historical Hall content whose authorship
 * is NOT NULL in schema — clearing it would require inventing an
 * ownership/anonymization policy, which is a product decision, not a bug
 * fix; left dangling and reported — see PRE-LEGAL PRIVACY + CONSENT PRODUCT
 * FIXES and ACCOUNT DELETION HALL REFERENCE INTEGRITY reports):
 * - hall_notes.author_user_id, hall_board_notes.author_user_id (shared
 *   grocery/whiteboard messages authored by this user)
 * - hall_canteen_shortage_reports.reporter_user_id,
 *   hall_canteen_suggestions.suggested_by_user_id (shared canteen reports)
 * - hall_canteen_dues_history.user_id / marked_by_user_id (historical
 *   payment ledger — shared Hall financial record other members and the
 *   canteen manager rely on for accounting)
 * - recipe_crew_ratings / recipe_crew_rating_ballots (anonymous
 *   fingerprint-based votes — no user_id column)
 * - analytics_events (keyed by session/visitor id, not user_id)
 * - the user's Klaviyo marketing profile (handled by the caller, if at all)
 */
export function deleteUserAccount(userId: string): { ok: true; email: string | null } {
  const d = getDb();
  const userRow = d.prepare(`SELECT email FROM users WHERE user_id = ?`).get(userId) as
    | { email: string | null }
    | undefined;
  if (!userRow) {
    return { ok: true, email: null };
  }

  const email = userRow.email ? userRow.email.trim().toLowerCase() : null;

  const tx = d.transaction(() => {
    d.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).run(userId);
    d.prepare(`DELETE FROM auth_identities WHERE user_id = ?`).run(userId);
    if (email) {
      d.prepare(`DELETE FROM auth_magic_links WHERE lower(email) = ?`).run(email);
    }
    d.prepare(`DELETE FROM user_profiles WHERE user_id = ?`).run(userId);
    d.prepare(`DELETE FROM user_preferences WHERE user_id = ?`).run(userId);
    d.prepare(`DELETE FROM user_saved_recipes WHERE user_id = ?`).run(userId);
    d.prepare(`DELETE FROM shift_reminder_sends WHERE user_id = ?`).run(userId);
    d.prepare(`DELETE FROM user_subscriptions WHERE user_id = ?`).run(userId);
    d.prepare(`DELETE FROM user_data_snapshots WHERE user_id = ?`).run(userId);
    d.prepare(`DELETE FROM user_meal_history WHERE user_id = ?`).run(userId);
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
    d.prepare(`DELETE FROM users WHERE user_id = ?`).run(userId);
  });
  tx();

  return { ok: true, email };
}
