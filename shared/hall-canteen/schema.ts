import { z } from "zod";
import { HALL_CANTEEN_CATEGORIES, HALL_CANTEEN_STATUSES } from "./types.js";

export const setCanteenItemStatusSchema = z.object({
  status: z.enum(HALL_CANTEEN_STATUSES).optional(),
  archived: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
  category: z.enum(HALL_CANTEEN_CATEGORIES).optional(),
  sort_order: z.number().int().optional(),
});

export const addCanteenItemSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(HALL_CANTEEN_CATEGORIES).optional(),
});

export const reportCanteenItemSchema = z.object({
  item_id: z.string().min(1).optional(),
  name: z.string().min(1).max(120).optional(),
  category: z.enum(HALL_CANTEEN_CATEGORIES).optional(),
  status: z.enum(HALL_CANTEEN_STATUSES),
});
