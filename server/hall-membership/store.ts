import crypto from "crypto";
import { nanoid } from "nanoid";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import type {
  HallDetailPayload,
  HallInviteMethod,
  HallInviteRecord,
  HallJoinPreview,
  HallMemberRecord,
  HallPermission,
  HallRecord,
  HallRole,
  HallShiftRecord,
  HallSummary,
} from "../../shared/hall-membership/types.js";
import {
  normalizeHallRole,
  permissionsForRole,
} from "../../shared/hall-membership/types.js";
import {
  normalizeShiftInputs,
  shiftNamesFromInputs,
  type HallShiftInput,
  type HallShiftKey,
} from "../../shared/hall-identity/shifts.js";
import { syncCanteenManagerFromRole } from "../hall-canteen/manager-sync.js";

let db: SqliteDatabase;

export async function initHallMembershipStore(): Promise<void> {
  db = await getSharedLocalDb();
}

export function bindHallMembershipDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Hall membership store not initialized — call initHallMembershipStore() first");
  }
  return db;
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

function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.VITE_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:5000"
  ).replace(/\/$/, "");
}

function buildInviteUrl(token: string): string {
  return `${appBaseUrl()}/hall/join?token=${encodeURIComponent(token)}`;
}

function generateJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return code;
}

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function uniqueJoinCode(d: SqliteDatabase): string {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateJoinCode();
    const exists = d.prepare(`SELECT 1 FROM halls WHERE join_code = ?`).get(code);
    if (!exists) return code;
  }
  return nanoid(8).toUpperCase();
}

function departmentName(row: Record<string, unknown>): string | null {
  const value = row.department ?? row.department_name;
  return value ? String(value) : null;
}

function memberDisplayName(userId: string): string | null {
  const row = getDb()
    .prepare(
      `SELECT p.display_name, p.first_name, u.email
       FROM user_profiles p
       JOIN users u ON u.user_id = p.user_id
       WHERE p.user_id = ?`,
    )
    .get(userId) as
    | { display_name: string | null; first_name: string | null; email: string | null }
    | undefined;
  if (!row) return null;
  return (
    row.display_name?.trim() ||
    row.first_name?.trim() ||
    row.email?.split("@")[0] ||
    null
  );
}

function rowToShift(row: Record<string, unknown>): HallShiftRecord {
  return {
    shift_id: String(row.shift_id),
    hall_id: String(row.hall_id),
    shift_key: String(row.shift_key) as HallShiftKey,
    name: String(row.name),
    enabled: Number(row.enabled) === 1,
    sort_order: Number(row.sort_order ?? 0),
    member_count: Number(row.member_count ?? 0),
  };
}

