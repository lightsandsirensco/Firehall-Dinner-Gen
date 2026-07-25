import { nanoid } from "nanoid";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { getHallMember } from "../hall-membership/store.js";
import { userHasFeature } from "../billing/store.js";
import type { HallRole } from "../../shared/hall-membership/types.js";
import { normalizeHallRole } from "../../shared/hall-membership/types.js";
import type {
  CanteenOrderItemStatus,
  CanteenOrderStatus,
  CanteenReceiveStatus,
  CanteenRecurrence,
  HallCanteenActivityEntry,
  HallCanteenCategory,
  HallCanteenCounts,
  HallCanteenItem,
  HallCanteenManagerNote,
  HallCanteenMemberStatus,
  HallCanteenOrderItem,
  HallCanteenPayload,
  HallCanteenStatus,
  HallCanteenSuggestion,
  HallCanteenWeeklyOrder,
} from "../../shared/hall-canteen/types.js";
import {
  buildCostcoHandoffCsv,
  buildCostcoHandoffText,
  canManageCanteenList,
  canUpdateCanteenStatus,
  canViewCanteen,
  COSTCO_SAME_DAY_URL,
  DEFAULT_HALL_CANTEEN_ITEMS,
  findCanteenItemByName,
  FREE_HALL_ACTIVE_STAPLE_LIMIT,
  isCanteenAttentionStatus,
  isPickupExpired,
  isProteinStapleName,
  isShoppingThisWeekStatus,
  moreSevereStatus,
  normalizeCanteenCategory,
  TEST_HALL_CANTEEN_STAPLES,
} from "../../shared/hall-canteen/types.js";
import { emitHallEvent, writeInventoryLedger } from "../hall-events/store.js";
import { HallEventTypes } from "../../shared/hall-events/types.js";

let db: SqliteDatabase;
let v2TablesReady: boolean | null = null;
let enrichedItemColumns: boolean | null = null;

export async function initHallCanteenStore(): Promise<void> {
  db = await getSharedLocalDb();
  v2TablesReady = null;
  enrichedItemColumns = null;
}

export function bindHallCanteenDb(database: SqliteDatabase): void {
  db = database;
  v2TablesReady = null;
  enrichedItemColumns = null;
}

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Hall canteen store not initialized");
  }
  return db;
}

