import { nanoid } from "nanoid";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { getHallMember } from "../hall-membership/store.js";
import type { HallRole } from "../../shared/hall-membership/types.js";
import { normalizeHallRole } from "../../shared/hall-membership/types.js";
import type {
  HallCanteenCategory,
  HallCanteenItem,
  HallCanteenPayload,
  HallCanteenStatus,
} from "../../shared/hall-canteen/types.js";
import {
  canManageCanteenList,
  canUpdateCanteenStatus,
  canViewCanteen,
  DEFAULT_HALL_CANTEEN_ITEMS,
  findCanteenItemByName,
  isCanteenAttentionStatus,
  isPickupExpired,
  isProteinStapleName,
  isShoppingThisWeekStatus,
} from "../../shared/hall-canteen/types.js";

let db: SqliteDatabase;

export async function initHallCanteenStore(): Promise<void> {
  db = await getSharedLocalDb();
}

export function bindHallCanteenDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Hall canteen store not initialized");
  }
  return db;
}

function memberRole(hallId: string, userId: string): HallRole | null {
  const member = getHallMember(hallId, userId);
  return member ? normalizeHallRole(member.role) : null;
}

function canteenManagerUserId(hallId: string): string | null {
  const row = getDb()
    .prepare(`SELECT canteen_manager_user_id FROM halls WHERE hall_id = ?`)
    .get(hallId) as { canteen_manager_user_id: string | null } | undefined;
  return row?.canteen_manager_user_id ?? null;
}

function memberDisplayName(userId: string): string {
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
  if (!row) return "Crew member";
  return (
    row.display_name?.trim() ||
    row.first_name?.trim() ||
    row.email?.split("@")[0] ||
    "Crew member"
  );
}

function rowToItem(row: Record<string, unknown>): HallCanteenItem {
  const pickedUpByUserId = row.picked_up_by_user_id ? String(row.picked_up_by_user_id) : null;
  return {
    item_id: String(row.item_id),
    hall_id: String(row.hall_id),
    name: String(row.name),
    category: String(row.category) as HallCanteenCategory,
    status: String(row.status) as HallCanteenStatus,
    is_default: Number(row.is_default) === 1,
    sort_order: Number(row.sort_order) || 0,
    archived: Number(row.archived) === 1,
    picked_up_by_user_id: pickedUpByUserId,
    picked_up_by_display_name: pickedUpByUserId ? memberDisplayName(pickedUpByUserId) : null,
    picked_up_at: row.picked_up_at ? String(row.picked_up_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function listItems(hallId: string): HallCanteenItem[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT item_id, hall_id, name, category, status, is_default, sort_order, archived,
              picked_up_by_user_id, picked_up_at, created_at, updated_at
       FROM hall_canteen_items
       WHERE hall_id = ? AND archived = 0
       ORDER BY category ASC, sort_order ASC, name ASC`,
    )
    .all(hallId) as Record<string, unknown>[];
  return rows.map(rowToItem);
}

function seedDefaults(hallId: string): void {
  const d = getDb();
  const existing = d
    .prepare(`SELECT name FROM hall_canteen_items WHERE hall_id = ? AND archived = 0`)
    .all(hallId) as Array<{ name: string }>;
  const existingNames = new Set(existing.map((row) => row.name.toLowerCase()));

  const now = new Date().toISOString();
  const insert = d.prepare(
    `INSERT INTO hall_canteen_items
     (item_id, hall_id, name, category, status, is_default, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'good', 1, ?, ?, ?)`,
  );

  for (const seed of DEFAULT_HALL_CANTEEN_ITEMS) {
    if (existingNames.has(seed.name.toLowerCase())) continue;
    insert.run(nanoid(), hallId, seed.name, seed.category, seed.sort_order, now, now);
  }
}

function expireStalePickups(hallId: string): void {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT item_id, picked_up_at FROM hall_canteen_items
       WHERE hall_id = ? AND archived = 0 AND status = 'being_picked_up' AND picked_up_at IS NOT NULL`,
    )
    .all(hallId) as Array<{ item_id: string; picked_up_at: string }>;

  const now = new Date().toISOString();
  const update = d.prepare(
    `UPDATE hall_canteen_items
     SET status = 'running_low', picked_up_by_user_id = NULL, picked_up_at = NULL,
         updated_at = ?, last_updated_by_user_id = NULL
     WHERE item_id = ? AND hall_id = ?`,
  );

  for (const row of rows) {
    if (isPickupExpired(row.picked_up_at)) {
      update.run(now, row.item_id, hallId);
    }
  }
}

export function buildCanteenPayload(hallId: string, userId: string): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canViewCanteen(role)) return null;

  expireStalePickups(hallId);

  const items = listItems(hallId);
  const needs_attention = items.filter((item) => isCanteenAttentionStatus(item.status));
  const shopping_this_week = items.filter((item) => isShoppingThisWeekStatus(item.status));

  return {
    items,
    needs_attention,
    shopping_this_week,
    running_low: items.filter((item) => item.status === "running_low"),
    out: items.filter((item) => item.status === "out"),
    needs_attention_count: needs_attention.length,
    my_role: role,
    can_update: canUpdateCanteenStatus(role),
    can_manage_list: canManageCanteenList(role),
    canteen_manager_user_id: canteenManagerUserId(hallId),
  };
}