function listHallShifts(hallId: string): HallShiftRecord[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT s.*,
              (SELECT COUNT(*) FROM hall_memberships m WHERE m.shift_id = s.shift_id) AS member_count
       FROM hall_shifts s
       WHERE s.hall_id = ?
       ORDER BY s.sort_order ASC, s.shift_key ASC`,
    )
    .all(hallId) as Array<Record<string, unknown>>;
  return rows.map(rowToShift);
}

function syncShiftNamesJson(hallId: string, shifts: HallShiftRecord[]): void {
  const names = shifts.filter((shift) => shift.enabled).map((shift) => shift.name);
  getDb()
    .prepare(`UPDATE halls SET shift_names_json = ?, updated_at = datetime('now') WHERE hall_id = ?`)
    .run(JSON.stringify(names), hallId);
}

export function seedHallShifts(
  hallId: string,
  inputs?: HallShiftInput[] | null,
  legacyNames?: string[] | null,
): HallShiftRecord[] {
  const d = getDb();
  const normalized = normalizeShiftInputs(inputs, legacyNames);

  for (const [index, shift] of normalized.entries()) {
    const shiftId = `${hallId}-shift-${shift.shift_key}`;
    d.prepare(
      `INSERT INTO hall_shifts (shift_id, hall_id, shift_key, name, enabled, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(hall_id, shift_key) DO UPDATE SET
         name = excluded.name,
         enabled = excluded.enabled,
         sort_order = excluded.sort_order,
         updated_at = datetime('now')`,
    ).run(shiftId, hallId, shift.shift_key, shift.name, shift.enabled ? 1 : 0, index);
  }

  const shifts = listHallShifts(hallId);
  syncShiftNamesJson(hallId, shifts);
  return shifts;
}

function ensureHallShifts(hallId: string): HallShiftRecord[] {
  const existing = listHallShifts(hallId);
  if (existing.length === 4) return existing;

  const row = getDb()
    .prepare(`SELECT shift_names_json FROM halls WHERE hall_id = ?`)
    .get(hallId) as { shift_names_json: string } | undefined;
  return seedHallShifts(hallId, null, parseJsonArray(row?.shift_names_json));
}

function rowToHall(row: Record<string, unknown>, shifts: HallShiftRecord[]): HallRecord {
  const dept = departmentName(row);
  const enabledNames = shifts.filter((shift) => shift.enabled).map((shift) => shift.name);
  const canteenManagerUserId = row.canteen_manager_user_id
    ? String(row.canteen_manager_user_id)
    : null;
  return {
    hall_id: String(row.hall_id),
    hall_name: String(row.name ?? row.hall_name ?? ""),
    station_number: row.station_number ? String(row.station_number) : null,
    department: dept,
    department_name: dept,
    city: row.city ? String(row.city) : null,
    province_state: row.province_state ? String(row.province_state) : null,
    postal_code: row.postal_code ? String(row.postal_code) : null,
    crew_size: row.crew_size != null ? Number(row.crew_size) : null,
    hall_photo_url: row.hall_photo_url ? String(row.hall_photo_url) : null,
    motto: row.motto ? String(row.motto) : null,
    canteen_manager_user_id: canteenManagerUserId,
    canteen_manager_display_name: canteenManagerUserId
      ? memberDisplayName(canteenManagerUserId)
      : null,
    shift_names: enabledNames.length > 0 ? enabledNames : shiftNamesFromInputs(normalizeShiftInputs(null, parseJsonArray(row.shift_names_json as string))),
    shifts,
    appliances: parseJsonArray(row.appliances_json as string),
    join_code: row.join_code ? String(row.join_code) : "",
    created_by_user_id: row.created_by_user_id ? String(row.created_by_user_id) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export function getHallMember(hallId: string, userId: string): HallMemberRecord | null {
  const d = getDb();
  const row = d
    .prepare(
      `SELECT m.hall_id, m.user_id, m.role, m.shift_id, m.joined_at,
              p.display_name, u.email,
              s.name AS shift_name, s.shift_key
       FROM hall_memberships m
       JOIN users u ON u.user_id = m.user_id
       LEFT JOIN user_profiles p ON p.user_id = m.user_id
       LEFT JOIN hall_shifts s ON s.shift_id = m.shift_id
       WHERE m.hall_id = ? AND m.user_id = ?`,
    )
    .get(hallId, userId) as Record<string, unknown> | undefined;

  if (!row) return null;
  const role = normalizeHallRole(String(row.role));
  return {
    hall_id: String(row.hall_id),
    user_id: String(row.user_id),
    role,
    shift_id: row.shift_id ? String(row.shift_id) : null,
    shift_name: row.shift_name ? String(row.shift_name) : null,
    shift_key: row.shift_key ? (String(row.shift_key) as HallShiftKey) : null,
    display_name: row.display_name ? String(row.display_name) : null,
    email: row.email ? String(row.email) : null,
    joined_at: String(row.joined_at),
    permissions: getPermissionsForRole(role),
  };
}

export function getPermissionsForRole(role: HallRole): HallPermission[] {
  return permissionsForRole(role);
}

export function memberHasPermission(
  hallId: string,
  userId: string,
  permission: HallPermission,
): boolean {
  const member = getHallMember(hallId, userId);
  if (!member) return false;
  return member.permissions.includes(permission);
}

export function listUserHallSummaries(userId: string): HallSummary[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT h.hall_id, h.name, h.station_number, h.department, m.role,
              (SELECT COUNT(*) FROM hall_memberships hm WHERE hm.hall_id = h.hall_id) AS member_count
       FROM hall_memberships m
       JOIN halls h ON h.hall_id = m.hall_id
       WHERE m.user_id = ?
       ORDER BY m.joined_at DESC`,
    )
    .all(userId) as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const dept = departmentName(row);
    return {
      hall_id: String(row.hall_id),
      hall_name: String(row.name),
      station_number: row.station_number ? String(row.station_number) : null,
      department: dept,
      department_name: dept,
      role: normalizeHallRole(String(row.role)),
      member_count: Number(row.member_count ?? 0),
    };
  });
}

