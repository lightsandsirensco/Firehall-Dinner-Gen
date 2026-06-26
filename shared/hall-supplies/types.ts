import type { HallRole } from "../hall-membership/types.js";



export const HALL_SUPPLY_CATEGORIES = [

  "coffee_drinks",

  "bread",

  "condiments",

  "staples",

  "custom",

] as const;

export type HallSupplyCategory = (typeof HALL_SUPPLY_CATEGORIES)[number];



export const HALL_SUPPLY_STATUSES = ["good", "low", "out"] as const;

export type HallSupplyStatus = (typeof HALL_SUPPLY_STATUSES)[number];



export const HALL_SUPPLY_CATEGORY_LABELS: Record<HallSupplyCategory, string> = {

  coffee_drinks: "Coffee & Drinks",

  bread: "Bread",

  condiments: "Condiments",

  staples: "Staples",

  custom: "Custom",

};



export const HALL_SUPPLY_STATUS_LABELS: Record<HallSupplyStatus, string> = {

  good: "Good",

  low: "Running Low",

  out: "Out",

};



export interface HallSupplyItem {

  supply_id: string;

  hall_id: string;

  name: string;

  category: HallSupplyCategory;

  status: HallSupplyStatus;

  is_default: boolean;

  sort_order: number;

  last_updated_by_user_id: string | null;

  created_at: string;

  updated_at: string;

}



export interface HallSuppliesPayload {

  items: HallSupplyItem[];

  shortages: HallSupplyItem[];

  my_role: HallRole;

  can_manage: boolean;

  can_report_shortage: boolean;

}



/** Any hall member can report low or out. */

export function canReportSupplyShortage(_role: HallRole): boolean {

  return true;

}



export function canManageSuppliesRestock(_role: HallRole): boolean {

  return true;

}



export function canSetSupplyStatus(_role: HallRole, _status: HallSupplyStatus): boolean {

  return true;

}



export function isSupplyShortage(status: HallSupplyStatus): boolean {

  return status === "low" || status === "out";

}


