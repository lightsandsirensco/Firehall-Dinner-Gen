import { apiRequest } from "@/lib/queryClient";
import { getPantryProfile } from "@/lib/shopping/shopping-store";
import { getHallPantry } from "@/lib/shopping/hall-pantry-store";
import type { ShiftListOp } from "@shared/shift-plan/shopping";
import type { ShiftShoppingListResponse } from "@shared/shift-plan/types";

export const shiftListQueryKey = ["/api/shift-plan/shopping-list"] as const;

export async function fetchShiftList(): Promise<ShiftShoppingListResponse> {
  const res = await apiRequest("GET", "/api/shift-plan/shopping-list");
  return res.json();
}

/** Build or refresh the shift's list, matched against this device's Personal + Hall Pantry. */
export async function openShiftList(shiftKey: string): Promise<ShiftShoppingListResponse> {
  const res = await apiRequest("POST", "/api/shift-plan/shopping-list", {
    shiftKey,
    pantry: { personal: getPantryProfile(), hall: getHallPantry() },
  });
  return res.json();
}

export async function sendShiftListOp(shiftKey: string, op: ShiftListOp): Promise<ShiftShoppingListResponse> {
  const res = await apiRequest("POST", "/api/shift-plan/shopping-list/op", { shiftKey, op });
  return res.json();
}