export function listHallMembers(hallId: string): HallMemberRecord[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT m.hall_id, m.user_id, m.role, m.shift_id, m.joined_at,
              p.display_name, u.email,
              s.name AS shift_name, s.shift_key
       FROM hall_memberships m
       JOIN users u ON u.user_id = m.user_id
       LEFT JOIN user_profiles p ON p.user_id = m.user_id
       LEFT JOIN hall_shifts s ON s.shift_id = m.shift_id
       WHERE m.hall_id = ?
       ORDER BY
         CASE m.role
           WHEN 'captain' THEN 0
           WHEN 'canteen_manager' THEN 1
           ELSE 2
         END,
         m.joined_at ASC`,
    )
    .all(hallId) as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const role = normalizeHallRole(String(row.role));
    return {
      hall_id: String(row.hall_id),
      user_id: String(row.user_id),
      role,
      shift_id: row.shift_id ? String(row.shift_id) : null,
      shift_name: row.shift_name ? String(row.shift_name) : null,
      shift_key: row.shift_key ? (String(row.shift_key) as HallShiftKey) : null,
      display_name: row.display_name ? String(row.display_name) : null,
      email: row.email ? String(row.email) : null,
      joined_at: String(row.joined_at),
      permissions: getPermissionsForRole(role),
    };
  });
}

function getHallProSummary(hallId: string): HallDetailPayload["hall_pro"] {
  const d = getDb();
  const row = d.prepare(`SELECT status FROM hall_subscriptions WHERE hall_id = ?`).get(hallId) as
    | { status: string }
    | undefined;
  if (!row) {
    return { active: false, status: null, trial_started_at: null };
  }
  const status = String(row.status) as "active" | "trialing" | "cancelled";
  let trialStartedAt: string | null = null;
  try {
    const trialRow = d
      .prepare(`SELECT trial_started_at FROM hall_subscriptions WHERE hall_id = ?`)
      .get(hallId) as { trial_started_at: string | null } | undefined;
    trialStartedAt = trialRow?.trial_started_at ? String(trialRow.trial_started_at) : null;
  } catch {
    trialStartedAt = null;
  }
  return {
    active: status === "active" || status === "trialing",
    status,
    trial_started_at: trialStartedAt,
  };
}

export function getHallDetail(hallId: string, userId: string): HallDetailPayload | null {
  const d = getDb();
  const row = d.prepare(`SELECT * FROM halls WHERE hall_id = ?`).get(hallId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;

  const myMember = getHallMember(hallId, userId);
  if (!myMember) return null;

  const shifts = ensureHallShifts(hallId);

  return {
    hall: rowToHall(row, shifts),
    shifts,
    members: listHallMembers(hallId),
    my_role: myMember.role,
    my_permissions: myMember.permissions,
    hall_pro: getHallProSummary(hallId),
  };
}

export interface CreateHallInput {
  hall_name: string;
  station_number?: string | null;
  department?: string | null;
  city?: string | null;
  province_state?: string | null;
  postal_code?: string | null;
  crew_size?: number | null;
  hall_photo_url?: string | null;
  motto?: string | null;
  /** @deprecated use shifts */
  shift_names?: string[];
  shifts?: HallShiftInput[];
  appliances?: string[];
}

export interface UpdateHallInput extends Partial<CreateHallInput> {}

export function createHall(userId: string, input: CreateHallInput): HallDetailPayload {
  const d = getDb();
  const hallId = nanoid(10);
  const joinCode = uniqueJoinCode(d);
  const shiftInputs = normalizeShiftInputs(input.shifts, input.shift_names);

  d.prepare(
    `INSERT INTO halls (
      hall_id, name, station_number, department, city, province_state, crew_size,
      shift_names_json, appliances_json, join_code, created_by_user_id, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  ).run(
    hallId,
    input.hall_name.trim(),
    input.station_number?.trim() || null,
    input.department?.trim() || null,
    input.city?.trim() || null,
    input.province_state?.trim() || null,
    input.crew_size ?? null,
    JSON.stringify(shiftNamesFromInputs(shiftInputs)),
    JSON.stringify(input.appliances ?? []),
    joinCode,
    userId,
  );

  if (input.postal_code?.trim()) {
    try {
      d.prepare(`UPDATE halls SET postal_code = ? WHERE hall_id = ?`).run(
        input.postal_code.trim().toUpperCase(),
        hallId,
      );
    } catch {
      /* postal_code column requires migration 026 */
    }
  }

  if (input.hall_photo_url?.trim() || input.motto?.trim()) {
    try {
      d.prepare(`UPDATE halls SET hall_photo_url = ?, motto = ? WHERE hall_id = ?`).run(
        input.hall_photo_url?.trim() || null,
        input.motto?.trim() || null,
        hallId,
      );
    } catch {
      /* hall_photo_url / motto require migration 036 */
    }
  }

  d.prepare(`INSERT INTO hall_memberships (hall_id, user_id, role) VALUES (?, ?, 'captain')`).run(
    hallId,
    userId,
  );

  seedHallShifts(hallId, shiftInputs);

  return getHallDetail(hallId, userId)!;
}

