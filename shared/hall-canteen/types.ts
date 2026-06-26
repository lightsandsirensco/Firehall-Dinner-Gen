import type { HallRole } from "../hall-membership/types.js";
import { hallRoleHasPermission } from "../hall-membership/types.js";

export const HALL_CANTEEN_CATEGORIES = [
  "coffee_drinks",
  "bread",
  "condiments",
  "staples",
  "custom",
] as const;
export type HallCanteenCategory = (typeof HALL_CANTEEN_CATEGORIES)[number];

export const HALL_CANTEEN_STATUSES = ["good", "running_low", "out", "being_picked_up"] as const;
export type HallCanteenStatus = (typeof HALL_CANTEEN_STATUSES)[number];

export const CANTEEN_PICKUP_EXPIRE_MS = 24 * 60 * 60 * 1000;

export const HALL_CANTEEN_CATEGORY_LABELS: Record<HallCanteenCategory, string> = {
  coffee_drinks: "Coffee & Drinks",
  bread: "Bread",
  condiments: "Condiments",
  staples: "Staples",
  custom: "Custom",
};

export const HALL_CANTEEN_CATEGORY_EMOJI: Record<HallCanteenCategory, string> = {
  coffee_drinks: "☕",
  bread: "🍞",
  condiments: "🧂",
  staples: "🧈",
  custom: "➕",
};

export const HALL_CANTEEN_STATUS_LABELS: Record<HallCanteenStatus, string> = {
  good: "Good",
  running_low: "Running Low",
  out: "Out",
  being_picked_up: "Being Picked Up",
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
  picked_up_by_user_id: string | null;
  picked_up_by_display_name: string | null;
  picked_up_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HallCanteenPayload {
  items: HallCanteenItem[];
  needs_attention: HallCanteenItem[];
  shopping_this_week: HallCanteenItem[];
  running_low: HallCanteenItem[];
  out: HallCanteenItem[];
  needs_attention_count: number;
  my_role: HallRole;
  /** Any linked member can update item status */
  can_update: boolean;
  /** Canteen manager or captain — master list edits */
  can_manage_list: boolean;
  canteen_manager_user_id: string | null;
}

export interface HallCanteenDefaultSeed {
  name: string;
  category: Exclude<HallCanteenCategory, "custom">;
  sort_order: number;
}

export const DEFAULT_HALL_CANTEEN_ITEMS: HallCanteenDefaultSeed[] = [
  { name: "Coffee", category: "coffee_drinks", sort_order: 1 },
  { name: "Milk", category: "coffee_drinks", sort_order: 2 },
  { name: "Cream", category: "coffee_drinks", sort_order: 3 },
  { name: "Sugar", category: "coffee_drinks", sort_order: 4 },
  { name: "Tea", category: "coffee_drinks", sort_order: 5 },
  { name: "Bread", category: "bread", sort_order: 6 },
  { name: "Bagels", category: "bread", sort_order: 7 },
  { name: "Buns", category: "bread", sort_order: 8 },
  { name: "Butter", category: "staples", sort_order: 9 },
  { name: "Ketchup", category: "condiments", sort_order: 10 },
  { name: "Mustard", category: "condiments", sort_order: 11 },
  { name: "Mayonnaise", category: "condiments", sort_order: 12 },
  { name: "BBQ Sauce", category: "condiments", sort_order: 13 },
  { name: "Hot Sauce", category: "condiments", sort_order: 14 },
  { name: "Jam", category: "condiments", sort_order: 15 },
  { name: "Peanut Butter", category: "condiments", sort_order: 16 },
  { name: "Honey", category: "condiments", sort_order: 17 },
  { name: "Cooking Oil", category: "staples", sort_order: 18 },
  { name: "Salt", category: "staples", sort_order: 19 },
  { name: "Pepper", category: "staples", sort_order: 20 },
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

export function isProteinStapleName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return PROTEIN_NAMES.has(lower) || /\b(chicken|beef|pork|fish|egg)\b/i.test(lower);
}

export function isCanteenAttentionStatus(status: HallCanteenStatus): boolean {
  return status === "running_low" || status === "out";
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
  return ["coffee_drinks", "bread", "condiments", "staples", "custom"];
}

export function groupItemsByCategory(
  items: HallCanteenItem[],
): Array<{ category: HallCanteenCategory; items: HallCanteenItem[] }> {
  const map = new Map<HallCanteenCategory, HallCanteenItem[]>();
  for (const cat of categoryDisplayOrder()) {
    map.set(cat, []);
  }
  for (const item of items) {
    const bucket = map.get(item.category) ?? map.get("custom")!;
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
  };
}

/** Running Low, Out, and Being Picked Up items for the weekly pickup list. */
export function sortShoppingThisWeekItems(items: HallCanteenItem[]): HallCanteenItem[] {
  const statusOrder: Record<HallCanteenStatus, number> = {
    out: 0,
    running_low: 1,
    being_picked_up: 2,
    good: 3,
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
