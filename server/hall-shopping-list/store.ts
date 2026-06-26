import { nanoid } from "nanoid";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import {
  getHallMember,
  memberHasPermission,
} from "../hall-membership/store.js";
import type {
  HallRole,
  HallMemberRecord,
} from "../../shared/hall-membership/types.js";
import { normalizeHallRole } from "../../shared/hall-membership/types.js";
import type {
  HallShoppingList,
  HallShoppingListItem,
  HallShoppingListPayload,
  HallShoppingListStatus,
} from "../../shared/hall-shopping-list/types.js";
import {
  canCompleteShoppingList,
  canContributeToShoppingList,
} from "../../shared/hall-shopping-list/types.js";

let db: SqliteDatabase;

export async function initHallShoppingListStore(): Promise<void> {
  db = await getSharedLocalDb();
}

export function bindHallShoppingListDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Hall shopping list store not initialized");
  }
  return db;
}

function rowToList(row: Record<string, unknown>): HallShoppingList {
  return {
    list_id: String(row.list_id),
    hall_id: String(row.hall_id),
    title: String(row.title),
    status: String(row.status) as HallShoppingListStatus,
    runner_user_id: row.runner_user_id ? String(row.runner_user_id) : null,
    runner_name: row.runner_name ? String(row.runner_name) : null,
    created_by_user_id: row.created_by_user_id ? String(row.created_by_user_id) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    completed_at: row.completed_at ? String(row.completed_at) : null,
  };
}

function rowToItem(row: Record<string, unknown>): HallShoppingListItem {
  return {
    item_id: String(row.item_id),
    list_id: String(row.list_id),
    name: String(row.name),
    quantity: String(row.quantity ?? ""),
    section: String(row.section ?? "Other"),
    source_kind: String(row.source_kind) as HallShoppingListItem["source_kind"],
    recipe_slug: row.recipe_slug ? String(row.recipe_slug) : null,
    recipe_title: row.recipe_title ? String(row.recipe_title) : null,
    purchased: Number(row.purchased) === 1,
    added_by_user_id: row.added_by_user_id ? String(row.added_by_user_id) : null,
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function requireMember(hallId: string, userId: string): HallMemberRecord | null {
  return getHallMember(hallId, userId);
}

function memberRole(hallId: string, userId: string): HallRole | null {
  const member = requireMember(hallId, userId);
  return member ? normalizeHallRole(member.role) : null;
}

function listItems(listId: string): HallShoppingListItem[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT * FROM hall_shopping_list_items
       WHERE list_id = ?
       ORDER BY purchased ASC, section ASC, sort_order ASC, name ASC`,
    )
    .all(listId) as Record<string, unknown>[];
  return rows.map(rowToItem);
}

function getActiveList(hallId: string): HallShoppingList | null {
  const d = getDb();
  const row = d
    .prepare(
      `SELECT * FROM hall_shopping_lists
       WHERE hall_id = ? AND status = 'active'
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .get(hallId) as Record<string, unknown> | undefined;
  return row ? rowToList(row) : null;
}

function createList(hallId: string, userId: string, title?: string): HallShoppingList {
  const d = getDb();
  const listId = nanoid();
  const now = new Date().toISOString();
  d.prepare(
    `INSERT INTO hall_shopping_lists
     (list_id, hall_id, title, status, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?, ?)`,
  ).run(listId, hallId, title?.trim() || "Hall grocery run", userId, now, now);
  const row = d.prepare(`SELECT * FROM hall_shopping_lists WHERE list_id = ?`).get(listId) as Record<
    string,
    unknown
  >;
  return rowToList(row);
}

export function getOrCreateActiveShoppingList(
  hallId: string,
  userId: string,
): HallShoppingListPayload | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;

  let list = getActiveList(hallId);
  if (!list) {
    list = createList(hallId, userId);
  }

  return buildPayload(hallId, userId, list);
}

export function buildPayload(
  hallId: string,
  userId: string,
  list: HallShoppingList,
): HallShoppingListPayload | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;

  return {
    list,
    items: listItems(list.list_id),
    my_role: role,
    can_contribute: canContributeToShoppingList(role),
    can_complete: canCompleteShoppingList(role),
  };
}