export function updateHall(
  hallId: string,
  userId: string,
  patch: UpdateHallInput,
): HallRecord | null {
  if (!memberHasPermission(hallId, userId, "manage_settings")) return null;

  const d = getDb();
  const fields: Array<[string, string | number | null]> = [];
  if (patch.hall_name) fields.push(["name", patch.hall_name.trim()]);
  if ("station_number" in patch) fields.push(["station_number", patch.station_number ?? null]);
  if ("department" in patch) fields.push(["department", patch.department ?? null]);
  if ("city" in patch) fields.push(["city", patch.city ?? null]);
  if ("province_state" in patch) fields.push(["province_state", patch.province_state ?? null]);
  if ("crew_size" in patch) fields.push(["crew_size", patch.crew_size ?? null]);
  if ("hall_photo_url" in patch || "motto" in patch) {
    try {
      if ("hall_photo_url" in patch) {
        d.prepare(`UPDATE halls SET hall_photo_url = ?, updated_at = datetime('now') WHERE hall_id = ?`).run(
          patch.hall_photo_url?.trim() || null,
          hallId,
        );
      }
      if ("motto" in patch) {
        d.prepare(`UPDATE halls SET motto = ?, updated_at = datetime('now') WHERE hall_id = ?`).run(
          patch.motto?.trim() || null,
          hallId,
        );
      }
    } catch {
      /* hall_photo_url / motto require migration 036 */
    }
  }

  if (fields.length > 0) {
    const sets = fields.map(([col]) => `${col} = ?`).join(", ");
    const values = fields.map(([, v]) => v);
    d.prepare(`UPDATE halls SET ${sets}, updated_at = datetime('now') WHERE hall_id = ?`).run(
      ...values,
      hallId,
    );
  }

  if (patch.shifts || patch.shift_names) {
    seedHallShifts(hallId, patch.shifts, patch.shift_names);
  }

  const row = d.prepare(`SELECT * FROM halls WHERE hall_id = ?`).get(hallId) as Record<string, unknown>;
  if (!row) return null;
  return rowToHall(row, ensureHallShifts(hallId));
}

function addMember(hallId: string, userId: string, role: HallRole = "member"): HallSummary | null {
  const d = getDb();
  const hall = d.prepare(`SELECT hall_id, name, station_number, department, city, province_state FROM halls WHERE hall_id = ?`).get(
    hallId,
  ) as Record<string, unknown> | undefined;
  if (!hall) return null;

  d.prepare(
    `INSERT INTO hall_memberships (hall_id, user_id, role) VALUES (?, ?, ?)
     ON CONFLICT(hall_id, user_id) DO NOTHING`,
  ).run(hallId, userId, role);

  const memberCount = d
    .prepare(`SELECT COUNT(*) AS c FROM hall_memberships WHERE hall_id = ?`)
    .get(hallId) as { c: number };

  const member = getHallMember(hallId, userId);
  const dept = departmentName(hall);
  return {
    hall_id: hallId,
    hall_name: String(hall.name),
    station_number: hall.station_number ? String(hall.station_number) : null,
    department: dept,
    department_name: dept,
    role: member?.role ?? role,
    member_count: Number(memberCount.c),
  };
}

