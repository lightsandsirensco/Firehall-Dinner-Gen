import { z } from "zod";

/**
 * Client submits ONLY identifiers + quantity — server resolves real
 * price/stock. Every product has at least one variant row (e.g. a hat with
 * no size options still gets a single "One Size" variant), so variant_id is
 * always required — there is no separate "no variant" checkout path.
 */
export const createShopCheckoutSchema = z.object({
  product_id: z.string().trim().min(1).max(64),
  variant_id: z.string().trim().min(1).max(64),
  quantity: z.number().int().min(1).max(20),
});

export const shopProductStatusSchema = z.enum(["draft", "active", "archived"]);

export const adminCreateShopProductSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  name: z.string().trim().min(1).max(160),
  short_description: z.string().trim().max(280).default(""),
  // Sanitized server-side to a strict allowlist regardless of what's submitted — see server/shop/sanitize-html.ts.
  full_description: z.string().max(8000).default(""),
  category: z.string().trim().min(1).max(60),
  base_price_cents: z.number().int().min(0).max(10_000_00),
  currency: z.string().trim().toLowerCase().length(3).default("cad"),
  image_urls: z.array(z.string().trim().url().max(2000)).max(8).default([]),
  option_name: z.string().trim().max(40).nullable().optional(),
  size_guide: z.string().trim().max(4000).nullable().optional(),
  status: shopProductStatusSchema.default("draft"),
});

export const adminUpdateShopProductSchema = adminCreateShopProductSchema.partial();

export const adminDuplicateShopProductSchema = z.object({
  new_slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only")
    .optional(),
});

export const adminCreateShopVariantSchema = z.object({
  option_label: z.string().trim().min(1).max(80),
  sku: z.string().trim().min(1).max(80),
  price_override_cents: z.number().int().min(0).max(10_000_00).nullable().optional(),
  inventory_qty: z.number().int().min(0).max(100_000).default(0),
  active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(1000).default(0),
});

export const adminUpdateShopVariantSchema = adminCreateShopVariantSchema.partial();

export const adminUpdateShopOrderSchema = z.object({
  fulfillment_status: z.enum(["NEW", "PROCESSING", "SHIPPED", "CANCELLED"]).optional(),
  tracking_number: z.string().trim().max(120).nullable().optional(),
  tracking_carrier: z.string().trim().max(80).nullable().optional(),
});