export function addManualItem(
  hallId: string,
  userId: string,
  input: { name: string; quantity?: string; section?: string },
): HallShoppingListPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canContributeToShoppingList(role)) return null;

  const list = getActiveList(hallId) ?? createList(hallId, userId);
  if (list.status !== "active") return null;

  const d = getDb();
  const itemId = nanoid();
  const now = new Date().toISOString();
  const maxOrder = d
    .prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM hall_shopping_list_items WHERE list_id = ?`)
    .get(list.list_id) as { m: number };

  d.prepare(
    `INSERT INTO hall_shopping_list_items
     (item_id, list_id, name, quantity, section, source_kind, added_by_user_id, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'manual', ?, ?, ?, ?)`,
  ).run(
    itemId,
    list.list_id,
    input.name.trim(),
    (input.quantity ?? "").trim(),
    (input.section ?? "Other").trim(),
    userId,
    Number(maxOrder.m) + 1,
    now,
    now,
  );

  d.prepare(`UPDATE hall_shopping_lists SET updated_at = ? WHERE list_id = ?`).run(now, list.list_id);
  return buildPayload(hallId, userId, rowToList(d.prepare(`SELECT * FROM hall_shopping_lists WHERE list_id = ?`).get(list.list_id) as Record<string, unknown>));
}

function mergeKey(name: string, section: string): string {
  return `${section.toLowerCase()}::${name.toLowerCase().trim()}`;
}

export function addRecipeIngredients(
  hallId: string,
  userId: string,
  input: {
    recipe_title: string;
    recipe_slug?: string;
    sections: Array<{
      title: string;
      items: Array<{ name: string; amount?: string; notes?: string }>;
    }>;
  },
): HallShoppingListPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canContributeToShoppingList(role)) return null;

  const list = getActiveList(hallId) ?? createList(hallId, userId);
  if (list.status !== "active") return null;

  const d = getDb();
  const existing = listItems(list.list_id);
  const byKey = new Map(existing.map((i) => [mergeKey(i.name, i.section), i]));

  const now = new Date().toISOString();
  let maxOrder =
    existing.reduce((m, i) => Math.max(m, i.sort_order), 0) + 1;

  const insert = d.prepare(
    `INSERT INTO hall_shopping_list_items
     (item_id, list_id, name, quantity, section, source_kind, recipe_slug, recipe_title,
      added_by_user_id, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'recipe', ?, ?, ?, ?, ?, ?)`,
  );

  const updateQty = d.prepare(
    `UPDATE hall_shopping_list_items SET quantity = ?, updated_at = ? WHERE item_id = ?`,
  );

  for (const section of input.sections) {
    for (const item of section.items) {
      const name = item.name.trim();
      if (!name) continue;
      const sec = section.title.trim() || "Other";
      const qty = [item.amount?.trim(), item.notes?.trim()].filter(Boolean).join(" · ");
      const key = mergeKey(name, sec);
      const found = byKey.get(key);
      if (found) {
        const merged = [found.quantity, qty].filter(Boolean).join("; ");
        updateQty.run(merged, now, found.item_id);
        continue;
      }
      const itemId = nanoid();
      insert.run(
        itemId,
        list.list_id,
        name,
        qty,
        sec,
        input.recipe_slug ?? null,
        input.recipe_title,
        userId,
        maxOrder++,
        now,
        now,
      );
      byKey.set(key, {
        item_id: itemId,
        list_id: list.list_id,
        name,
        quantity: qty,
        section: sec,
        source_kind: "recipe",
        recipe_slug: input.recipe_slug ?? null,
        recipe_title: input.recipe_title,
        purchased: false,
        added_by_user_id: userId,
        sort_order: maxOrder,
        created_at: now,
        updated_at: now,
      });
    }
  }

  d.prepare(`UPDATE hall_shopping_lists SET updated_at = ? WHERE list_id = ?`).run(now, list.list_id);
  const refreshed = d.prepare(`SELECT * FROM hall_shopping_lists WHERE list_id = ?`).get(list.list_id) as Record<
    string,
    unknown
  >;
  return buildPayload(hallId, userId, rowToList(refreshed));
}

export function updateShoppingListItem(
  hallId: string,
  userId: string,
  itemId: string,
  patch: { name?: string; quantity?: string; purchased?: boolean },
): HallShoppingListPayload | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;

  const list = getActiveList(hallId);
  if (!list) return null;

  const d = getDb();
  const item = d
    .prepare(`SELECT * FROM hall_shopping_list_items WHERE item_id = ? AND list_id = ?`)
    .get(itemId, list.list_id) as Record<string, unknown> | undefined;
  if (!item) return null;

  if (patch.purchased !== undefined && !canCompleteShoppingList(role)) {
    return null;
  }

  if ((patch.name !== undefined || patch.quantity !== undefined) && !canContributeToShoppingList(role)) {
    return null;
  }

  const now = new Date().toISOString();
  const fields: string[] = ["updated_at = ?"];
  const params: Array<string | number> = [now];

  if (patch.name !== undefined) {
    fields.push("name = ?");
    params.push(patch.name.trim());
  }
  if (patch.quantity !== undefined) {
    fields.push("quantity = ?");
    params.push(patch.quantity.trim());
  }
  if (patch.purchased !== undefined) {
    fields.push("purchased = ?");
    params.push(patch.purchased ? 1 : 0);
  }

  params.push(itemId);
  d.prepare(`UPDATE hall_shopping_list_items SET ${fields.join(", ")} WHERE item_id = ?`).run(...params);
  d.prepare(`UPDATE hall_shopping_lists SET updated_at = ? WHERE list_id = ?`).run(now, list.list_id);

  const refreshed = d.prepare(`SELECT * FROM hall_shopping_lists WHERE list_id = ?`).get(list.list_id) as Record<
    string,
    unknown
  >;
  return buildPayload(hallId, userId, rowToList(refreshed));
}

export function deleteShoppingListItem(
  hallId: string,
  userId: string,
  itemId: string,
): HallShoppingListPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canContributeToShoppingList(role)) return null;

  const list = getActiveList(hallId);
  if (!list) return null;

  const d = getDb();
  const item = d
    .prepare(`SELECT added_by_user_id FROM hall_shopping_list_items WHERE item_id = ? AND list_id = ?`)
    .get(itemId, list.list_id) as { added_by_user_id: string | null } | undefined;
  if (!item) return null;

  const canDelete =
    canCompleteShoppingList(role) || item.added_by_user_id === userId;
  if (!canDelete) return null;

  d.prepare(`DELETE FROM hall_shopping_list_items WHERE item_id = ?`).run(itemId);
  const now = new Date().toISOString();
  d.prepare(`UPDATE hall_shopping_lists SET updated_at = ? WHERE list_id = ?`).run(now, list.list_id);

  const refreshed = d.prepare(`SELECT * FROM hall_shopping_lists WHERE list_id = ?`).get(list.list_id) as Record<
    string,
    unknown
  >;
  return buildPayload(hallId, userId, rowToList(refreshed));
}

export function updateShoppingListMeta(
  hallId: string,
  userId: string,
  patch: { title?: string; runner_user_id?: string | null; runner_name?: string | null },
): HallShoppingListPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canCompleteShoppingList(role)) return null;

  const list = getActiveList(hallId);
  if (!list) return null;

  const d = getDb();
  const now = new Date().toISOString();
  const fields: string[] = ["updated_at = ?"];
  const params: Array<string | number | null> = [now];

  if (patch.title !== undefined) {
    fields.push("title = ?");
    params.push(patch.title.trim());
  }
  if (patch.runner_user_id !== undefined) {
    fields.push("runner_user_id = ?");
    params.push(patch.runner_user_id);
  }
  if (patch.runner_name !== undefined) {
    fields.push("runner_name = ?");
    params.push(patch.runner_name);
  }

  params.push(list.list_id);
  d.prepare(`UPDATE hall_shopping_lists SET ${fields.join(", ")} WHERE list_id = ?`).run(...params);

  const refreshed = d.prepare(`SELECT * FROM hall_shopping_lists WHERE list_id = ?`).get(list.list_id) as Record<
    string,
    unknown
  >;
  return buildPayload(hallId, userId, rowToList(refreshed));
}

export function completeShoppingList(
  hallId: string,
  userId: string,
): HallShoppingListPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canCompleteShoppingList(role)) return null;

  const list = getActiveList(hallId);
  if (!list) return null;

  const d = getDb();
  const now = new Date().toISOString();
  d.prepare(
    `UPDATE hall_shopping_lists SET status = 'completed', completed_at = ?, updated_at = ? WHERE list_id = ?`,
  ).run(now, now, list.list_id);

  const refreshed = d.prepare(`SELECT * FROM hall_shopping_lists WHERE list_id = ?`).get(list.list_id) as Record<
    string,
    unknown
  >;
  return buildPayload(hallId, userId, rowToList(refreshed));
}

export function startNewShoppingList(
  hallId: string,
  userId: string,
  title?: string,
): HallShoppingListPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canCompleteShoppingList(role)) return null;

  const d = getDb();
  const now = new Date().toISOString();
  d.prepare(
    `UPDATE hall_shopping_lists SET status = 'completed', completed_at = ?, updated_at = ?
     WHERE hall_id = ? AND status = 'active'`,
  ).run(now, now, hallId);

  const list = createList(hallId, userId, title);
  return buildPayload(hallId, userId, list);
}

/** For tests — verify hall membership gate. */
export function userIsHallMember(hallId: string, userId: string): boolean {
  return memberHasPermission(hallId, userId, "view_hall_dashboard");
}