export interface JoinHallInput {
  hall_id?: string;
  join_code?: string;
  invite_token?: string;
  invite_code?: string;
}

export type JoinHallResult =
  | { ok: true; hall: HallSummary; via: "hall_id" | "join_code" | "invite"; invite_id?: string }
  | { ok: false; reason: "not_found" | "invite_expired" | "invite_exhausted" };

function resolveInvite(
  input: { invite_token?: string; invite_code?: string },
): { hall_id: string; invite_id: string; method: HallInviteMethod } | null {
  const d = getDb();
  let row: Record<string, unknown> | undefined;

  if (input.invite_token) {
    row = d
      .prepare(`SELECT * FROM hall_invites WHERE invite_token = ?`)
      .get(input.invite_token) as Record<string, unknown> | undefined;
  } else if (input.invite_code) {
    row = d
      .prepare(`SELECT * FROM hall_invites WHERE invite_code = ? COLLATE NOCASE`)
      .get(input.invite_code.toUpperCase()) as Record<string, unknown> | undefined;
  }

  if (!row) return null;
  if (new Date(String(row.expires_at)).getTime() < Date.now()) return null;
  if (row.max_uses != null && Number(row.use_count) >= Number(row.max_uses)) return null;

  return {
    hall_id: String(row.hall_id),
    invite_id: String(row.invite_id),
    method: row.method as HallInviteMethod,
  };
}

export function joinHall(userId: string, input: JoinHallInput): JoinHallResult {
  const d = getDb();
  let hallId: string | null = null;
  let via: "hall_id" | "join_code" | "invite" = "hall_id";
  let inviteId: string | undefined;

  if (input.invite_token || input.invite_code) {
    const invite = resolveInvite(input);
    if (!invite) {
      const probe = d
        .prepare(
          `SELECT expires_at, max_uses, use_count FROM hall_invites
           WHERE invite_token = ? OR invite_code = ? COLLATE NOCASE`,
        )
        .get(input.invite_token ?? null, input.invite_code?.toUpperCase() ?? null) as
        | { expires_at: string; max_uses: number | null; use_count: number }
        | undefined;
      if (probe) {
        if (new Date(probe.expires_at).getTime() < Date.now()) {
          return { ok: false, reason: "invite_expired" };
        }
        if (probe.max_uses != null && probe.use_count >= probe.max_uses) {
          return { ok: false, reason: "invite_exhausted" };
        }
      }
      return { ok: false, reason: "not_found" };
    }
    hallId = invite.hall_id;
    inviteId = invite.invite_id;
    via = "invite";
  } else if (input.join_code) {
    const row = d
      .prepare(`SELECT hall_id FROM halls WHERE join_code = ? COLLATE NOCASE`)
      .get(input.join_code.toUpperCase()) as { hall_id: string } | undefined;
    if (!row) return { ok: false, reason: "not_found" };
    hallId = row.hall_id;
    via = "join_code";
  } else if (input.hall_id) {
    const row = d.prepare(`SELECT hall_id FROM halls WHERE hall_id = ?`).get(input.hall_id) as
      | { hall_id: string }
      | undefined;
    if (!row) return { ok: false, reason: "not_found" };
    hallId = row.hall_id;
    via = "hall_id";
  } else {
    return { ok: false, reason: "not_found" };
  }

  const existing = getHallMember(hallId, userId);
  const hall = addMember(hallId, userId, existing?.role ?? "member");
  if (!hall) return { ok: false, reason: "not_found" };

  if (inviteId && !existing) {
    d.prepare(`UPDATE hall_invites SET use_count = use_count + 1 WHERE invite_id = ?`).run(inviteId);
  }

  return { ok: true, hall, via, invite_id: inviteId };
}

