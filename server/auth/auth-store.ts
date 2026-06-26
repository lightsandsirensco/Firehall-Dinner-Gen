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
import type { UserBillingState } from "../../shared/billing/types.js";

const AUTH_COOKIE_NAME = "fh_auth";
const SESSION_DAYS = 30;
const MAGIC_LINK_MINUTES = 15;

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

export function findUserByEmail(email: string): UserAccount | null {
  const d = getDb();
  const row = d.prepare(`SELECT * FROM users WHERE email = ? COLLATE NOCASE`).get(email.trim().toLowerCase()) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToUser(row) : null;
}

export function upsertEmailUser(email: string): { user: UserAccount; isNew: boolean } {
  const d = getDb();
  const normalized = email.trim().toLowerCase();
  const existing = findUserByEmail(normalized);
  if (existing) {
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

  const userRow = d.prepare(`SELECT * FROM users WHERE user_id = ?`).get(userId) as Record<string, unknown>;
  return { user: rowToUser(userRow), isNew: true };
}

export function upsertOAuthUser(input: {
  provider: "google" | "apple";
  subject: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): { user: UserAccount; isNew: boolean } {
  const d = getDb();
  const existing = d
    .prepare(`SELECT * FROM users WHERE auth_provider = ? AND provider_subject = ?`)
    .get(input.provider, input.subject) as Record<string, unknown> | undefined;

  if (existing) {
    if (input.email && !existing.email) {
      d.prepare(`UPDATE users SET email = ?, updated_at = datetime('now') WHERE user_id = ?`).run(
        input.email.toLowerCase(),
        String(existing.user_id),
      );
    }
    const refreshed = d.prepare(`SELECT * FROM users WHERE user_id = ?`).get(String(existing.user_id)) as Record<
      string,
      unknown
    >;
    return { user: rowToUser(refreshed), isNew: false };
  }

  const userId = createUserId();
  const email = input.email?.trim().toLowerCase() ?? null;
  d.prepare(
    `INSERT INTO users (user_id, email, auth_provider, is_guest, provider_subject)
     VALUES (?, ?, ?, 0, ?)`,
  ).run(userId, email, input.provider, input.subject);
  ensureProfileAndPreferences(userId);

  const displayName =
    [input.firstName, input.lastName].filter(Boolean).join(" ").trim() ||
    email?.split("@")[0] ||
    "Firefighter";

  d.prepare(
    `UPDATE user_profiles SET first_name = ?, last_name = ?, display_name = ? WHERE user_id = ?`,
  ).run(input.firstName ?? null, input.lastName ?? null, displayName, userId);

  const userRow = d.prepare(`SELECT * FROM users WHERE user_id = ?`).get(userId) as Record<string, unknown>;
  return { user: rowToUser(userRow), isNew: true };
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
