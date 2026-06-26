import type { SqliteDatabase } from "../sqlite.js";

import type {

  HallSuppliesPayload,

  HallSupplyItem,

  HallSupplyStatus,

} from "../../shared/hall-supplies/types.js";

import type { HallCanteenItem, HallCanteenPayload } from "../../shared/hall-canteen/types.js";

import {

  addDefaultCanteenItem,

  bindHallCanteenDb,

  buildCanteenPayload,

  getOrSeedHallCanteen,

  initHallCanteenStore,

  setCanteenItemStatus,

  reportCanteenItem,

} from "../hall-canteen/store.js";



export async function initHallSuppliesStore(): Promise<void> {

  await initHallCanteenStore();

}



export function bindHallSuppliesDb(database: SqliteDatabase): void {

  bindHallCanteenDb(database);

}



function mapStatusToLegacy(status: string): HallSupplyStatus {

  if (status === "running_low") return "low";

  return status as HallSupplyStatus;

}



function mapItemToLegacy(item: HallCanteenItem): HallSupplyItem {

  return {

    supply_id: item.item_id,

    hall_id: item.hall_id,

    name: item.name,

    category: item.category,

    status: mapStatusToLegacy(item.status),

    is_default: item.is_default,

    sort_order: item.sort_order,

    last_updated_by_user_id: null,

    created_at: item.created_at,

    updated_at: item.updated_at,

  };

}



function mapPayloadToLegacy(payload: HallCanteenPayload): HallSuppliesPayload {

  const items = payload.items.map(mapItemToLegacy);

  return {

    items,

    shortages: items.filter((item) => item.status === "low" || item.status === "out"),

    my_role: payload.my_role,

    can_manage: payload.can_update,

    can_report_shortage: payload.can_update,

  };

}



export function buildPayload(hallId: string, userId: string): HallSuppliesPayload | null {

  const payload = buildCanteenPayload(hallId, userId);

  return payload ? mapPayloadToLegacy(payload) : null;

}



export function getOrSeedHallSupplies(hallId: string, userId: string): HallSuppliesPayload | null {

  const payload = getOrSeedHallCanteen(hallId, userId);

  return payload ? mapPayloadToLegacy(payload) : null;

}



export function updateSupplyStatus(

  hallId: string,

  userId: string,

  supplyId: string,

  status: HallSupplyStatus,

): { payload: HallSuppliesPayload; restocked: boolean } | null {

  const canteenStatus =

    status === "low" ? "running_low" : status === "good" ? "good" : status === "out" ? "out" : "good";



  const result = setCanteenItemStatus(hallId, userId, supplyId, canteenStatus);

  if (!result) return null;

  return {

    payload: mapPayloadToLegacy(result.payload),

    restocked: canteenStatus === "good",

  };

}



export function addCustomSupply(

  hallId: string,

  userId: string,

  input: { name: string; category?: string },

): HallSuppliesPayload | null {

  const payload = addDefaultCanteenItem(hallId, userId, {

    name: input.name,

    category: (input.category as HallCanteenItem["category"]) ?? "custom",

  });

  return payload ? mapPayloadToLegacy(payload) : null;

}



export { reportCanteenItem };