export function getJoinPreview(input: {
  invite_token?: string;
  invite_code?: string;
  join_code?: string;
}): HallJoinPreview | null {
  const d = getDb();
  let hallId: string | null = null;
  let inviteMethod: HallInviteMethod | undefined;

  if (input.invite_token || input.invite_code) {
    const invite = resolveInvite({
      invite_token: input.invite_token,
      invite_code: input.invite_code,
    });
    if (!invite) return null;
    hallId = invite.hall_id;
    inviteMethod = invite.method;
  } else if (input.join_code) {
    const row = d
      .prepare(`SELECT hall_id FROM halls WHERE join_code = ? COLLATE NOCASE`)
      .get(input.join_code.toUpperCase()) as { hall_id: string } | undefined;
    if (!row) return null;
    hallId = row.hall_id;
  }

  if (!hallId) return null;

  const hall = d.prepare(`SELECT hall_id, name, station_number, department, city, province_state FROM halls WHERE hall_id = ?`).get(
    hallId,
  ) as Record<string, unknown> | undefined;
  if (!hall) return null;

  const countRow = d
    .prepare(`SELECT COUNT(*) AS c FROM hall_memberships WHERE hall_id = ?`)
    .get(hallId) as { c: number };

  const dept = departmentName(hall);
  return {
    hall_id: String(hall.hall_id),
    hall_name: String(hall.name),
    station_number: hall.station_number ? String(hall.station_number) : null,
    department: dept,
    department_name: dept,
    city: hall.city ? String(hall.city) : null,
    province_state: hall.province_state ? String(hall.province_state) : null,
    member_count: Number(countRow.c),
    invite_method: inviteMethod,
  };
}