function tableExists(name: string): boolean {
  const row = getDb()
    .prepare(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(name) as { ok: number } | undefined;
  return Boolean(row);
}

function hasV2Tables(): boolean {
  if (v2TablesReady == null) {
    v2TablesReady =
      tableExists("hall_canteen_shortage_reports") &&
      tableExists("hall_canteen_weekly_orders") &&
      tableExists("hall_canteen_order_items") &&
      tableExists("hall_canteen_suggestions") &&
      tableExists("hall_canteen_manager_notes") &&
      tableExists("hall_canteen_activity");
  }
  return v2TablesReady;
}

function hasEnrichedItemColumns(): boolean {
  if (enrichedItemColumns == null) {
    const cols = getDb()
      .prepare(`PRAGMA table_info(hall_canteen_items)`)
      .all() as Array<{ name: string }>;
    const names = new Set(cols.map((c) => c.name));
    enrichedItemColumns = names.has("preferred_brand") && names.has("reorder_qty");
  }
  return enrichedItemColumns;
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

function hallName(hallId: string): string {
  const row = getDb()
    .prepare(`SELECT name FROM halls WHERE hall_id = ?`)
    .get(hallId) as { name: string } | undefined;
  return row?.name ?? "";
}

function isTestHall(hallId: string): boolean {
  return /test/i.test(hallName(hallId));
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

function isHallPro(hallId: string, userId: string): boolean {
  return userHasFeature(userId, "canteen_manager_pro", { hall_id: hallId });
}

function activeStapleCount(hallId: string): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM hall_canteen_items WHERE hall_id = ? AND archived = 0`,
    )
    .get(hallId) as { c: number };
  return Number(row.c) || 0;
}

function enforceStapleLimit(hallId: string, userId: string): boolean {
  if (isHallPro(hallId, userId)) return true;
  return activeStapleCount(hallId) < FREE_HALL_ACTIVE_STAPLE_LIMIT;
}

function reportAggregates(
  hallId: string,
): Map<string, { report_count: number; latest_report_note: string | null }> {
  const map = new Map<string, { report_count: number; latest_report_note: string | null }>();
  if (!hasV2Tables()) return map;
  try {
    const rows = getDb()
      .prepare(
        `SELECT item_id,
                COUNT(*) AS report_count,
                (
                  SELECT note FROM hall_canteen_shortage_reports r2
                  WHERE r2.hall_id = r.hall_id AND r2.item_id = r.item_id AND r2.resolved = 0
                  ORDER BY r2.created_at DESC LIMIT 1
                ) AS latest_report_note
         FROM hall_canteen_shortage_reports r
         WHERE hall_id = ? AND resolved = 0
         GROUP BY item_id`,
      )
      .all(hallId) as Array<{
      item_id: string;
      report_count: number;
      latest_report_note: string | null;
    }>;
    for (const row of rows) {
      map.set(row.item_id, {
        report_count: Number(row.report_count) || 0,
        latest_report_note: row.latest_report_note ? String(row.latest_report_note) : null,
      });
    }
  } catch {
    /* old DB without reports table */
  }
  return map;
}

function rowToItem(
  row: Record<string, unknown>,
  aggregates?: Map<string, { report_count: number; latest_report_note: string | null }>,
): HallCanteenItem {
  const pickedUpByUserId = row.picked_up_by_user_id ? String(row.picked_up_by_user_id) : null;
  const lastUpdatedBy = row.last_updated_by_user_id ? String(row.last_updated_by_user_id) : null;
  const itemId = String(row.item_id);
  const agg = aggregates?.get(itemId);
  const enriched = hasEnrichedItemColumns();

  return {
    item_id: itemId,
    hall_id: String(row.hall_id),
    name: String(row.name),
    category: normalizeCanteenCategory(String(row.category)),
    status: String(row.status) as HallCanteenStatus,
    is_default: Number(row.is_default) === 1,
    sort_order: Number(row.sort_order) || 0,
    archived: Number(row.archived) === 1,
    note: row.note != null ? String(row.note) : null,
    preferred_brand: enriched && row.preferred_brand != null ? String(row.preferred_brand) : null,
    package_size: enriched && row.package_size != null ? String(row.package_size) : null,
    par_level:
      enriched && row.par_level != null && row.par_level !== ""
        ? Number(row.par_level)
        : null,
    estimated_qty:
      enriched && row.estimated_qty != null && row.estimated_qty !== ""
        ? Number(row.estimated_qty)
        : null,
    reorder_qty: enriched && row.reorder_qty != null ? Number(row.reorder_qty) || 1 : 1,
    storage_location:
      enriched && row.storage_location != null ? String(row.storage_location) : null,
    preferred_retailer:
      enriched && row.preferred_retailer != null
        ? String(row.preferred_retailer)
        : enriched
          ? "costco"
          : null,
    costco_search_term:
      enriched && row.costco_search_term != null ? String(row.costco_search_term) : null,
    product_url: enriched && row.product_url != null ? String(row.product_url) : null,
    last_restocked_at:
      enriched && row.last_restocked_at != null ? String(row.last_restocked_at) : null,
    recurrence: (enriched && row.recurrence
      ? String(row.recurrence)
      : "none") as CanteenRecurrence,
    next_review_at:
      enriched && row.next_review_at != null ? String(row.next_review_at) : null,
    is_test: enriched ? Number(row.is_test) === 1 : false,
    last_updated_by_user_id: lastUpdatedBy,
    last_updated_by_display_name: lastUpdatedBy ? memberDisplayName(lastUpdatedBy) : null,
    picked_up_by_user_id: pickedUpByUserId,
    picked_up_by_display_name: pickedUpByUserId ? memberDisplayName(pickedUpByUserId) : null,
    picked_up_at: row.picked_up_at ? String(row.picked_up_at) : null,
    report_count: agg?.report_count ?? 0,
    latest_report_note: agg?.latest_report_note ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function listItems(hallId: string): HallCanteenItem[] {
  const d = getDb();
  const aggregates = reportAggregates(hallId);
  const select = hasEnrichedItemColumns()
    ? `SELECT item_id, hall_id, name, category, status, is_default, sort_order, archived, note,
              preferred_brand, package_size, par_level, estimated_qty, reorder_qty,
              storage_location, preferred_retailer, costco_search_term, product_url,
              last_restocked_at, recurrence, next_review_at, is_test,
              last_updated_by_user_id, picked_up_by_user_id, picked_up_at, created_at, updated_at
       FROM hall_canteen_items
       WHERE hall_id = ? AND archived = 0
       ORDER BY category ASC, sort_order ASC, name ASC`
    : `SELECT item_id, hall_id, name, category, status, is_default, sort_order, archived, note,
              last_updated_by_user_id, picked_up_by_user_id, picked_up_at, created_at, updated_at
       FROM hall_canteen_items
       WHERE hall_id = ? AND archived = 0
       ORDER BY category ASC, sort_order ASC, name ASC`;
  const rows = d.prepare(select).all(hallId) as Record<string, unknown>[];
  return rows.map((row) => rowToItem(row, aggregates));
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

function logActivity(
  hallId: string,
  actorUserId: string | null,
  action: string,
  summary: string,
  entityType?: string,
  entityId?: string,
  meta?: Record<string, unknown>,
): void {
  if (!hasV2Tables()) return;
  try {
    getDb()
      .prepare(
        `INSERT INTO hall_canteen_activity
         (activity_id, hall_id, actor_user_id, action, entity_type, entity_id, summary, meta_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        nanoid(),
        hallId,
        actorUserId,
        action,
        entityType ?? null,
        entityId ?? null,
        summary,
        meta ? JSON.stringify(meta) : null,
        new Date().toISOString(),
      );
  } catch {
    /* ignore on old DBs */
  }
}

function insertShortageReport(
  hallId: string,
  itemId: string,
  userId: string,
  status: HallCanteenMemberStatus,
  note?: string | null,
): void {
  if (!hasV2Tables()) return;
  if (status !== "good" && status !== "running_low" && status !== "out") return;
  try {
    getDb()
      .prepare(
        `INSERT INTO hall_canteen_shortage_reports
         (report_id, hall_id, item_id, reporter_user_id, status, note, resolved, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      )
      .run(
        nanoid(),
        hallId,
        itemId,
        userId,
        status,
        note?.trim() || null,
        new Date().toISOString(),
      );
  } catch {
    /* ignore */
  }
}

function resolveShortageReports(hallId: string, itemId: string, userId: string): void {
  if (!hasV2Tables()) return;
  try {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `UPDATE hall_canteen_shortage_reports
         SET resolved = 1, resolved_at = ?, resolved_by_user_id = ?
         WHERE hall_id = ? AND item_id = ? AND resolved = 0`,
      )
      .run(now, userId, hallId, itemId);
  } catch {
    /* ignore */
  }
}

function ensureItemOnDraftOrder(hallId: string, itemId: string, userId: string): void {
  if (!hasV2Tables()) return;
  try {
    const order = getOrCreateDraftOrderInternal(hallId, userId);
    addItemToWeeklyOrderInternal(hallId, userId, order.order_id, itemId, undefined, undefined, true);
  } catch {
    /* ignore duplicate / missing */
  }
}

function rowToOrderItem(row: Record<string, unknown>): HallCanteenOrderItem {
  const buyerId = row.assigned_buyer_user_id ? String(row.assigned_buyer_user_id) : null;
  return {
    order_item_id: String(row.order_item_id),
    order_id: String(row.order_id),
    hall_id: String(row.hall_id),
    staple_item_id: row.staple_item_id ? String(row.staple_item_id) : null,
    name: String(row.name),
    category: row.category ? normalizeCanteenCategory(String(row.category)) : null,
    requested_qty: Number(row.requested_qty) || 1,
    package_size: row.package_size != null ? String(row.package_size) : null,
    preferred_brand: row.preferred_brand != null ? String(row.preferred_brand) : null,
    retailer: row.retailer != null ? String(row.retailer) : null,
    costco_search_term: row.costco_search_term != null ? String(row.costco_search_term) : null,
    product_url: row.product_url != null ? String(row.product_url) : null,
    notes: row.notes != null ? String(row.notes) : null,
    estimated_price_cents:
      row.estimated_price_cents != null ? Number(row.estimated_price_cents) : null,
    assigned_buyer_user_id: buyerId,
    assigned_buyer_display_name: buyerId ? memberDisplayName(buyerId) : null,
    assigned_at: row.assigned_at ? String(row.assigned_at) : null,
    status: String(row.status) as CanteenOrderItemStatus,
    substitute_name: row.substitute_name != null ? String(row.substitute_name) : null,
    receive_status: row.receive_status
      ? (String(row.receive_status) as CanteenReceiveStatus)
      : null,
    received_qty: row.received_qty != null ? Number(row.received_qty) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function listOrderItems(orderId: string): HallCanteenOrderItem[] {
  if (!hasV2Tables()) return [];
  const rows = getDb()
    .prepare(
      `SELECT * FROM hall_canteen_order_items WHERE order_id = ? ORDER BY created_at ASC`,
    )
    .all(orderId) as Record<string, unknown>[];
  return rows.map(rowToOrderItem);
}

function rowToWeeklyOrder(row: Record<string, unknown>): HallCanteenWeeklyOrder {
  const purchaserId = row.purchaser_user_id ? String(row.purchaser_user_id) : null;
  return {
    order_id: String(row.order_id),
    hall_id: String(row.hall_id),
    title: String(row.title ?? "This Week's Order"),
    status: String(row.status) as CanteenOrderStatus,
    retailer: String(row.retailer ?? "costco"),
    external_order_number: row.external_order_number
      ? String(row.external_order_number)
      : null,
    ordered_at: row.ordered_at ? String(row.ordered_at) : null,
    scheduled_delivery_date: row.scheduled_delivery_date
      ? String(row.scheduled_delivery_date)
      : null,
    scheduled_delivery_window: row.scheduled_delivery_window
      ? String(row.scheduled_delivery_window)
      : null,
    subtotal_cents: row.subtotal_cents != null ? Number(row.subtotal_cents) : null,
    delivery_fee_cents: row.delivery_fee_cents != null ? Number(row.delivery_fee_cents) : null,
    tax_cents: row.tax_cents != null ? Number(row.tax_cents) : null,
    tip_cents: row.tip_cents != null ? Number(row.tip_cents) : null,
    total_cents: row.total_cents != null ? Number(row.total_cents) : null,
    purchaser_user_id: purchaserId,
    purchaser_display_name: purchaserId ? memberDisplayName(purchaserId) : null,
    receipt_path: row.receipt_path ? String(row.receipt_path) : null,
    notes: row.notes != null ? String(row.notes) : null,
    is_test: Number(row.is_test) === 1,
    completed_at: row.completed_at ? String(row.completed_at) : null,
    items: listOrderItems(String(row.order_id)),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function getOrCreateDraftOrderInternal(
  hallId: string,
  userId: string | null,
): HallCanteenWeeklyOrder {
  const d = getDb();
  const existing = d
    .prepare(
      `SELECT * FROM hall_canteen_weekly_orders
       WHERE hall_id = ? AND completed_at IS NULL AND status != 'cancelled'
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(hallId) as Record<string, unknown> | undefined;
  if (existing) return rowToWeeklyOrder(existing);

  const now = new Date().toISOString();
  const orderId = nanoid();
  d.prepare(
    `INSERT INTO hall_canteen_weekly_orders
     (order_id, hall_id, title, status, retailer, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, 'This Week''s Order', 'draft', 'costco', ?, ?, ?)`,
  ).run(orderId, hallId, userId, now, now);

  return rowToWeeklyOrder(
    d.prepare(`SELECT * FROM hall_canteen_weekly_orders WHERE order_id = ?`).get(orderId) as Record<
      string,
      unknown
    >,
  );
}

function addItemToWeeklyOrderInternal(
  hallId: string,
  userId: string,
  orderId: string,
  itemId: string,
  requestedQty?: number,
  notes?: string,
  silent = false,
): HallCanteenOrderItem | null {
  const d = getDb();
  const staple = d
    .prepare(
      `SELECT * FROM hall_canteen_items WHERE item_id = ? AND hall_id = ? AND archived = 0`,
    )
    .get(itemId, hallId) as Record<string, unknown> | undefined;
  if (!staple) return null;

  const existing = d
    .prepare(
      `SELECT * FROM hall_canteen_order_items WHERE order_id = ? AND staple_item_id = ?`,
    )
    .get(orderId, itemId) as Record<string, unknown> | undefined;
  if (existing) return rowToOrderItem(existing);

  const now = new Date().toISOString();
  const orderItemId = nanoid();
  const qty =
    requestedQty ??
    (staple.reorder_qty != null ? Number(staple.reorder_qty) || 1 : 1);

  d.prepare(
    `INSERT INTO hall_canteen_order_items
     (order_item_id, order_id, hall_id, staple_item_id, name, category, requested_qty,
      package_size, preferred_brand, retailer, costco_search_term, product_url, notes,
      status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'needed', ?, ?)`,
  ).run(
    orderItemId,
    orderId,
    hallId,
    itemId,
    String(staple.name),
    String(staple.category),
    qty,
    staple.package_size != null ? String(staple.package_size) : null,
    staple.preferred_brand != null ? String(staple.preferred_brand) : null,
    staple.preferred_retailer != null ? String(staple.preferred_retailer) : "costco",
    staple.costco_search_term != null ? String(staple.costco_search_term) : null,
    staple.product_url != null ? String(staple.product_url) : null,
    notes?.trim() || null,
    now,
    now,
  );

  if (!silent) {
    logActivity(
      hallId,
      userId,
      "order_item_added",
      `Added ${String(staple.name)} to this week's order`,
      "order_item",
      orderItemId,
    );
  }

  return rowToOrderItem(
    d
      .prepare(`SELECT * FROM hall_canteen_order_items WHERE order_item_id = ?`)
      .get(orderItemId) as Record<string, unknown>,
  );
}

function listSuggestions(hallId: string): HallCanteenSuggestion[] {
  if (!hasV2Tables()) return [];
  try {
    const rows = getDb()
      .prepare(
        `SELECT * FROM hall_canteen_suggestions
         WHERE hall_id = ? AND status = 'pending'
         ORDER BY created_at DESC`,
      )
      .all(hallId) as Record<string, unknown>[];
    return rows.map((row) => ({
      suggestion_id: String(row.suggestion_id),
      hall_id: String(row.hall_id),
      name: String(row.name),
      category: row.category ? normalizeCanteenCategory(String(row.category)) : null,
      note: row.note != null ? String(row.note) : null,
      suggested_by_user_id: String(row.suggested_by_user_id),
      suggested_by_display_name: memberDisplayName(String(row.suggested_by_user_id)),
      status: String(row.status) as "pending" | "approved" | "rejected",
      created_at: String(row.created_at),
    }));
  } catch {
    return [];
  }
}

function listManagerNotes(hallId: string): HallCanteenManagerNote[] {
  if (!hasV2Tables()) return [];
  try {
    const rows = getDb()
      .prepare(
        `SELECT note_id, hall_id, body, sort_order, created_at, updated_at
         FROM hall_canteen_manager_notes
         WHERE hall_id = ? AND archived = 0
         ORDER BY sort_order ASC, created_at ASC`,
      )
      .all(hallId) as Record<string, unknown>[];
    return rows.map((row) => ({
      note_id: String(row.note_id),
      hall_id: String(row.hall_id),
      body: String(row.body),
      sort_order: Number(row.sort_order) || 0,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    }));
  } catch {
    return [];
  }
}

function listActivity(hallId: string, limit = 30): HallCanteenActivityEntry[] {
  if (!hasV2Tables()) return [];
  try {
    const rows = getDb()
      .prepare(
        `SELECT * FROM hall_canteen_activity
         WHERE hall_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(hallId, limit) as Record<string, unknown>[];
    return rows.map((row) => {
      const actorId = row.actor_user_id ? String(row.actor_user_id) : null;
      return {
        activity_id: String(row.activity_id),
        hall_id: String(row.hall_id),
        actor_user_id: actorId,
        actor_display_name: actorId ? memberDisplayName(actorId) : null,
        action: String(row.action),
        summary: String(row.summary),
        created_at: String(row.created_at),
      };
    });
  } catch {
    return [];
  }
}

function loadCurrentOrder(hallId: string, userId: string): HallCanteenWeeklyOrder | null {
  if (!hasV2Tables()) return null;
  try {
    return getOrCreateDraftOrderInternal(hallId, userId);
  } catch {
    return null;
  }
}

function loadRecentDeliveries(hallId: string, isPro: boolean): HallCanteenWeeklyOrder[] {
  if (!hasV2Tables() || !isPro) return [];
  try {
    const rows = getDb()
      .prepare(
        `SELECT * FROM hall_canteen_weekly_orders
         WHERE hall_id = ? AND status = 'delivered' AND completed_at IS NOT NULL
         ORDER BY completed_at DESC
         LIMIT 10`,
      )
      .all(hallId) as Record<string, unknown>[];
    return rows.map(rowToWeeklyOrder);
  } catch {
    return [];
  }
}

function buildCounts(
  items: HallCanteenItem[],
  currentOrder: HallCanteenWeeklyOrder | null,
): HallCanteenCounts {
  return {
    out: items.filter((i) => i.status === "out").length,
    running_low: items.filter((i) => i.status === "running_low").length,
    requested: items.filter((i) => i.status === "requested").length,
    in_weeks_order: currentOrder?.items.length ?? 0,
  };
}

export function buildCanteenPayload(hallId: string, userId: string): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canViewCanteen(role)) return null;

  expireStalePickups(hallId);

  const items = listItems(hallId);
  const needs_attention = items.filter((item) => isCanteenAttentionStatus(item.status));
  const shopping_this_week = items.filter((item) => isShoppingThisWeekStatus(item.status));
  const hallPro = isHallPro(hallId, userId);
  const current_order = loadCurrentOrder(hallId, userId);
  const stapleCount = items.length;

  return {
    items,
    needs_attention,
    shopping_this_week,
    running_low: items.filter((item) => item.status === "running_low"),
    out: items.filter((item) => item.status === "out"),
    needs_attention_count: needs_attention.length,
    counts: buildCounts(items, current_order),
    suggestions: listSuggestions(hallId),
    current_order,
    recent_deliveries: loadRecentDeliveries(hallId, hallPro),
    manager_notes: listManagerNotes(hallId),
    activity: listActivity(hallId),
    my_role: role,
    can_update: canUpdateCanteenStatus(role),
    can_manage_list: canManageCanteenList(role),
    canteen_manager_user_id: canteenManagerUserId(hallId),
    active_staple_count: stapleCount,
    staple_limit: hallPro ? null : FREE_HALL_ACTIVE_STAPLE_LIMIT,
    is_hall_pro: hallPro,
    can_use_order_history: hallPro,
    can_use_recurring: hallPro,
    can_use_product_urls: hallPro,
    can_export_csv: hallPro,
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
  note?: string | null,
): { payload: HallCanteenPayload; item: HallCanteenItem } | null {
  const role = memberRole(hallId, userId);
  if (!role || !canUpdateCanteenStatus(role)) return null;

  const d = getDb();
  const row = d
    .prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ? AND hall_id = ? AND archived = 0`)
    .get(itemId, hallId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const currentStatus = String(row.status) as HallCanteenStatus;
  let nextStatus = status;
  if (status === "good" || status === "running_low" || status === "out") {
    insertShortageReport(hallId, itemId, userId, status, note);
    if (status === "good") {
      nextStatus = "good";
      resolveShortageReports(hallId, itemId, userId);
    } else {
      nextStatus = moreSevereStatus(currentStatus, status);
    }
  }

  const now = new Date().toISOString();
  const clearPickup = nextStatus === "good" || isCanteenAttentionStatus(nextStatus);
  const restockedAt = nextStatus === "good" ? now : null;

  if (hasEnrichedItemColumns() && nextStatus === "good") {
    d.prepare(
      `UPDATE hall_canteen_items
       SET status = ?,
           last_updated_by_user_id = ?,
           updated_at = ?,
           last_restocked_at = COALESCE(?, last_restocked_at),
           note = COALESCE(?, note),
           picked_up_by_user_id = CASE WHEN ? THEN NULL ELSE picked_up_by_user_id END,
           picked_up_at = CASE WHEN ? THEN NULL ELSE picked_up_at END
       WHERE item_id = ?`,
    ).run(
      nextStatus,
      userId,
      now,
      restockedAt,
      note?.trim() || null,
      clearPickup ? 1 : 0,
      clearPickup ? 1 : 0,
      itemId,
    );
  } else {
    d.prepare(
      `UPDATE hall_canteen_items
       SET status = ?,
           last_updated_by_user_id = ?,
           updated_at = ?,
           picked_up_by_user_id = CASE WHEN ? THEN NULL ELSE picked_up_by_user_id END,
           picked_up_at = CASE WHEN ? THEN NULL ELSE picked_up_at END
       WHERE item_id = ?`,
    ).run(nextStatus, userId, now, clearPickup ? 1 : 0, clearPickup ? 1 : 0, itemId);
  }

  if (isCanteenAttentionStatus(nextStatus)) {
    ensureItemOnDraftOrder(hallId, itemId, userId);
  }

  logActivity(
    hallId,
    userId,
    "status_update",
    `Marked ${String(row.name)} as ${nextStatus}`,
    "item",
    itemId,
    { status: nextStatus },
  );

  const itemName = String(row.name);
  const dayKey = new Date().toISOString().slice(0, 10);
  if (nextStatus === "out") {
    const hallEvent = emitHallEvent({
      hall_id: hallId,
      event_type: HallEventTypes.INVENTORY_EMPTIED,
      actor_user_id: userId,
      aggregate_type: "inventory_item",
      aggregate_id: itemId,
      payload: { name: itemName, status: nextStatus },
      idempotency_key: `out:${itemId}:${dayKey}:${userId}`,
    });
    writeInventoryLedger({
      hall_id: hallId,
      item_id: itemId,
      action: "mark_out",
      status_after: nextStatus,
      actor_user_id: userId,
      note: note?.trim() || null,
      hall_event_id: hallEvent?.event_id ?? null,
    });
  } else if (nextStatus === "running_low") {
    const hallEvent = emitHallEvent({
      hall_id: hallId,
      event_type: HallEventTypes.INVENTORY_MARKED_LOW,
      actor_user_id: userId,
      aggregate_type: "inventory_item",
      aggregate_id: itemId,
      payload: { name: itemName, status: nextStatus },
      idempotency_key: `low:${itemId}:${dayKey}:${userId}`,
    });
    writeInventoryLedger({
      hall_id: hallId,
      item_id: itemId,
      action: "mark_low",
      status_after: nextStatus,
      actor_user_id: userId,
      note: note?.trim() || null,
      hall_event_id: hallEvent?.event_id ?? null,
    });
  } else if (
    nextStatus === "good" &&
    (currentStatus === "running_low" || currentStatus === "out")
  ) {
    const hallEvent = emitHallEvent({
      hall_id: hallId,
      event_type: HallEventTypes.INVENTORY_RESTOCKED,
      actor_user_id: userId,
      aggregate_type: "inventory_item",
      aggregate_id: itemId,
      payload: { name: itemName, status: nextStatus },
    });
    writeInventoryLedger({
      hall_id: hallId,
      item_id: itemId,
      action: "status_clear",
      status_after: nextStatus,
      actor_user_id: userId,
      hall_event_id: hallEvent?.event_id ?? null,
    });
  }

  const aggregates = reportAggregates(hallId);
  const item = rowToItem(
    d.prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ?`).get(itemId) as Record<
      string,
      unknown
    >,
    aggregates,
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

  ensureItemOnDraftOrder(hallId, itemId, userId);
  logActivity(
    hallId,
    userId,
    "pickup_claim",
    `${memberDisplayName(userId)} is buying ${String(row.name)}`,
    "item",
    itemId,
  );

  const item = rowToItem(
    d.prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ?`).get(itemId) as Record<
      string,
      unknown
    >,
    reportAggregates(hallId),
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

  logActivity(
    hallId,
    userId,
    "pickup_release",
    `Released pickup for ${String(row.name)}`,
    "item",
    itemId,
  );

  const item = rowToItem(
    d.prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ?`).get(itemId) as Record<
      string,
      unknown
    >,
    reportAggregates(hallId),
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
    note?: string;
  },
): { payload: HallCanteenPayload; item: HallCanteenItem } | null {
  const role = memberRole(hallId, userId);
  if (!role || !canUpdateCanteenStatus(role)) return null;

  seedDefaults(hallId);

  if (input.item_id) {
    return setCanteenItemStatus(hallId, userId, input.item_id, input.status, input.note);
  }

  if (!canManageCanteenList(role)) return null;

  const name = input.name?.trim();
  if (!name || isProteinStapleName(name)) return null;

  const existing = findCanteenItemByName(listItems(hallId), name);
  if (existing) {
    return setCanteenItemStatus(hallId, userId, existing.item_id, input.status, input.note);
  }

  if (!enforceStapleLimit(hallId, userId)) return null;

  const d = getDb();
  const now = new Date().toISOString();
  const category = normalizeCanteenCategory(input.category ?? "other");
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

  if (input.status === "good" || input.status === "running_low" || input.status === "out") {
    insertShortageReport(hallId, itemId, userId, input.status, input.note);
  }
  if (isCanteenAttentionStatus(input.status)) {
    ensureItemOnDraftOrder(hallId, itemId, userId);
  }

  logActivity(hallId, userId, "item_added", `Added staple ${name}`, "item", itemId);

  const item = rowToItem(
    d.prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ?`).get(itemId) as Record<
      string,
      unknown
    >,
    reportAggregates(hallId),
  );
  const payload = buildCanteenPayload(hallId, userId);
  if (!payload) return null;
  return { payload, item };
}

export type ManageCanteenItemPatch = {
  status?: HallCanteenStatus;
  archived?: boolean;
  name?: string;
  category?: HallCanteenCategory;
  sort_order?: number;
  note?: string | null;
  preferred_brand?: string | null;
  package_size?: string | null;
  par_level?: number | null;
  estimated_qty?: number | null;
  reorder_qty?: number;
  storage_location?: string | null;
  preferred_retailer?: string | null;
  costco_search_term?: string | null;
  product_url?: string | null;
  recurrence?: CanteenRecurrence;
};

function patchHasMasterListFields(patch: ManageCanteenItemPatch): boolean {
  return (
    patch.archived !== undefined ||
    patch.name !== undefined ||
    patch.category !== undefined ||
    patch.sort_order !== undefined ||
    patch.preferred_brand !== undefined ||
    patch.package_size !== undefined ||
    patch.par_level !== undefined ||
    patch.estimated_qty !== undefined ||
    patch.reorder_qty !== undefined ||
    patch.storage_location !== undefined ||
    patch.preferred_retailer !== undefined ||
    patch.costco_search_term !== undefined ||
    patch.product_url !== undefined ||
    patch.recurrence !== undefined
  );
}

export function manageCanteenItem(
  hallId: string,
  userId: string,
  itemId: string,
  patch: ManageCanteenItemPatch,
): { payload: HallCanteenPayload; item: HallCanteenItem; restocked: boolean } | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;

  // Members may only update status / note; master-list fields require manager/captain.
  if (!patchHasMasterListFields(patch)) {
    if (patch.status === undefined) return null;
    if (!canUpdateCanteenStatus(role)) return null;
    const result = setCanteenItemStatus(hallId, userId, itemId, patch.status, patch.note);
    if (!result) return null;
    return { ...result, restocked: patch.status === "good" };
  }

  if (!canManageCanteenList(role)) return null;

  const hallPro = isHallPro(hallId, userId);
  if (patch.product_url !== undefined && !hallPro && patch.product_url) {
    return null;
  }
  if (patch.recurrence !== undefined && !hallPro && patch.recurrence !== "none") {
    return null;
  }

  const d = getDb();
  const now = new Date().toISOString();

  if (patch.status) {
    const statusResult = setCanteenItemStatus(hallId, userId, itemId, patch.status, patch.note);
    if (!statusResult) return null;
  }

  if (patch.archived === true) {
    d.prepare(
      `UPDATE hall_canteen_items SET archived = 1, updated_at = ?, last_updated_by_user_id = ? WHERE item_id = ? AND hall_id = ?`,
    ).run(now, userId, itemId, hallId);
    logActivity(hallId, userId, "item_archived", "Archived a staple", "item", itemId);
  }

  if (patch.name?.trim()) {
    const items = listItems(hallId);
    const duplicate = findCanteenItemByName(
      items.filter((item) => item.item_id !== itemId),
      patch.name,
    );
    if (duplicate) return null;
    d.prepare(
      `UPDATE hall_canteen_items SET name = ?, updated_at = ?, last_updated_by_user_id = ? WHERE item_id = ?`,
    ).run(patch.name.trim(), now, userId, itemId);
  }

  if (patch.category) {
    d.prepare(
      `UPDATE hall_canteen_items SET category = ?, updated_at = ?, last_updated_by_user_id = ? WHERE item_id = ?`,
    ).run(normalizeCanteenCategory(patch.category), now, userId, itemId);
  }

  if (patch.sort_order != null) {
    d.prepare(
      `UPDATE hall_canteen_items SET sort_order = ?, updated_at = ?, last_updated_by_user_id = ? WHERE item_id = ?`,
    ).run(patch.sort_order, now, userId, itemId);
  }

  if (patch.note !== undefined) {
    d.prepare(
      `UPDATE hall_canteen_items SET note = ?, updated_at = ?, last_updated_by_user_id = ? WHERE item_id = ?`,
    ).run(patch.note, now, userId, itemId);
  }

  if (hasEnrichedItemColumns()) {
    const fields: Array<[string, unknown]> = [];
    if (patch.preferred_brand !== undefined) fields.push(["preferred_brand", patch.preferred_brand]);
    if (patch.package_size !== undefined) fields.push(["package_size", patch.package_size]);
    if (patch.par_level !== undefined) fields.push(["par_level", patch.par_level]);
    if (patch.estimated_qty !== undefined) fields.push(["estimated_qty", patch.estimated_qty]);
    if (patch.reorder_qty !== undefined) fields.push(["reorder_qty", patch.reorder_qty]);
    if (patch.storage_location !== undefined)
      fields.push(["storage_location", patch.storage_location]);
    if (patch.preferred_retailer !== undefined)
      fields.push(["preferred_retailer", patch.preferred_retailer]);
    if (patch.costco_search_term !== undefined)
      fields.push(["costco_search_term", patch.costco_search_term]);
    if (patch.product_url !== undefined) {
      fields.push(["product_url", hallPro ? patch.product_url : null]);
    }
    if (patch.recurrence !== undefined) {
      fields.push(["recurrence", hallPro ? patch.recurrence : "none"]);
    }

    for (const [col, val] of fields) {
      d.prepare(
        `UPDATE hall_canteen_items SET ${col} = ?, updated_at = ?, last_updated_by_user_id = ? WHERE item_id = ?`,
      ).run(val as string | number | null, now, userId, itemId);
    }
  }

  const row = d
    .prepare(`SELECT * FROM hall_canteen_items WHERE item_id = ? AND hall_id = ?`)
    .get(itemId, hallId) as Record<string, unknown> | undefined;
  if (!row) return null;
  if (Number(row.archived) === 1) {
    const payload = buildCanteenPayload(hallId, userId);
    if (!payload) return null;
    return {
      payload,
      item: rowToItem(row, reportAggregates(hallId)),
      restocked: false,
    };
  }

  const payload = buildCanteenPayload(hallId, userId);
  if (!payload) return null;
  return {
    payload,
    item: rowToItem(row, reportAggregates(hallId)),
    restocked: patch.status === "good",
  };
}

export function addDefaultCanteenItem(
  hallId: string,
  userId: string,
  input: {
    name: string;
    category?: HallCanteenCategory;
    preferred_brand?: string;
    package_size?: string;
    reorder_qty?: number;
    costco_search_term?: string;
    product_url?: string;
    preferred_retailer?: string;
  },
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canManageCanteenList(role)) return null;

  const name = input.name.trim();
  if (!name || isProteinStapleName(name)) return null;

  seedDefaults(hallId);
  const existing = findCanteenItemByName(listItems(hallId), name);
  if (existing) return buildCanteenPayload(hallId, userId);

  if (!enforceStapleLimit(hallId, userId)) return null;

  const hallPro = isHallPro(hallId, userId);
  if (input.product_url && !hallPro) return null;

  const d = getDb();
  const now = new Date().toISOString();
  const category = normalizeCanteenCategory(input.category ?? "other");
  const maxOrder = d
    .prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM hall_canteen_items WHERE hall_id = ?`)
    .get(hallId) as { m: number };
  const itemId = nanoid();

  if (hasEnrichedItemColumns()) {
    d.prepare(
      `INSERT INTO hall_canteen_items
       (item_id, hall_id, name, category, status, is_default, sort_order,
        preferred_brand, package_size, reorder_qty, costco_search_term, product_url,
        preferred_retailer, last_updated_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'good', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      itemId,
      hallId,
      name,
      category,
      Number(maxOrder.m) + 1,
      input.preferred_brand ?? null,
      input.package_size ?? null,
      input.reorder_qty ?? 1,
      input.costco_search_term ?? null,
      hallPro ? (input.product_url ?? null) : null,
      input.preferred_retailer ?? "costco",
      userId,
      now,
      now,
    );
  } else {
    d.prepare(
      `INSERT INTO hall_canteen_items
       (item_id, hall_id, name, category, status, is_default, sort_order, last_updated_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'good', 0, ?, ?, ?, ?)`,
    ).run(itemId, hallId, name, category, Number(maxOrder.m) + 1, userId, now, now);
  }

  logActivity(hallId, userId, "item_added", `Added staple ${name}`, "item", itemId);
  return buildCanteenPayload(hallId, userId);
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

  logActivity(
    hallId,
    actorUserId,
    "manager_assigned",
    `Assigned ${memberDisplayName(targetUserId)} as canteen manager`,
    "user",
    targetUserId,
  );

  return buildCanteenPayload(hallId, actorUserId);
}

/** @deprecated History not exposed in staples UI */
export function listCanteenHistory(): null {
  return null;
}

/* ─── Suggestions ─────────────────────────────────────────── */

export function suggestStaple(
  hallId: string,
  userId: string,
  input: { name: string; category?: HallCanteenCategory; note?: string },
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canUpdateCanteenStatus(role) || !hasV2Tables()) return null;

  const name = input.name.trim();
  if (!name || isProteinStapleName(name)) return null;

  const now = new Date().toISOString();
  const suggestionId = nanoid();
  getDb()
    .prepare(
      `INSERT INTO hall_canteen_suggestions
       (suggestion_id, hall_id, name, category, note, suggested_by_user_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      suggestionId,
      hallId,
      name,
      input.category ? normalizeCanteenCategory(input.category) : null,
      input.note?.trim() || null,
      userId,
      now,
    );

  logActivity(
    hallId,
    userId,
    "suggestion_created",
    `Suggested staple ${name}`,
    "suggestion",
    suggestionId,
  );
  return buildCanteenPayload(hallId, userId);
}

export function reviewSuggestion(
  hallId: string,
  userId: string,
  suggestionId: string,
  action: "approve" | "reject",
  category?: HallCanteenCategory,
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canManageCanteenList(role) || !hasV2Tables()) return null;

  const d = getDb();
  const row = d
    .prepare(
      `SELECT * FROM hall_canteen_suggestions WHERE suggestion_id = ? AND hall_id = ? AND status = 'pending'`,
    )
    .get(suggestionId, hallId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const now = new Date().toISOString();

  if (action === "reject") {
    d.prepare(
      `UPDATE hall_canteen_suggestions
       SET status = 'rejected', reviewed_by_user_id = ?, reviewed_at = ?
       WHERE suggestion_id = ?`,
    ).run(userId, now, suggestionId);
    logActivity(
      hallId,
      userId,
      "suggestion_rejected",
      `Rejected suggestion ${String(row.name)}`,
      "suggestion",
      suggestionId,
    );
    return buildCanteenPayload(hallId, userId);
  }

  if (!enforceStapleLimit(hallId, userId)) return null;

  const result = addDefaultCanteenItem(hallId, userId, {
    name: String(row.name),
    category: category
      ? normalizeCanteenCategory(category)
      : row.category
        ? normalizeCanteenCategory(String(row.category))
        : "other",
  });
  if (!result) return null;

  const created = findCanteenItemByName(result.items, String(row.name));
  d.prepare(
    `UPDATE hall_canteen_suggestions
     SET status = 'approved', reviewed_by_user_id = ?, reviewed_at = ?, resulting_item_id = ?
     WHERE suggestion_id = ?`,
  ).run(userId, now, created?.item_id ?? null, suggestionId);

  logActivity(
    hallId,
    userId,
    "suggestion_approved",
    `Approved suggestion ${String(row.name)}`,
    "suggestion",
    suggestionId,
  );
  return buildCanteenPayload(hallId, userId);
}

/* ─── Weekly order ────────────────────────────────────────── */

export function getOrCreateDraftOrder(
  hallId: string,
  userId: string,
): HallCanteenWeeklyOrder | null {
  const role = memberRole(hallId, userId);
  if (!role || !canViewCanteen(role) || !hasV2Tables()) return null;
  return getOrCreateDraftOrderInternal(hallId, userId);
}

export function addItemToWeeklyOrder(
  hallId: string,
  userId: string,
  itemId: string,
  requestedQty?: number,
  notes?: string,
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canUpdateCanteenStatus(role) || !hasV2Tables()) return null;

  const order = getOrCreateDraftOrderInternal(hallId, userId);
  const added = addItemToWeeklyOrderInternal(
    hallId,
    userId,
    order.order_id,
    itemId,
    requestedQty,
    notes,
  );
  if (!added) return null;
  return buildCanteenPayload(hallId, userId);
}

export function updateOrderItem(
  hallId: string,
  userId: string,
  orderItemId: string,
  patch: {
    requested_qty?: number;
    notes?: string | null;
    status?: CanteenOrderItemStatus;
    substitute_name?: string | null;
    assigned_buyer_user_id?: string | null;
    estimated_price_cents?: number | null;
  },
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !hasV2Tables()) return null;

  const d = getDb();
  const row = d
    .prepare(
      `SELECT * FROM hall_canteen_order_items WHERE order_item_id = ? AND hall_id = ?`,
    )
    .get(orderItemId, hallId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const isManager = canManageCanteenList(role);
  const canUpdate = canUpdateCanteenStatus(role);
  if (!canUpdate) return null;

  // Reassignment is manager-only
  if (patch.assigned_buyer_user_id !== undefined && !isManager) return null;

  const now = new Date().toISOString();
  if (patch.requested_qty != null) {
    d.prepare(
      `UPDATE hall_canteen_order_items SET requested_qty = ?, updated_at = ? WHERE order_item_id = ?`,
    ).run(patch.requested_qty, now, orderItemId);
  }
  if (patch.notes !== undefined) {
    d.prepare(
      `UPDATE hall_canteen_order_items SET notes = ?, updated_at = ? WHERE order_item_id = ?`,
    ).run(patch.notes, now, orderItemId);
  }
  if (patch.status) {
    d.prepare(
      `UPDATE hall_canteen_order_items SET status = ?, updated_at = ? WHERE order_item_id = ?`,
    ).run(patch.status, now, orderItemId);
  }
  if (patch.substitute_name !== undefined) {
    d.prepare(
      `UPDATE hall_canteen_order_items SET substitute_name = ?, updated_at = ? WHERE order_item_id = ?`,
    ).run(patch.substitute_name, now, orderItemId);
  }
  if (patch.estimated_price_cents !== undefined) {
    d.prepare(
      `UPDATE hall_canteen_order_items SET estimated_price_cents = ?, updated_at = ? WHERE order_item_id = ?`,
    ).run(patch.estimated_price_cents, now, orderItemId);
  }
  if (patch.assigned_buyer_user_id !== undefined) {
    d.prepare(
      `UPDATE hall_canteen_order_items
       SET assigned_buyer_user_id = ?, assigned_at = ?, status = CASE WHEN ? IS NOT NULL THEN 'buying_this' ELSE status END, updated_at = ?
       WHERE order_item_id = ?`,
    ).run(
      patch.assigned_buyer_user_id,
      patch.assigned_buyer_user_id ? now : null,
      patch.assigned_buyer_user_id,
      now,
      orderItemId,
    );
  }

  return buildCanteenPayload(hallId, userId);
}

export function claimOrderItem(
  hallId: string,
  userId: string,
  orderItemId: string,
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canUpdateCanteenStatus(role) || !hasV2Tables()) return null;

  const d = getDb();
  const row = d
    .prepare(
      `SELECT * FROM hall_canteen_order_items WHERE order_item_id = ? AND hall_id = ?`,
    )
    .get(orderItemId, hallId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const currentBuyer = row.assigned_buyer_user_id
    ? String(row.assigned_buyer_user_id)
    : null;
  if (currentBuyer && currentBuyer !== userId) return null;

  const now = new Date().toISOString();
  d.prepare(
    `UPDATE hall_canteen_order_items
     SET assigned_buyer_user_id = ?, assigned_at = ?, status = 'buying_this', updated_at = ?
     WHERE order_item_id = ?`,
  ).run(userId, now, now, orderItemId);

  logActivity(
    hallId,
    userId,
    "order_item_claim",
    `${memberDisplayName(userId)} is buying ${String(row.name)}`,
    "order_item",
    orderItemId,
  );
  return buildCanteenPayload(hallId, userId);
}

export function releaseOrderItem(
  hallId: string,
  userId: string,
  orderItemId: string,
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !hasV2Tables()) return null;

  const d = getDb();
  const row = d
    .prepare(
      `SELECT * FROM hall_canteen_order_items WHERE order_item_id = ? AND hall_id = ?`,
    )
    .get(orderItemId, hallId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const currentBuyer = row.assigned_buyer_user_id
    ? String(row.assigned_buyer_user_id)
    : null;
  const isManager = canManageCanteenList(role);
  if (!isManager && currentBuyer !== userId) return null;

  const now = new Date().toISOString();
  d.prepare(
    `UPDATE hall_canteen_order_items
     SET assigned_buyer_user_id = NULL, assigned_at = NULL, status = 'needed', updated_at = ?
     WHERE order_item_id = ?`,
  ).run(now, orderItemId);

  logActivity(
    hallId,
    userId,
    "order_item_release",
    `Released buying claim for ${String(row.name)}`,
    "order_item",
    orderItemId,
  );
  return buildCanteenPayload(hallId, userId);
}

export function recordOrderCheckout(
  hallId: string,
  userId: string,
  input: {
    retailer?: string;
    external_order_number?: string;
    ordered_at?: string;
    scheduled_delivery_date?: string;
    scheduled_delivery_window?: string;
    subtotal_cents?: number;
    delivery_fee_cents?: number;
    tax_cents?: number;
    tip_cents?: number;
    total_cents?: number;
    notes?: string;
    status?: CanteenOrderStatus;
  },
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canManageCanteenList(role) || !hasV2Tables()) return null;

  const order = getOrCreateDraftOrderInternal(hallId, userId);
  const now = new Date().toISOString();
  const d = getDb();

  d.prepare(
    `UPDATE hall_canteen_weekly_orders SET
       retailer = COALESCE(?, retailer),
       external_order_number = COALESCE(?, external_order_number),
       ordered_at = COALESCE(?, ordered_at),
       scheduled_delivery_date = COALESCE(?, scheduled_delivery_date),
       scheduled_delivery_window = COALESCE(?, scheduled_delivery_window),
       subtotal_cents = COALESCE(?, subtotal_cents),
       delivery_fee_cents = COALESCE(?, delivery_fee_cents),
       tax_cents = COALESCE(?, tax_cents),
       tip_cents = COALESCE(?, tip_cents),
       total_cents = COALESCE(?, total_cents),
       notes = COALESCE(?, notes),
       status = COALESCE(?, status),
       purchaser_user_id = ?,
       updated_at = ?
     WHERE order_id = ?`,
  ).run(
    input.retailer ?? null,
    input.external_order_number ?? null,
    input.ordered_at ?? now,
    input.scheduled_delivery_date ?? null,
    input.scheduled_delivery_window ?? null,
    input.subtotal_cents ?? null,
    input.delivery_fee_cents ?? null,
    input.tax_cents ?? null,
    input.tip_cents ?? null,
    input.total_cents ?? null,
    input.notes ?? null,
    input.status ?? "submitted",
    userId,
    now,
    order.order_id,
  );

  // Mark order line items as ordered when checking out
  d.prepare(
    `UPDATE hall_canteen_order_items
     SET status = 'ordered', updated_at = ?
     WHERE order_id = ? AND status IN ('needed', 'buying_this', 'added_to_costco')`,
  ).run(now, order.order_id);

  logActivity(hallId, userId, "order_checkout", "Recorded Costco / weekly order checkout", "order", order.order_id);
  return buildCanteenPayload(hallId, userId);
}

export function receiveOrderItem(
  hallId: string,
  userId: string,
  orderItemId: string,
  input: {
    receive_status: CanteenReceiveStatus;
    received_qty?: number;
    substitute_name?: string;
  },
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canUpdateCanteenStatus(role) || !hasV2Tables()) return null;

  const d = getDb();
  const row = d
    .prepare(
      `SELECT * FROM hall_canteen_order_items WHERE order_item_id = ? AND hall_id = ?`,
    )
    .get(orderItemId, hallId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const now = new Date().toISOString();
  d.prepare(
    `UPDATE hall_canteen_order_items
     SET receive_status = ?, received_qty = ?, substitute_name = COALESCE(?, substitute_name),
         status = CASE WHEN ? = 'received_full' THEN 'delivered' ELSE status END,
         updated_at = ?
     WHERE order_item_id = ?`,
  ).run(
    input.receive_status,
    input.received_qty ?? null,
    input.substitute_name ?? null,
    input.receive_status,
    now,
    orderItemId,
  );

  const stapleId = row.staple_item_id ? String(row.staple_item_id) : null;
  if (stapleId && input.receive_status === "received_full") {
    if (hasEnrichedItemColumns()) {
      d.prepare(
        `UPDATE hall_canteen_items
         SET status = 'good', last_restocked_at = ?, picked_up_by_user_id = NULL, picked_up_at = NULL,
             last_updated_by_user_id = ?, updated_at = ?
         WHERE item_id = ? AND hall_id = ?`,
      ).run(now, userId, now, stapleId, hallId);
    } else {
      d.prepare(
        `UPDATE hall_canteen_items
         SET status = 'good', picked_up_by_user_id = NULL, picked_up_at = NULL,
             last_updated_by_user_id = ?, updated_at = ?
         WHERE item_id = ? AND hall_id = ?`,
      ).run(userId, now, stapleId, hallId);
    }
    resolveShortageReports(hallId, stapleId, userId);
  }

  logActivity(
    hallId,
    userId,
    "order_item_receive",
    `Marked ${String(row.name)} as ${input.receive_status}`,
    "order_item",
    orderItemId,
  );
  return buildCanteenPayload(hallId, userId);
}

export function completeDelivery(
  hallId: string,
  userId: string,
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canManageCanteenList(role) || !hasV2Tables()) return null;

  const order = getOrCreateDraftOrderInternal(hallId, userId);
  const now = new Date().toISOString();
  const d = getDb();

  d.prepare(
    `UPDATE hall_canteen_weekly_orders
     SET status = 'delivered', completed_at = ?, updated_at = ?
     WHERE order_id = ?`,
  ).run(now, now, order.order_id);

  logActivity(
    hallId,
    userId,
    "delivery_complete",
    "Completed weekly order delivery",
    "order",
    order.order_id,
  );

  // Create a fresh draft for the next week
  getOrCreateDraftOrderInternal(hallId, userId);
  return buildCanteenPayload(hallId, userId);
}

export function getCostcoHandoff(
  hallId: string,
  userId: string,
): { text: string; csv: string; costco_url: string } | null {
  const role = memberRole(hallId, userId);
  if (!role || !canViewCanteen(role) || !hasV2Tables()) return null;

  const order = getOrCreateDraftOrderInternal(hallId, userId);
  const hallPro = isHallPro(hallId, userId);
  return {
    text: buildCostcoHandoffText(order),
    csv: hallPro ? buildCostcoHandoffCsv(order) : "",
    costco_url: COSTCO_SAME_DAY_URL,
  };
}

/* ─── Manager notes ───────────────────────────────────────── */

export function createManagerNote(
  hallId: string,
  userId: string,
  body: string,
  sortOrder?: number,
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canManageCanteenList(role) || !hasV2Tables()) return null;

  const now = new Date().toISOString();
  const noteId = nanoid();
  getDb()
    .prepare(
      `INSERT INTO hall_canteen_manager_notes
       (note_id, hall_id, body, sort_order, created_by_user_id, updated_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(noteId, hallId, body.trim(), sortOrder ?? 0, userId, userId, now, now);

  logActivity(hallId, userId, "manager_note_created", "Added a manager note", "note", noteId);
  return buildCanteenPayload(hallId, userId);
}

export function updateManagerNote(
  hallId: string,
  userId: string,
  noteId: string,
  body: string,
  sortOrder?: number,
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canManageCanteenList(role) || !hasV2Tables()) return null;

  const now = new Date().toISOString();
  const d = getDb();
  const existing = d
    .prepare(
      `SELECT note_id FROM hall_canteen_manager_notes WHERE note_id = ? AND hall_id = ? AND archived = 0`,
    )
    .get(noteId, hallId);
  if (!existing) return null;

  if (sortOrder != null) {
    d.prepare(
      `UPDATE hall_canteen_manager_notes
       SET body = ?, sort_order = ?, updated_by_user_id = ?, updated_at = ?
       WHERE note_id = ?`,
    ).run(body.trim(), sortOrder, userId, now, noteId);
  } else {
    d.prepare(
      `UPDATE hall_canteen_manager_notes
       SET body = ?, updated_by_user_id = ?, updated_at = ?
       WHERE note_id = ?`,
    ).run(body.trim(), userId, now, noteId);
  }

  return buildCanteenPayload(hallId, userId);
}

export function deleteManagerNote(
  hallId: string,
  userId: string,
  noteId: string,
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canManageCanteenList(role) || !hasV2Tables()) return null;

  const now = new Date().toISOString();
  const existing = getDb()
    .prepare(
      `SELECT note_id FROM hall_canteen_manager_notes WHERE note_id = ? AND hall_id = ? AND archived = 0`,
    )
    .get(noteId, hallId);
  if (!existing) return null;

  getDb()
    .prepare(
      `UPDATE hall_canteen_manager_notes
       SET archived = 1, updated_by_user_id = ?, updated_at = ?
       WHERE note_id = ? AND hall_id = ?`,
    )
    .run(userId, now, noteId, hallId);

  logActivity(hallId, userId, "manager_note_deleted", "Removed a manager note", "note", noteId);
  return buildCanteenPayload(hallId, userId);
}

