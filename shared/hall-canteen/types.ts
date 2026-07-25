import type { HallRole } from "../hall-membership/types.js";
import { hallRoleHasPermission } from "../hall-membership/types.js";

/** Canonical staple categories (Canteen Manager V2). */
export const HALL_CANTEEN_CATEGORIES = [
  "coffee_beverages",
  "breakfast",
  "condiments",
  "spices",
  "pantry",
  "snacks",
  "cleaning",
  "paper_products",
  "personal_care",
  "frozen",
  "refrigerated",
  "other",
] as const;
export type HallCanteenCategory = (typeof HALL_CANTEEN_CATEGORIES)[number];

/** Legacy category ids still accepted from older clients / DB rows. */
export const HALL_CANTEEN_LEGACY_CATEGORIES = [
  "coffee_drinks",
  "bread",
  "staples",
  "custom",
] as const;

export type HallCanteenCategoryInput =
  | HallCanteenCategory
  | (typeof HALL_CANTEEN_LEGACY_CATEGORIES)[number];

export const HALL_CANTEEN_STATUSES = [
  "good",
  "running_low",
  "out",
  "requested",
  "ordered",
  "delivered",
  "being_picked_up",
] as const;
export type HallCanteenStatus = (typeof HALL_CANTEEN_STATUSES)[number];

/** Member-facing quick taps only. */
export const HALL_CANTEEN_MEMBER_STATUSES = ["good", "running_low", "out"] as const;
export type HallCanteenMemberStatus = (typeof HALL_CANTEEN_MEMBER_STATUSES)[number];

export const CANTEEN_PICKUP_EXPIRE_MS = 24 * 60 * 60 * 1000;

export const FREE_HALL_ACTIVE_STAPLE_LIMIT = 25;

export const HALL_CANTEEN_CATEGORY_LABELS: Record<HallCanteenCategory, string> = {
  coffee_beverages: "Coffee & Beverages",
  breakfast: "Breakfast",
  condiments: "Condiments",
  spices: "Spices",
  pantry: "Pantry",
  snacks: "Snacks",
  cleaning: "Cleaning",
  paper_products: "Paper Products",
  personal_care: "Personal Care",
  frozen: "Frozen",
  refrigerated: "Refrigerated",
  other: "Other",
};

export const HALL_CANTEEN_CATEGORY_EMOJI: Record<HallCanteenCategory, string> = {
  coffee_beverages: "☕",
  breakfast: "🥣",
  condiments: "🧂",
  spices: "🌶️",
  pantry: "🥫",
  snacks: "🍿",
  cleaning: "🧹",
  paper_products: "🧻",
  personal_care: "🧴",
  frozen: "🧊",
  refrigerated: "🥛",
  other: "📦",
};

export const HALL_CANTEEN_STATUS_LABELS: Record<HallCanteenStatus, string> = {
  good: "Good",
  running_low: "Running Low",
  out: "Out",
  requested: "Requested",
  ordered: "Ordered",
  delivered: "Delivered",
  being_picked_up: "Buying This",
};

export const HALL_CANTEEN_STATUS_ICONS: Record<HallCanteenStatus, string> = {
  good: "✓",
  running_low: "↓",
  out: "!",
  requested: "?",
  ordered: "→",
  delivered: "✓",
  being_picked_up: "🛒",
};

export type CanteenRecurrence =
  | "none"
  | "always_check_weekly"
  | "weekly"
  | "biweekly"
  | "monthly";

export const CANTEEN_RECURRENCE_LABELS: Record<CanteenRecurrence, string> = {
  none: "As needed",
  always_check_weekly: "Always Check Weekly",
  weekly: "Recurring Weekly",
  biweekly: "Recurring Every 2 Weeks",
  monthly: "Recurring Monthly",
};

export type CanteenOrderStatus =
  | "draft"
  | "submitted"
  | "being_shopped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const CANTEEN_ORDER_STATUS_LABELS: Record<CanteenOrderStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  being_shopped: "Being Shopped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type CanteenOrderItemStatus =
  | "needed"
  | "buying_this"
  | "added_to_costco"
  | "ordered"
  | "delivered"
  | "unavailable"
  | "substituted";