export function createHallInvite(
  hallId: string,
  userId: string,
  method: HallInviteMethod,
  options?: { max_uses?: number | null; expires_in_hours?: number },
): HallInviteRecord | null {
  if (!memberHasPermission(hallId, userId, "manage_members")) return null;

  const d = getDb();
  const inviteId = nanoid(12);
  const hours = options?.expires_in_hours ?? 72;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  let inviteToken: string | null = null;
  let inviteCode: string | null = null;
  let inviteUrl: string | null = null;

  if (method === "link" || method === "qr") {
    inviteToken = nanoid(16);
    inviteUrl = buildInviteUrl(inviteToken);
  }
  if (method === "code") {
    inviteCode = generateInviteCode();
  }
  if (method === "qr" && inviteToken) {
    inviteUrl = buildInviteUrl(inviteToken);
  }

  d.prepare(
    `INSERT INTO hall_invites (
      invite_id, hall_id, method, invite_token, invite_code,
      created_by_user_id, expires_at, max_uses
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    inviteId,
    hallId,
    method,
    inviteToken,
    inviteCode,
    userId,
    expiresAt,
    options?.max_uses ?? null,
  );

  return {
    invite_id: inviteId,
    hall_id: hallId,
    method,
    invite_token: inviteToken,
    invite_code: inviteCode,
    invite_url: inviteUrl,
    expires_at: expiresAt,
    max_uses: options?.max_uses ?? null,
    use_count: 0,
    created_at: new Date().toISOString(),
  };
}

export function listHallInvites(hallId: string, userId: string): HallInviteRecord[] {
  if (!memberHasPermission(hallId, userId, "manage_members")) return [];

  const d = getDb();
  const rows = d
    .prepare(
      `SELECT * FROM hall_invites WHERE hall_id = ? AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 20`,
    )
    .all(hallId) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    invite_id: String(row.invite_id),
    hall_id: String(row.hall_id),
    method: row.method as HallInviteMethod,
    invite_token: row.invite_token ? String(row.invite_token) : null,
    invite_code: row.invite_code ? String(row.invite_code) : null,
    invite_url: row.invite_token ? buildInviteUrl(String(row.invite_token)) : null,
    expires_at: String(row.expires_at),
    max_uses: row.max_uses != null ? Number(row.max_uses) : null,
    use_count: Number(row.use_count ?? 0),
    created_at: String(row.created_at),
  }));
}

export function revokeHallInvite(hallId: string, userId: string, inviteId: string): boolean {
  if (!memberHasPermission(hallId, userId, "manage_members")) return false;
  const d = getDb();
  d.prepare(`DELETE FROM hall_invites WHERE invite_id = ? AND hall_id = ?`).run(inviteId, hallId);
  return true;
}

export function updateMemberRole(
  hallId: string,
  actorUserId: string,
  targetUserId: string,
  role: HallRole,
): boolean {
  return updateMember(hallId, actorUserId, targetUserId, { role });
}

export function updateMemberShift(
  hallId: string,
  actorUserId: string,
  targetUserId: string,
  shiftId: string | null,
): boolean {
  return updateMember(hallId, actorUserId, targetUserId, { shift_id: shiftId });
}

export function updateMember(
  hallId: string,
  actorUserId: string,
  targetUserId: string,
  patch: { role?: HallRole; shift_id?: string | null },
): boolean {
  const d = getDb();
  const target = getHallMember(hallId, targetUserId);
  if (!target) return false;

  const changingRole = patch.role !== undefined;
  const changingShift = patch.shift_id !== undefined;

  if (!changingRole && !changingShift) return false;

  if (changingRole) {
    if (!memberHasPermission(hallId, actorUserId, "manage_members")) return false;

    if (target.role === "captain" && patch.role !== "captain") {
      const captains = d
        .prepare(`SELECT COUNT(*) AS c FROM hall_memberships WHERE hall_id = ? AND role = 'captain'`)
        .get(hallId) as { c: number };
      if (Number(captains.c) <= 1) return false;
    }

    d.prepare(`UPDATE hall_memberships SET role = ? WHERE hall_id = ? AND user_id = ?`).run(
      patch.role!,
      hallId,
      targetUserId,
    );

    try {
      syncCanteenManagerFromRole(d, hallId, targetUserId, patch.role!);
    } catch {
      /* canteen migration may not be applied yet */
    }
  }

  if (changingShift) {
    const selfEdit = actorUserId === targetUserId;
    if (!selfEdit && !memberHasPermission(hallId, actorUserId, "manage_members")) {
      return false;
    }

    if (patch.shift_id) {
      const shift = d
        .prepare(`SELECT shift_id, enabled FROM hall_shifts WHERE shift_id = ? AND hall_id = ?`)
        .get(patch.shift_id, hallId) as { shift_id: string; enabled: number } | undefined;
      if (!shift || Number(shift.enabled) !== 1) return false;
    }

    d.prepare(`UPDATE hall_memberships SET shift_id = ? WHERE hall_id = ? AND user_id = ?`).run(
      patch.shift_id ?? null,
      hallId,
      targetUserId,
    );
  }

  return true;
}

export function removeHallMember(
  hallId: string,
  actorUserId: string,
  targetUserId: string,
): boolean {
  if (!memberHasPermission(hallId, actorUserId, "manage_members")) return false;
  if (actorUserId === targetUserId) return false;

  const d = getDb();
  const target = getHallMember(hallId, targetUserId);
  if (!target) return false;

  if (target.role === "captain") {
    const captains = d
      .prepare(`SELECT COUNT(*) AS c FROM hall_memberships WHERE hall_id = ? AND role = 'captain'`)
      .get(hallId) as { c: number };
    if (Number(captains.c) <= 1) return false;
  }

  d.prepare(`DELETE FROM hall_memberships WHERE hall_id = ? AND user_id = ?`).run(hallId, targetUserId);
  return true;
}

/** Backward-compatible thin wrappers */
export function createHallLegacy(userId: string, name: string): HallSummary {
  const detail = createHall(userId, { hall_name: name });
  return {
    hall_id: detail.hall.hall_id,
    hall_name: detail.hall.hall_name,
    station_number: detail.hall.station_number,
    department: detail.hall.department,
    department_name: detail.hall.department_name,
    role: detail.my_role,
    member_count: detail.members.length,
  };
}

export function joinHallLegacy(userId: string, hallId: string): HallSummary | null {
  const result = joinHall(userId, { hall_id: hallId });
  return result.ok ? result.hall : null;
}