export function getOrSeedHallCanteen(hallId: string, userId: string): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;

  seedDefaults(hallId);
  return buildCanteenPayload(hallId, userId);
}

export function setCanteenItemStatus(
  hallId: string,
  userId: string,
  itemId: string,
  status: HallCanteenStatus,
): { payload: HallCanteenPayload; item: HallCanteenItem } | null {
  const role = memberRole(hallId, userId);
  if (!role || !canUpdateCanteenStatus(role)) return null;

  const d = getDb();
  const row = d
    .prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ? AND hall_id = ? AND archived = 0`)
    .get(itemId, hallId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const now = new Date().toISOString();
  const clearPickup = status === "good" || isCanteenAttentionStatus(status);
  d.prepare(
    `UPDATE hall_canteen_items
     SET status = ?,
         last_updated_by_user_id = ?,
         updated_at = ?,
         picked_up_by_user_id = CASE WHEN ? THEN NULL ELSE picked_up_by_user_id END,
         picked_up_at = CASE WHEN ? THEN NULL ELSE picked_up_at END
     WHERE item_id = ?`,
  ).run(status, userId, now, clearPickup ? 1 : 0, clearPickup ? 1 : 0, itemId);

  const item = rowToItem(
    d.prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ?`).get(itemId) as Record<
      string,
      unknown
    >,
  );
  const payload = buildCanteenPayload(hallId, userId);
  if (!payload) return null;
  return { payload, item };
}

export function claimCanteenPickup(
  hallId: string,
  userId: string,
  itemId: string,
): { payload: HallCanteenPayload; item: HallCanteenItem } | null {
  const role = memberRole(hallId, userId);
  if (!role || !canUpdateCanteenStatus(role)) return null;

  expireStalePickups(hallId);

  const d = getDb();
  const row = d
    .prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ? AND hall_id = ? AND archived = 0`)
    .get(itemId, hallId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const currentStatus = String(row.status) as HallCanteenStatus;
  if (!isCanteenAttentionStatus(currentStatus)) return null;

  const now = new Date().toISOString();
  d.prepare(
    `UPDATE hall_canteen_items
     SET status = 'being_picked_up',
         picked_up_by_user_id = ?,
         picked_up_at = ?,
         last_updated_by_user_id = ?,
         updated_at = ?
     WHERE item_id = ? AND hall_id = ?`,
  ).run(userId, now, userId, now, itemId, hallId);

  const item = rowToItem(
    d.prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ?`).get(itemId) as Record<
      string,
      unknown
    >,
  );
  const payload = buildCanteenPayload(hallId, userId);
  if (!payload) return null;
  return { payload, item };
}

export function releaseCanteenPickup(
  hallId: string,
  userId: string,
  itemId: string,
): { payload: HallCanteenPayload; item: HallCanteenItem } | null {
  const role = memberRole(hallId, userId);
  if (!role || !canManageCanteenList(role)) return null;

  const d = getDb();
  const row = d
    .prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ? AND hall_id = ? AND archived = 0`)
    .get(itemId, hallId) as Record<string, unknown> | undefined;
  if (!row || String(row.status) !== "being_picked_up") return null;

  const now = new Date().toISOString();
  d.prepare(
    `UPDATE hall_canteen_items
     SET status = 'running_low',
         picked_up_by_user_id = NULL,
         picked_up_at = NULL,
         last_updated_by_user_id = ?,
         updated_at = ?
     WHERE item_id = ? AND hall_id = ?`,
  ).run(userId, now, itemId, hallId);

  const item = rowToItem(
    d.prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ?`).get(itemId) as Record<
      string,
      unknown
    >,
  );
  const payload = buildCanteenPayload(hallId, userId);
  if (!payload) return null;
  return { payload, item };
}

