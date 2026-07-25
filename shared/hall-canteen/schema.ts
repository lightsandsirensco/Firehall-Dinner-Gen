import { z } from "zod";
import {
  HALL_CANTEEN_CATEGORIES,
  HALL_CANTEEN_LEGACY_CATEGORIES,
  HALL_CANTEEN_MEMBER_STATUSES,
  HALL_CANTEEN_STATUSES,
} from "./types.js";

const categorySchema = z.enum([
  ...HALL_CANTEEN_CATEGORIES,
  ...HALL_CANTEEN_LEGACY_CATEGORIES,
] as unknown as [string, ...string[]]);

export const setCanteenItemStatusSchema = z.object({
  status: z.enum(HALL_CANTEEN_STATUSES).optional(),
  archived: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
  category: categorySchema.optional(),
  sort_order: z.number().int().optional(),
  note: z.string().max(500).nullable().optional(),
  preferred_brand: z.string().max(120).nullable().optional(),
  package_size: z.string().max(80).nullable().optional(),
  par_level: z.number().nonnegative().nullable().optional(),
  estimated_qty: z.number().nonnegative().nullable().optional(),
  reorder_qty: z.number().positive().optional(),
  storage_location: z.string().max(120).nullable().optional(),
  preferred_retailer: z.string().max(80).nullable().optional(),
  costco_search_term: z.string().max(160).nullable().optional(),
  product_url: z.string().url().max(500).nullable().optional(),
  recurrence: z
    .enum(["none", "always_check_weekly", "weekly", "biweekly", "monthly"])
    .optional(),
});

export const addCanteenItemSchema = z.object({
  name: z.string().min(1).max(120),
  category: categorySchema.optional(),
  preferred_brand: z.string().max(120).optional(),
  package_size: z.string().max(80).optional(),
  reorder_qty: z.number().positive().optional(),
  costco_search_term: z.string().max(160).optional(),
  product_url: z.string().url().max(500).optional(),
  preferred_retailer: z.string().max(80).optional(),
});

export const reportCanteenItemSchema = z.object({
  item_id: z.string().min(1).optional(),
  name: z.string().min(1).max(120).optional(),
  category: categorySchema.optional(),
  status: z.enum(HALL_CANTEEN_MEMBER_STATUSES),
  note: z.string().max(280).optional(),
});

export const suggestCanteenStapleSchema = z.object({
  name: z.string().min(1).max(120),
  category: categorySchema.optional(),
  note: z.string().max(280).optional(),
});

export const reviewSuggestionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  category: categorySchema.optional(),
});

export const addToWeeklyOrderSchema = z.object({
  item_id: z.string().min(1),
  requested_qty: z.number().positive().optional(),
  notes: z.string().max(280).optional(),
});

export const updateOrderItemSchema = z.object({
  requested_qty: z.number().positive().optional(),
  notes: z.string().max(280).nullable().optional(),
  status: z
    .enum([
      "needed",
      "buying_this",
      "added_to_costco",
      "ordered",
      "delivered",
      "unavailable",
      "substituted",
    ])
    .optional(),
  substitute_name: z.string().max(120).nullable().optional(),
  assigned_buyer_user_id: z.string().min(1).nullable().optional(),
  estimated_price_cents: z.number().int().nonnegative().nullable().optional(),
});

export const recordOrderCheckoutSchema = z.object({
  retailer: z.string().max(80).optional(),
  external_order_number: z.string().max(120).optional(),
  ordered_at: z.string().optional(),
  scheduled_delivery_date: z.string().optional(),
  scheduled_delivery_window: z.string().max(120).optional(),
  subtotal_cents: z.number().int().nonnegative().optional(),
  delivery_fee_cents: z.number().int().nonnegative().optional(),
  tax_cents: z.number().int().nonnegative().optional(),
  tip_cents: z.number().int().nonnegative().optional(),
  total_cents: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
  status: z
    .enum(["draft", "submitted", "being_shopped", "out_for_delivery", "delivered", "cancelled"])
    .optional(),
});

export const receiveOrderItemSchema = z.object({
  receive_status: z.enum([
    "received_full",
    "partial",
    "substituted",
    "missing",
    "damaged",
  ]),
  received_qty: z.number().nonnegative().optional(),
  substitute_name: z.string().max(120).optional(),
});

export const managerNoteSchema = z.object({
  body: z.string().min(1).max(500),
  sort_order: z.number().int().optional(),
});