export const CANTEEN_ORDER_ITEM_STATUS_LABELS: Record<CanteenOrderItemStatus, string> = {
  needed: "Needed",
  buying_this: "Buying This",
  added_to_costco: "Added to Costco",
  ordered: "Ordered",
  delivered: "Delivered",
  unavailable: "Unavailable",
  substituted: "Substituted",
};

export type CanteenReceiveStatus =
  | "pending"
  | "received_full"
  | "partial"
  | "substituted"
  | "missing"
  | "damaged";

export const CANTEEN_RECEIVE_STATUS_LABELS: Record<CanteenReceiveStatus, string> = {
  pending: "Pending",
  received_full: "Received in Full",
  partial: "Partial Quantity",
  substituted: "Substituted",
  missing: "Missing",
  damaged: "Damaged",
};

export interface HallCanteenItem {
  item_id: string;
  hall_id: string;
  name: string;
  category: HallCanteenCategory;
  status: HallCanteenStatus;
  is_default: boolean;
  sort_order: number;
  archived: boolean;
  note: string | null;
  preferred_brand: string | null;
  package_size: string | null;
  par_level: number | null;
  estimated_qty: number | null;
  reorder_qty: number;
  storage_location: string | null;
  preferred_retailer: string | null;
  costco_search_term: string | null;
  product_url: string | null;
  last_restocked_at: string | null;
  recurrence: CanteenRecurrence;
  next_review_at: string | null;
  is_test: boolean;
  last_updated_by_user_id: string | null;
  last_updated_by_display_name: string | null;
  picked_up_by_user_id: string | null;
  picked_up_by_display_name: string | null;
  picked_up_at: string | null;
  report_count: number;
  latest_report_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface HallCanteenShortageReport {
  report_id: string;
  hall_id: string;
  item_id: string;
  reporter_user_id: string;
  reporter_display_name: string;
  status: HallCanteenMemberStatus;
  note: string | null;
  resolved: boolean;
  created_at: string;
}

export interface HallCanteenSuggestion {
  suggestion_id: string;
  hall_id: string;
  name: string;
  category: HallCanteenCategory | null;
  note: string | null;
  suggested_by_user_id: string;
  suggested_by_display_name: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface HallCanteenOrderItem {
  order_item_id: string;
  order_id: string;
  hall_id: string;
  staple_item_id: string | null;
  name: string;
  category: HallCanteenCategory | null;
  requested_qty: number;
  package_size: string | null;
  preferred_brand: string | null;
  retailer: string | null;
  costco_search_term: string | null;
  product_url: string | null;
  notes: string | null;
  estimated_price_cents: number | null;
  assigned_buyer_user_id: string | null;
  assigned_buyer_display_name: string | null;
  assigned_at: string | null;
  status: CanteenOrderItemStatus;
  substitute_name: string | null;
  receive_status: CanteenReceiveStatus | null;
  received_qty: number | null;
  created_at: string;
  updated_at: string;
}

export interface HallCanteenWeeklyOrder {
  order_id: string;
  hall_id: string;
  title: string;
  status: CanteenOrderStatus;
  retailer: string;
  external_order_number: string | null;
  ordered_at: string | null;
  scheduled_delivery_date: string | null;
  scheduled_delivery_window: string | null;
  subtotal_cents: number | null;
  delivery_fee_cents: number | null;
  tax_cents: number | null;
  tip_cents: number | null;
  total_cents: number | null;
  purchaser_user_id: string | null;
  purchaser_display_name: string | null;
  receipt_path: string | null;
  notes: string | null;
  is_test: boolean;
  completed_at: string | null;
  items: HallCanteenOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface HallCanteenManagerNote {
  note_id: string;
  hall_id: string;
  body: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HallCanteenActivityEntry {
  activity_id: string;
  hall_id: string;
  actor_user_id: string | null;
  actor_display_name: string | null;
  action: string;
  summary: string;
  created_at: string;
}

export interface HallCanteenCounts {
  out: number;
  running_low: number;
  requested: number;
  in_weeks_order: number;
}

export interface HallCanteenPayload {
  items: HallCanteenItem[];
  needs_attention: HallCanteenItem[];
  shopping_this_week: HallCanteenItem[];
  running_low: HallCanteenItem[];
  out: HallCanteenItem[];
  needs_attention_count: number;
  counts: HallCanteenCounts;
  suggestions: HallCanteenSuggestion[];
  current_order: HallCanteenWeeklyOrder | null;
  recent_deliveries: HallCanteenWeeklyOrder[];
  manager_notes: HallCanteenManagerNote[];
  activity: HallCanteenActivityEntry[];
  my_role: HallRole;
  /** Any linked member can update item status */
  can_update: boolean;
  /** Canteen manager or captain — master list edits */
  can_manage_list: boolean;
  canteen_manager_user_id: string | null;
  active_staple_count: number;
  staple_limit: number | null;
  is_hall_pro: boolean;
  can_use_order_history: boolean;
  can_use_recurring: boolean;
  can_use_product_urls: boolean;
  can_export_csv: boolean;
}

export interface HallCanteenDefaultSeed {
  name: string;
  category: HallCanteenCategory;
  sort_order: number;
}

export const DEFAULT_HALL_CANTEEN_ITEMS: HallCanteenDefaultSeed[] = [
  { name: "Coffee", category: "coffee_beverages", sort_order: 1 },
  { name: "Milk", category: "coffee_beverages", sort_order: 2 },
  { name: "Cream", category: "coffee_beverages", sort_order: 3 },
  { name: "Sugar", category: "coffee_beverages", sort_order: 4 },
  { name: "Tea", category: "coffee_beverages", sort_order: 5 },
  { name: "Bread", category: "breakfast", sort_order: 6 },
  { name: "Bagels", category: "breakfast", sort_order: 7 },
  { name: "Buns", category: "breakfast", sort_order: 8 },
  { name: "Butter", category: "refrigerated", sort_order: 9 },
  { name: "Ketchup", category: "condiments", sort_order: 10 },
  { name: "Mustard", category: "condiments", sort_order: 11 },
  { name: "Mayonnaise", category: "condiments", sort_order: 12 },
  { name: "BBQ Sauce", category: "condiments", sort_order: 13 },
  { name: "Hot Sauce", category: "condiments", sort_order: 14 },
  { name: "Jam", category: "condiments", sort_order: 15 },
  { name: "Peanut Butter", category: "condiments", sort_order: 16 },
  { name: "Honey", category: "condiments", sort_order: 17 },
  { name: "Cooking Oil", category: "pantry", sort_order: 18 },
  { name: "Salt", category: "spices", sort_order: 19 },
  { name: "Pepper", category: "spices", sort_order: 20 },
];

/** Clearly labelled test staples for the Firehall Meals Test Hall only. */
export const TEST_HALL_CANTEEN_STAPLES: Array<{
  name: string;
  category: HallCanteenCategory;
  status: HallCanteenMemberStatus;
  reorder_qty: number;
}> = [
  { name: "TEST Coffee", category: "coffee_beverages", status: "out", reorder_qty: 2 },
  { name: "TEST Paper Towels", category: "paper_products", status: "out", reorder_qty: 1 },
  { name: "TEST Hot Sauce", category: "condiments", status: "running_low", reorder_qty: 2 },
  { name: "TEST Electrolyte Mix", category: "snacks", status: "running_low", reorder_qty: 1 },
  { name: "TEST Dish Soap", category: "cleaning", status: "good", reorder_qty: 1 },
  { name: "TEST Garbage Bags", category: "paper_products", status: "good", reorder_qty: 1 },
  { name: "TEST Protein Bars", category: "snacks", status: "good", reorder_qty: 1 },
  { name: "TEST Oat Milk", category: "refrigerated", status: "running_low", reorder_qty: 2 },
];

const PROTEIN_NAMES = new Set(
  [
    "chicken",
    "beef",
    "pork",
    "fish",
    "eggs",
    "egg",
    "ground beef",
    "ground turkey",
    "turkey",
    "bacon",
    "sausage",
    "steak",
    "salmon",
    "tuna",
    "shrimp",
  ].map((n) => n.toLowerCase()),
);

export function normalizeCanteenCategory(raw: string): HallCanteenCategory {
  switch (raw) {
    case "coffee_drinks":
      return "coffee_beverages";
    case "bread":
      return "breakfast";
    case "staples":
      return "pantry";
    case "custom":
      return "other";
    default:
      return (HALL_CANTEEN_CATEGORIES as readonly string[]).includes(raw)
        ? (raw as HallCanteenCategory)
        : "other";
  }
}

export function isProteinStapleName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return PROTEIN_NAMES.has(lower) || /\b(chicken|beef|pork|fish|egg)\b/i.test(lower);
}

export function statusSeverity(status: HallCanteenStatus): number {
  switch (status) {
    case "out":
      return 3;
    case "running_low":
      return 2;
    case "requested":
      return 1;
    default:
      return 0;
  }
}

export function moreSevereStatus(
  a: HallCanteenStatus,
  b: HallCanteenStatus,
): HallCanteenStatus {
  return statusSeverity(a) >= statusSeverity(b) ? a : b;
}

export function isCanteenAttentionStatus(status: HallCanteenStatus): boolean {
  return status === "running_low" || status === "out" || status === "requested";
}

export function isBeingPickedUpStatus(status: HallCanteenStatus): boolean {
  return status === "being_picked_up";
}

export function isShoppingThisWeekStatus(status: HallCanteenStatus): boolean {
  return isCanteenAttentionStatus(status) || isBeingPickedUpStatus(status);
}

export function formatBuyingDayLabel(pickedUpAt: string, now = new Date()): string {
  const picked = new Date(pickedUpAt);
  if (
    picked.getFullYear() === now.getFullYear() &&
    picked.getMonth() === now.getMonth() &&
    picked.getDate() === now.getDate()
  ) {
    return "Buying today";
  }
  return picked.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function pickingUpMessage(displayName: string): string {
  return `${displayName} is picking this up.`;
}

export function isPickupExpired(pickedUpAt: string, now = Date.now()): boolean {
  return now - new Date(pickedUpAt).getTime() >= CANTEEN_PICKUP_EXPIRE_MS;
}

export function canViewCanteen(role: HallRole): boolean {
  return hallRoleHasPermission(role, "view_hall_dashboard");
}

export function canUpdateCanteenStatus(role: HallRole): boolean {
  return canViewCanteen(role);
}

/** @deprecated use canUpdateCanteenStatus */
export function canUpdateCanteen(role: HallRole): boolean {
  return canUpdateCanteenStatus(role);
}

export function canManageCanteenList(role: HallRole): boolean {
  return hallRoleHasPermission(role, "manage_supplies") || hallRoleHasPermission(role, "manage_settings");
}

export function findCanteenItemByName(
  items: HallCanteenItem[],
  name: string,
): HallCanteenItem | undefined {
  const key = name.trim().toLowerCase();
  return items.find((item) => item.name.trim().toLowerCase() === key);
}

export function categoryDisplayOrder(): HallCanteenCategory[] {
  return [...HALL_CANTEEN_CATEGORIES];
}

export function groupItemsByCategory(
  items: HallCanteenItem[],
): Array<{ category: HallCanteenCategory; items: HallCanteenItem[] }> {
  const map = new Map<HallCanteenCategory, HallCanteenItem[]>();
  for (const cat of categoryDisplayOrder()) {
    map.set(cat, []);
  }
  for (const item of items) {
    const cat = normalizeCanteenCategory(item.category);
    const bucket = map.get(cat) ?? map.get("other")!;
    bucket.push(item);
  }
  return categoryDisplayOrder()
    .map((category) => ({ category, items: map.get(category) ?? [] }))
    .filter((group) => group.items.length > 0);
}

export function applyCanteenStatusChange(
  payload: HallCanteenPayload,
  itemId: string,
  status: HallCanteenStatus,
): HallCanteenPayload {
  const items = payload.items.map((item) => {
    if (item.item_id !== itemId) return item;
    const clearedPickup = status === "good" || isCanteenAttentionStatus(status);
    return {
      ...item,
      status,
      picked_up_by_user_id: clearedPickup ? null : item.picked_up_by_user_id,
      picked_up_by_display_name: clearedPickup ? null : item.picked_up_by_display_name,
      picked_up_at: clearedPickup ? null : item.picked_up_at,
    };
  });
  const needs_attention = items.filter((item) => isCanteenAttentionStatus(item.status));
  const shopping_this_week = items.filter((item) => isShoppingThisWeekStatus(item.status));
  return {
    ...payload,
    items,
    needs_attention,
    shopping_this_week,
    running_low: items.filter((item) => item.status === "running_low"),
    out: items.filter((item) => item.status === "out"),
    needs_attention_count: needs_attention.length,
    counts: {
      out: items.filter((i) => i.status === "out").length,
      running_low: items.filter((i) => i.status === "running_low").length,
      requested: items.filter((i) => i.status === "requested").length,
      in_weeks_order: payload.counts.in_weeks_order,
    },
  };
}

/** Running Low, Out, and Being Picked Up items for the weekly pickup list. */
export function sortShoppingThisWeekItems(items: HallCanteenItem[]): HallCanteenItem[] {
  const statusOrder: Record<HallCanteenStatus, number> = {
    out: 0,
    running_low: 1,
    requested: 2,
    being_picked_up: 3,
    ordered: 4,
    delivered: 5,
    good: 6,
  };
  return [...items].sort((a, b) => {
    const byStatus = statusOrder[a.status] - statusOrder[b.status];
    if (byStatus !== 0) return byStatus;
    return a.sort_order - b.sort_order || a.name.localeCompare(b.name);
  });
}

export function getShoppingThisWeekItems(payload: HallCanteenPayload): HallCanteenItem[] {
  return sortShoppingThisWeekItems(payload.shopping_this_week);
}

export const COSTCO_SAME_DAY_URL = "https://www.costco.com/";

export function buildCostcoHandoffText(order: HallCanteenWeeklyOrder): string {
  const lines = [
    "Firehall Meals — Costco handoff list",
    "(Open Costco separately — this cart is NOT synced.)",
    "",
  ];
  for (const item of order.items) {
    if (item.retailer && item.retailer !== "costco") continue;
    const qty = item.requested_qty % 1 === 0 ? String(item.requested_qty) : item.requested_qty.toFixed(1);
    lines.push(
      `• ${item.name} × ${qty}` +
        (item.package_size ? ` (${item.package_size})` : "") +
        (item.preferred_brand ? ` — ${item.preferred_brand}` : "") +
        (item.costco_search_term ? ` | search: ${item.costco_search_term}` : ""),
    );
    if (item.notes) lines.push(`  note: ${item.notes}`);
    if (item.product_url) lines.push(`  link: ${item.product_url}`);
  }
  return lines.join("\n");
}

export function buildCostcoHandoffCsv(order: HallCanteenWeeklyOrder): string {
  const header = [
    "name",
    "qty",
    "package_size",
    "brand",
    "search_term",
    "product_url",
    "notes",
    "status",
  ];
  const rows = order.items
    .filter((i) => !i.retailer || i.retailer === "costco")
    .map((i) =>
      [
        i.name,
        i.requested_qty,
        i.package_size ?? "",
        i.preferred_brand ?? "",
        i.costco_search_term ?? "",
        i.product_url ?? "",
        i.notes ?? "",
        i.status,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    );
  return [header.join(","), ...rows].join("\n");
}