export function reportCanteenItem(
  hallId: string,
  userId: string,
  input: {
    item_id?: string;
    name?: string;
    category?: HallCanteenCategory;
    status: HallCanteenStatus;
  },
): { payload: HallCanteenPayload; item: HallCanteenItem } | null {
  const role = memberRole(hallId, userId);
  if (!role || !canUpdateCanteenStatus(role)) return null;

  seedDefaults(hallId);

  if (input.item_id) {
    return setCanteenItemStatus(hallId, userId, input.item_id, input.status);
  }

  if (!canManageCanteenList(role)) return null;

  const name = input.name?.trim();
  if (!name || isProteinStapleName(name)) return null;

  const existing = findCanteenItemByName(listItems(hallId), name);
  if (existing) {
    return setCanteenItemStatus(hallId, userId, existing.item_id, input.status);
  }

  const d = getDb();
  const now = new Date().toISOString();
  const category = input.category ?? "custom";
  const maxOrder = d
    .prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM hall_canteen_items WHERE hall_id = ?`)
    .get(hallId) as { m: number };

  const itemId = nanoid();
  d.prepare(
    `INSERT INTO hall_canteen_items
     (item_id, hall_id, name, category, status, is_default, sort_order, last_updated_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
  ).run(
    itemId,
    hallId,
    name,
    category,
    input.status,
    Number(maxOrder.m) + 1,
    userId,
    now,
    now,
  );

  const item = rowToItem(
    d.prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ?`).get(itemId) as Record<
      string,
      unknown
    >,
  );
  const payload = buildCanteenPayload(hallId, userId);
  if (!payload) return null;
  return { payload, item };
}

export function manageCanteenItem(
  hallId: string,
  userId: string,
  itemId: string,
  patch: {
    status?: HallCanteenStatus;
    archived?: boolean;
    name?: string;
    category?: HallCanteenCategory;
    sort_order?: number;
  },
): { payload: HallCanteenPayload; item: HallCanteenItem; restocked: boolean } | null {
  const role = memberRole(hallId, userId);

  if (patch.status) {
    if (!role || !canUpdateCanteenStatus(role)) return null;
    const result = setCanteenItemStatus(hallId, userId, itemId, patch.status);
    if (!result) return null;
    return {
      ...result,
      restocked: patch.status === "good",
    };
  }

  if (!role || !canManageCanteenList(role)) return null;

  const d = getDb();
  const now = new Date().toISOString();

  if (patch.archived === true) {
    d.prepare(
      `UPDATE hall_canteen_items SET archived = 1, updated_at = ?, last_updated_by_user_id = ? WHERE item_id = ? AND hall_id = ?`,
    ).run(now, userId, itemId, hallId);
  }

  if (patch.name?.trim()) {
    const items = listItems(hallId);
    const duplicate = findCanteenItemByName(
      items.filter((item) => item.item_id !== itemId),
      patch.name,
    );
    if (duplicate) return null;
    d.prepare(`UPDATE hall_canteen_items SET name = ?, updated_at = ?, last_updated_by_user_id = ? WHERE item_id = ?`).run(
      patch.name.trim(),
      now,
      userId,
      itemId,
    );
  }

  if (patch.category) {
    d.prepare(`UPDATE hall_canteen_items SET category = ?, updated_at = ?, last_updated_by_user_id = ? WHERE item_id = ?`).run(
      patch.category,
      now,
      userId,
      itemId,
    );
  }

  if (patch.sort_order != null) {
    d.prepare(`UPDATE hall_canteen_items SET sort_order = ?, updated_at = ?, last_updated_by_user_id = ? WHERE item_id = ?`).run(
      patch.sort_order,
      now,
      userId,
      itemId,
    );
  }

  const row = d
    .prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ? AND hall_id = ?`)
    .get(itemId, hallId) as Record<string, unknown> | undefined;
  if (!row) return null;
  if (Number(row.archived) === 1) {
    const payload = buildCanteenPayload(hallId, userId);
    if (!payload) return null;
    return { payload, item: rowToItem(row), restocked: false };
  }

  const payload = buildCanteenPayload(hallId, userId);
  if (!payload) return null;
  return { payload, item: rowToItem(row), restocked: false };
}

export function addDefaultCanteenItem(
  hallId: string,
  userId: string,
  input: { name: string; category?: HallCanteenCategory },
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canManageCanteenList(role)) return null;

  const name = input.name.trim();
  if (!name || isProteinStapleName(name)) return null;

  seedDefaults(hallId);
  const existing = findCanteenItemByName(listItems(hallId), name);
  if (existing) return buildCanteenPayload(hallId, userId);

  const result = reportCanteenItem(hallId, userId, {
    name,
    category: input.category ?? "custom",
    status: "good",
  });
  return result?.payload ?? null;
}

export function assignCanteenManager(
  hallId: string,
  actorUserId: string,
  targetUserId: string,
): HallCanteenPayload | null {
  const role = memberRole(hallId, actorUserId);
  if (!role || !canManageCanteenList(role)) return null;

  const targetMember = getHallMember(hallId, targetUserId);
  if (!targetMember) return null;

  const d = getDb();
  d.prepare(
    `UPDATE hall_memberships SET role = 'member'
     WHERE hall_id = ? AND role = 'canteen_manager' AND user_id != ?`,
  ).run(hallId, targetUserId);
  d.prepare(`UPDATE hall_memberships SET role = 'canteen_manager' WHERE hall_id = ? AND user_id = ?`).run(
    hallId,
    targetUserId,
  );
  d.prepare(
    `UPDATE halls SET canteen_manager_user_id = ?, updated_at = datetime('now') WHERE hall_id = ?`,
  ).run(targetUserId, hallId);

  return buildCanteenPayload(hallId, actorUserId);
}

/** @deprecated History not exposed in staples UI */
export function listCanteenHistory(): null {
  return null;
}
