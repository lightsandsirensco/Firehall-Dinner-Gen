/**
 * Firehall Meals Shop — native merch storefront (hats, shirts, aprons,
 * stickers). Deliberately small: a product/variant/order model, NOT a
 * generic commerce schema. Payment is Stripe-hosted Checkout only — see
 * server/shop/checkout.ts and server/billing/routes.ts (webhook is shared
 * with subscription billing, branched on Checkout Session `mode`).
 */

export type ShopPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type ShopFulfillmentStatus = "NEW" | "PROCESSING" | "SHIPPED" | "CANCELLED";

/**
 * Draft = visible to admin only (preview link). Active = live in /shop.
 * Archived = hidden from /shop but never deleted — historical orders keep
 * their product_name/variant_label snapshot regardless of this status.
 */
export type ShopProductStatus = "draft" | "active" | "archived";

export type ShopStockStatus = "in_stock" | "low_stock" | "sold_out";

/** Below this quantity a variant/product shows "Low stock" instead of "In stock". */
export const SHOP_LOW_STOCK_THRESHOLD = 5;

export function stockStatusForQty(qty: number): ShopStockStatus {
  if (qty <= 0) return "sold_out";
  if (qty <= SHOP_LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

export interface ShopProductVariant {
  id: string;
  product_id: string;
  option_label: string;
  sku: string;
  price_override_cents: number | null;
  inventory_qty: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  /** Sanitized HTML — a restricted allowlist (p/strong/ul/li/br) written by the admin's simple rich-text editor, never raw admin-typed HTML. */
  full_description: string;
  category: string;
  status: ShopProductStatus;
  base_price_cents: number;
  currency: string;
  /** Ordered gallery — index 0 is always the primary/card image. */
  image_urls: string[];
  /** Single option dimension label shown above variant values, e.g. "Size". Null when the product has no variant options. */
  option_name: string | null;
  size_guide: string | null;
  created_at: string;
  updated_at: string;
}

/** Product + its variants, as served to the storefront/product detail page and the admin editor. */
export interface ShopProductWithVariants extends ShopProduct {
  variants: ShopProductVariant[];
  /** Sum of active variants' inventory_qty. */
  total_stock: number;
  in_stock: boolean;
  stock_status: ShopStockStatus;
  /** Convenience — always `image_urls[0] ?? ""`. */
  primary_image_url: string;
}

/** Card-sized shape for the /shop grid and the admin product list — no full description/variants payload. */
export interface ShopProductSummary {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: ShopProductStatus;
  primary_image_url: string;
  price_cents: number;
  currency: string;
  total_stock: number;
  in_stock: boolean;
  stock_status: ShopStockStatus;
}

export interface ShopOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  variant_label: string | null;
  sku: string | null;
  quantity: number;
  unit_price_cents: number;
}

export interface ShopOrder {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_email: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  payment_status: ShopPaymentStatus;
  fulfillment_status: ShopFulfillmentStatus;
  shipping_name: string | null;
  shipping_address: Record<string, unknown> | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopOrderWithItems extends ShopOrder {
  items: ShopOrderItem[];
}

/** Safe, public-facing confirmation payload — no Stripe ids, no raw payment data. */
export interface ShopOrderConfirmation {
  order_number: string;
  customer_email: string;
  total_cents: number;
  currency: string;
  items: Array<{ product_name: string; variant_label: string | null; quantity: number }>;
}