export function listManagerNotesForHall(
  hallId: string,
  userId: string,
): HallCanteenManagerNote[] | null {
  const role = memberRole(hallId, userId);
  if (!role || !canViewCanteen(role)) return null;
  return listManagerNotes(hallId);
}

/* ─── Test seed ───────────────────────────────────────────── */

export function seedTestHallCanteenData(
  hallId: string,
  userId: string,
  opts?: { force?: boolean; captainOnly?: boolean },
): HallCanteenPayload | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;
  if (opts?.captainOnly) {
    if (role !== "captain") return null;
  } else if (!canManageCanteenList(role)) {
    return null;
  }
  if (!opts?.force && !isTestHall(hallId)) return null;
  if (!hasV2Tables() || !hasEnrichedItemColumns()) return null;

  seedDefaults(hallId);
  const d = getDb();
  const now = new Date().toISOString();

  const insertStaple = d.prepare(
    `INSERT INTO hall_canteen_items
     (item_id, hall_id, name, category, status, is_default, sort_order, reorder_qty, is_test,
      last_updated_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, 1, ?, ?, ?)`,
  );

  // Unique name index — skip if name already exists
  const existingNames = new Set(
    (
      d
        .prepare(`SELECT lower(name) AS n FROM hall_canteen_items WHERE hall_id = ? AND archived = 0`)
        .all(hallId) as Array<{ n: string }>
    ).map((r) => r.n),
  );

  const createdIds: string[] = [];
  let sortBase = 100;
  for (const seed of TEST_HALL_CANTEEN_STAPLES) {
    if (existingNames.has(seed.name.toLowerCase())) {
      const found = d
        .prepare(
          `SELECT item_id FROM hall_canteen_items WHERE hall_id = ? AND lower(name) = lower(?) AND archived = 0`,
        )
        .get(hallId, seed.name) as { item_id: string } | undefined;
      if (found) createdIds.push(found.item_id);
      continue;
    }
    const itemId = nanoid();
    insertStaple.run(
      itemId,
      hallId,
      seed.name,
      seed.category,
      seed.status,
      sortBase++,
      seed.reorder_qty,
      userId,
      now,
      now,
    );
    createdIds.push(itemId);
    existingNames.add(seed.name.toLowerCase());

    if (seed.status === "out" || seed.status === "running_low") {
      insertShortageReport(hallId, itemId, userId, seed.status, `TEST: ${seed.name} shortage`);
    }
  }

  // One pending suggestion
  const pendingSuggestion = d
    .prepare(
      `SELECT suggestion_id FROM hall_canteen_suggestions WHERE hall_id = ? AND name = ? LIMIT 1`,
    )
    .get(hallId, "TEST Suggested Staple") as { suggestion_id: string } | undefined;
  if (!pendingSuggestion) {
    d.prepare(
      `INSERT INTO hall_canteen_suggestions
       (suggestion_id, hall_id, name, category, note, suggested_by_user_id, status, created_at)
       VALUES (?, ?, 'TEST Suggested Staple', 'snacks', 'Please add for testing', ?, 'pending', ?)`,
    ).run(nanoid(), hallId, userId, now);
  }

  // Draft order with items for shortage staples
  const order = getOrCreateDraftOrderInternal(hallId, userId);
  d.prepare(`UPDATE hall_canteen_weekly_orders SET is_test = 1 WHERE order_id = ?`).run(
    order.order_id,
  );
  for (const itemId of createdIds) {
    const staple = d
      .prepare(`SELECT status FROM hall_canteen_items WHERE item_id = ?`)
      .get(itemId) as { status: string } | undefined;
    if (staple && (staple.status === "out" || staple.status === "running_low")) {
      addItemToWeeklyOrderInternal(hallId, userId, order.order_id, itemId, undefined, undefined, true);
    }
  }

  // One completed historical delivery (if none yet)
  const past = d
    .prepare(
      `SELECT order_id FROM hall_canteen_weekly_orders
       WHERE hall_id = ? AND status = 'delivered' AND is_test = 1 LIMIT 1`,
    )
    .get(hallId) as { order_id: string } | undefined;
  if (!past) {
    const pastOrderId = nanoid();
    const pastAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    d.prepare(
      `INSERT INTO hall_canteen_weekly_orders
       (order_id, hall_id, title, status, retailer, ordered_at, completed_at, is_test,
        purchaser_user_id, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, 'TEST Prior Delivery', 'delivered', 'costco', ?, ?, 1, ?, ?, ?, ?)`,
    ).run(pastOrderId, hallId, pastAt, pastAt, userId, userId, pastAt, pastAt);

    const firstId = createdIds[0];
    if (firstId) {
      const staple = d
        .prepare(`SELECT name, category FROM hall_canteen_items WHERE item_id = ?`)
        .get(firstId) as { name: string; category: string } | undefined;
      if (staple) {
        d.prepare(
          `INSERT INTO hall_canteen_order_items
           (order_item_id, order_id, hall_id, staple_item_id, name, category, requested_qty,
            status, receive_status, received_qty, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, 'delivered', 'received_full', 1, ?, ?)`,
        ).run(nanoid(), pastOrderId, hallId, firstId, staple.name, staple.category, pastAt, pastAt);
      }
    }
  }

  logActivity(hallId, userId, "test_seed", "Seeded TEST canteen manager data", "hall", hallId);
  return buildCanteenPayload(hallId, userId);
}
