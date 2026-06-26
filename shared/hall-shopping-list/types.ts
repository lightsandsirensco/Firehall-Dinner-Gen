import type { HallRole } from "../hall-membership/types.js";

export type HallShoppingListStatus = "active" | "completed";

export type HallShoppingListItemSource = "manual" | "recipe";

export interface HallShoppingListItem {
  item_id: string;
  list_id: string;
  name: string;
  quantity: string;
  section: string;
  source_kind: HallShoppingListItemSource;
  recipe_slug: string | null;
  recipe_title: string | null;
  purchased: boolean;
  added_by_user_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HallShoppingList {
  list_id: string;
  hall_id: string;
  title: string;
  status: HallShoppingListStatus;
  runner_user_id: string | null;
  runner_name: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface HallShoppingListPayload {
  list: HallShoppingList;
  items: HallShoppingListItem[];
  my_role: HallRole;
  can_contribute: boolean;
  can_complete: boolean;
}

/** Any hall member can add items. */
export function canContributeToShoppingList(_role: HallRole): boolean {
  return true;
}

/** Captain and canteen manager can assign runner, mark purchased, complete, export. */
export function canCompleteShoppingList(role: HallRole): boolean {
  return role === "captain" || role === "canteen_manager";
}
