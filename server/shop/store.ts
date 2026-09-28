/**
 * Firehall Meals Shop — Postgres-backed store for products, variants, and
 * orders. Raw parameterized SQL via server/db/pg-sql.ts (same pattern as
 * server/billing/store.ts) — no query builder, no ORM.
 */
import { nanoid } from "nanoid";
import { pgAll, pgOne, pgRun, pgTx } from "../db/pg-sql.js";
import { sanitizeShopDescriptionHtml } from "./sanitize-html.js";
import {
  stockStatusForQty,
  type ShopFulfillmentStatus,
  type ShopOrder,
  type ShopOrderConfirmation,
  type ShopOrderItem,
  type ShopOrderWithItems,
  type ShopProduct,
  type ShopProductStatus,
  type ShopProductSummary,
  type ShopProductVariant,
  type ShopProductWithVariants,
} from "../../shared/shop/types.js";

function iso(value: unknown): string {
  if (value == null) return new Date(0).toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function isoOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function parseJsonArray(value: unknown): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function rowToProduct(row: Record<string, unknown>): ShopProduct {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    short_description: String(row.short_description ?? ""),
    full_description: String(row.full_description ?? ""),
    category: String(row.category),
    status: (row.status as ShopProductStatus) ?? "draft",
    base_price_cents: Number(row.base_price_cents),
    currency: String(row.currency ?? "cad"),
    image_urls: parseJsonArray(row.image_urls),
    option_name: row.option_name != null && String(row.option_name).trim() !== "" ? String(row.option_name) : null,
    size_guide: row.size_guide != null ? String(row.size_guide) : null,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  };
}

function rowToVariant(row: Record<string, unknown>): ShopProductVariant {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    option_label: String(row.option_label),
    sku: String(row.sku),
    price_override_cents: row.price_override_cents != null ? Number(row.price_override_cents) : null,
    inventory_qty: Number(row.inventory_qty),
    active: Number(row.active) === 1,
    sort_order: Number(row.sort_order),
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  };
}

function rowToOrder(row: Record<string, unknown>): ShopOrder {
  return {
    id: String(row.id),
    order_number: String(row.order_number),
    user_id: row.user_id != null ? String(row.user_id) : null,
    customer_email: String(row.customer_email),
    stripe_checkout_session_id: String(row.stripe_checkout_session_id),
    stripe_payment_intent_id: row.stripe_payment_intent_id != null ? String(row.stripe_payment_intent_id) : null,
    subtotal_cents: Number(row.subtotal_cents),
    shipping_cents: Number(row.shipping_cents),
    tax_cents: Number(row.tax_cents),
    total_cents: Number(row.total_cents),
    currency: String(row.currency ?? "cad"),
    payment_status: row.payment_status as ShopOrder["payment_status"],
    fulfillment_status: row.fulfillment_status as ShopOrder["fulfillment_status"],
    shipping_name: row.shipping_name != null ? String(row.shipping_name) : null,
    shipping_address: row.shipping_address ? JSON.parse(String(row.shipping_address)) : null,
    tracking_number: row.tracking_number != null ? String(row.tracking_number) : null,
    tracking_carrier: row.tracking_carrier != null ? String(row.tracking_carrier) : null,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  };
}

function rowToOrderItem(row: Record<string, unknown>): ShopOrderItem {
  return {
    id: String(row.id),
    order_id: String(row.order_id),
    product_id: String(row.product_id),
    product_name: String(row.product_name),
    variant_label: row.variant_label != null ? String(row.variant_label) : null,
    sku: row.sku != null ? String(row.sku) : null,
    quantity: Number(row.quantity),
    unit_price_cents: Number(row.unit_price_cents),
  };
}

function effectivePriceCents(product: ShopProduct, variant: ShopProductVariant | null): number {
  if (variant?.price_override_cents != null) return variant.price_override_cents;
  return product.base_price_cents;
}

function withVariants(product: ShopProduct, variants: ShopProductVariant[]): ShopProductWithVariants {
  const activeVariants = variants.filter((v) => v.active);
  const total_stock = activeVariants.reduce((sum, v) => sum + v.inventory_qty, 0);
  return {
    ...product,
    variants,
    total_stock,
    in_stock: total_stock > 0,
    stock_status: stockStatusForQty(total_stock),
    primary_image_url: product.image_urls[0] ?? "",
  };
}

// ---------------------------------------------------------------------------
// Storefront (public) reads
// ---------------------------------------------------------------------------

/** /shop grid — active products only, cheapest active-variant price, in-stock state. */
export async function listActiveProductSummaries(): Promise<ShopProductSummary[]> {
  const products = await pgAll<Record<string, unknown>>(
    `SELECT * FROM shop_products WHERE status = 'active' ORDER BY created_at DESC`,
  );
  const variantRows = await pgAll<Record<string, unknown>>(
    `SELECT * FROM shop_product_variants WHERE active = 1 ORDER BY sort_order ASC`,
  );
  const variantsByProduct = new Map<string, ShopProductVariant[]>();
  for (const row of variantRows) {
    const v = rowToVariant(row);
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  return products.map((row) => {
    const product = rowToProduct(row);
    const variants = variantsByProduct.get(product.id) ?? [];
    const total_stock = variants.reduce((sum, v) => sum + v.inventory_qty, 0);
    const prices = variants.map((v) => effectivePriceCents(product, v));
    const price_cents = prices.length > 0 ? Math.min(...prices) : product.base_price_cents;
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      status: product.status,
      primary_image_url: product.image_urls[0] ?? "",
      price_cents,
      currency: product.currency,
      total_stock,
      in_stock: total_stock > 0,
      stock_status: stockStatusForQty(total_stock),
    };
  });
}

/**
 * /shop/:slug product detail. Active products are public; draft/archived
 * products are only returned when `allowUnpublished` is true — that flag is
 * set exclusively by the admin-authenticated preview route in
 * server/shop/routes.ts, never by the plain public request path.
 */
export async function getProductBySlugForDetail(
  slug: string,
  allowUnpublished: boolean,
): Promise<ShopProductWithVariants | null> {
  const row = await pgOne<Record<string, unknown>>(`SELECT * FROM shop_products WHERE slug = $1`, [slug]);
  if (!row) return null;
  const product = rowToProduct(row);
  if (product.status !== "active" && !allowUnpublished) return null;
  const variantRows = await pgAll<Record<string, unknown>>(
    `SELECT * FROM shop_product_variants WHERE product_id = $1 AND active = 1 ORDER BY sort_order ASC`,
    [product.id],
  );
  return withVariants(product, variantRows.map(rowToVariant));
}

// ---------------------------------------------------------------------------
// Checkout-time resolution — NEVER trust client-submitted price/stock.
// ---------------------------------------------------------------------------

export interface ResolvedCheckoutLine {
  product: ShopProduct;
  variant: ShopProductVariant;
  unit_price_cents: number;
}

export async function resolveProductVariantForCheckout(
  productId: string,
  variantId: string,
): Promise<ResolvedCheckoutLine | null> {
  const productRow = await pgOne<Record<string, unknown>>(
    `SELECT * FROM shop_products WHERE id = $1 AND status = 'active'`,
    [productId],
  );
  if (!productRow) return null;
  const variantRow = await pgOne<Record<string, unknown>>(
    `SELECT * FROM shop_product_variants WHERE id = $1 AND product_id = $2 AND active = 1`,
    [variantId, productId],
  );
  if (!variantRow) return null;

  const product = rowToProduct(productRow);
  const variant = rowToVariant(variantRow);
  return { product, variant, unit_price_cents: effectivePriceCents(product, variant) };
}

// ---------------------------------------------------------------------------
// Order finalization (webhook-driven — see server/shop/webhook.ts)
// ---------------------------------------------------------------------------

export interface FinalizeOrderInput {
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  userId: string | null;
  customerEmail: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  shippingName: string | null;
  shippingAddress: Record<string, unknown> | null;
  items: Array<{ productId: string; variantId: string; quantity: number }>;
}

/**
 * Idempotent order finalization: resolves each line item's current
 * product/variant snapshot, decrements stock (never below zero), and
 * inserts the order + items in one transaction. Safe to call twice for the
 * same session — the unique constraint on stripe_checkout_session_id makes
 * the second call a no-op that returns the already-created order.
 */
export async function finalizeShopOrder(input: FinalizeOrderInput): Promise<ShopOrderWithItems | null> {
  const existing = await getOrderByCheckoutSessionId(input.stripeCheckoutSessionId);
  if (existing) return existing;

  const orderId = nanoid(16);

  return pgTx(async (exec) => {
    const numberRow = await exec.one<{ n: number }>(`SELECT nextval('shop_order_number_seq') AS n`);
    const orderNumber = `FH-${numberRow?.n ?? Date.now()}`;

    const inserted = await exec.one<Record<string, unknown>>(
      `INSERT INTO shop_orders (
         id, order_number, user_id, customer_email, stripe_checkout_session_id,
         stripe_payment_intent_id, subtotal_cents, shipping_cents, tax_cents, total_cents,
         currency, payment_status, fulfillment_status, shipping_name, shipping_address
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'paid','NEW',$12,$13)
       ON CONFLICT (stripe_checkout_session_id) DO NOTHING
       RETURNING *`,
      [
        orderId,
        orderNumber,
        input.userId,
        input.customerEmail,
        input.stripeCheckoutSessionId,
        input.stripePaymentIntentId,
        input.subtotalCents,
        input.shippingCents,
        input.taxCents,
        input.totalCents,
        input.currency,
        input.shippingName,
        input.shippingAddress ? JSON.stringify(input.shippingAddress) : null,
      ],
    );

    // Lost the ON CONFLICT race against a concurrent duplicate webhook delivery.
    if (!inserted) {
      const already = await exec.one<Record<string, unknown>>(
        `SELECT * FROM shop_orders WHERE stripe_checkout_session_id = $1`,
        [input.stripeCheckoutSessionId],
      );
      return already ? { ...rowToOrder(already), items: [] } : null;
    }

    const items: ShopOrderItem[] = [];
    for (const line of input.items) {
      const productRow = await exec.one<Record<string, unknown>>(
        `SELECT * FROM shop_products WHERE id = $1`,
        [line.productId],
      );
      const variantRow = await exec.one<Record<string, unknown>>(
        `SELECT * FROM shop_product_variants WHERE id = $1`,
        [line.variantId],
      );
      if (!productRow || !variantRow) continue;
      const product = rowToProduct(productRow);
      const variant = rowToVariant(variantRow);
      const unitPrice = effectivePriceCents(product, variant);

      // Decrement stock atomically, never below zero — overselling safety net
      // (pre-checkout quantity validation already ran in createShopCheckoutSession).
      await exec.run(
        `UPDATE shop_product_variants
         SET inventory_qty = GREATEST(inventory_qty - $2, 0), updated_at = now()
         WHERE id = $1`,
        [variant.id, line.quantity],
      );

      const itemId = nanoid(16);
      await exec.run(
        `INSERT INTO shop_order_items (
           id, order_id, product_id, product_name, variant_label, sku, quantity, unit_price_cents
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [itemId, orderId, product.id, product.name, variant.option_label, variant.sku, line.quantity, unitPrice],
      );
      items.push({
        id: itemId,
        order_id: orderId,
        product_id: product.id,
        product_name: product.name,
        variant_label: variant.option_label,
        sku: variant.sku,
        quantity: line.quantity,
        unit_price_cents: unitPrice,
      });
    }

    return { ...rowToOrder(inserted), items };
  });
}

export async function getOrderByCheckoutSessionId(sessionId: string): Promise<ShopOrderWithItems | null> {
  const row = await pgOne<Record<string, unknown>>(
    `SELECT * FROM shop_orders WHERE stripe_checkout_session_id = $1`,
    [sessionId],
  );
  if (!row) return null;
  const items = await pgAll<Record<string, unknown>>(
    `SELECT * FROM shop_order_items WHERE order_id = $1 ORDER BY id ASC`,
    [row.id],
  );
  return { ...rowToOrder(row), items: items.map(rowToOrderItem) };
}

/** Safe, minimal shape for the public order-success page — no Stripe ids, no address. */
export function toOrderConfirmation(order: ShopOrderWithItems): ShopOrderConfirmation {
  return {
    order_number: order.order_number,
    customer_email: order.customer_email,
    total_cents: order.total_cents,
    currency: order.currency,
    items: order.items.map((i) => ({
      product_name: i.product_name,
      variant_label: i.variant_label,
      quantity: i.quantity,
    })),
  };
}

// ---------------------------------------------------------------------------
// Admin — products & variants
// ---------------------------------------------------------------------------

/** Admin product list — every status, thumbnail-card shape (no variants payload). */
export async function adminListProductSummaries(): Promise<ShopProductSummary[]> {
  const products = await pgAll<Record<string, unknown>>(`SELECT * FROM shop_products ORDER BY created_at DESC`);
  const variantRows = await pgAll<Record<string, unknown>>(
    `SELECT * FROM shop_product_variants WHERE active = 1 ORDER BY sort_order ASC`,
  );
  const byProduct = new Map<string, ShopProductVariant[]>();
  for (const row of variantRows) {
    const v = rowToVariant(row);
    const list = byProduct.get(v.product_id) ?? [];
    list.push(v);
    byProduct.set(v.product_id, list);
  }
  return products.map((row) => {
    const product = rowToProduct(row);
    const variants = byProduct.get(product.id) ?? [];
    const total_stock = variants.reduce((sum, v) => sum + v.inventory_qty, 0);
    const prices = variants.map((v) => effectivePriceCents(product, v));
    const price_cents = prices.length > 0 ? Math.min(...prices) : product.base_price_cents;
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      status: product.status,
      primary_image_url: product.image_urls[0] ?? "",
      price_cents,
      currency: product.currency,
      total_stock,
      in_stock: total_stock > 0,
      stock_status: stockStatusForQty(total_stock),
    };
  });
}

export async function adminGetProductById(productId: string): Promise<ShopProductWithVariants | null> {
  const row = await pgOne<Record<string, unknown>>(`SELECT * FROM shop_products WHERE id = $1`, [productId]);
  if (!row) return null;
  const product = rowToProduct(row);
  const variantRows = await pgAll<Record<string, unknown>>(
    `SELECT * FROM shop_product_variants WHERE product_id = $1 ORDER BY sort_order ASC`,
    [product.id],
  );
  return withVariants(product, variantRows.map(rowToVariant));
}

export interface AdminProductInput {
  slug: string;
  name: string;
  short_description: string;
  full_description: string;
  category: string;
  base_price_cents: number;
  currency: string;
  image_urls: string[];
  option_name?: string | null;
  size_guide?: string | null;
  status: ShopProductStatus;
}

export async function adminCreateProduct(input: AdminProductInput): Promise<ShopProduct> {
  const id = nanoid(16);
  const row = await pgOne<Record<string, unknown>>(
    `INSERT INTO shop_products (
       id, slug, name, short_description, full_description, category, status,
       base_price_cents, currency, image_urls, option_name, size_guide
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      id,
      input.slug,
      input.name,
      input.short_description,
      sanitizeShopDescriptionHtml(input.full_description),
      input.category,
      input.status,
      input.base_price_cents,
      input.currency,
      JSON.stringify(input.image_urls),
      input.option_name || null,
      input.size_guide ?? null,
    ],
  );
  return rowToProduct(row!);
}

export async function adminUpdateProduct(
  productId: string,
  input: Partial<AdminProductInput>,
): Promise<ShopProduct | null> {
  const existingRow = await pgOne<Record<string, unknown>>(`SELECT * FROM shop_products WHERE id = $1`, [
    productId,
  ]);
  if (!existingRow) return null;
  const existing = rowToProduct(existingRow);
  const merged: AdminProductInput = {
    slug: input.slug ?? existing.slug,
    name: input.name ?? existing.name,
    short_description: input.short_description ?? existing.short_description,
    full_description: input.full_description ?? existing.full_description,
    category: input.category ?? existing.category,
    base_price_cents: input.base_price_cents ?? existing.base_price_cents,
    currency: input.currency ?? existing.currency,
    image_urls: input.image_urls ?? existing.image_urls,
    option_name: input.option_name !== undefined ? input.option_name : existing.option_name,
    size_guide: input.size_guide !== undefined ? input.size_guide : existing.size_guide,
    status: input.status ?? existing.status,
  };
  const row = await pgOne<Record<string, unknown>>(
    `UPDATE shop_products SET
       slug=$2, name=$3, short_description=$4, full_description=$5, category=$6, status=$7,
       base_price_cents=$8, currency=$9, image_urls=$10, option_name=$11, size_guide=$12, updated_at=now()
     WHERE id=$1
     RETURNING *`,
    [
      productId,
      merged.slug,
      merged.name,
      merged.short_description,
      sanitizeShopDescriptionHtml(merged.full_description),
      merged.category,
      merged.status,
      merged.base_price_cents,
      merged.currency,
      JSON.stringify(merged.image_urls),
      merged.option_name || null,
      merged.size_guide ?? null,
    ],
  );
  return row ? rowToProduct(row) : null;
}

/**
 * Duplicate Product — new DRAFT copy of title/descriptions/category/price/
 * variants. Inventory is intentionally NOT copied (starts at 0 per variant)
 * so a duplicated listing can't accidentally go live oversold; SKUs get a
 * "-COPY" suffix since they're globally unique.
 */
export async function adminDuplicateProduct(
  productId: string,
  newSlug?: string,
): Promise<ShopProductWithVariants | null> {
  const source = await adminGetProductById(productId);
  if (!source) return null;

  const slug = newSlug || `${source.slug}-copy-${nanoid(6).toLowerCase()}`;
  const copy = await adminCreateProduct({
    slug,
    name: `${source.name} (Copy)`,
    short_description: source.short_description,
    full_description: source.full_description,
    category: source.category,
    base_price_cents: source.base_price_cents,
    currency: source.currency,
    image_urls: source.image_urls,
    option_name: source.option_name,
    size_guide: source.size_guide,
    status: "draft",
  });

  for (const v of source.variants) {
    await adminCreateVariant(copy.id, {
      option_label: v.option_label,
      sku: `${v.sku}-COPY-${nanoid(4).toUpperCase()}`,
      price_override_cents: v.price_override_cents,
      inventory_qty: 0,
      active: v.active,
      sort_order: v.sort_order,
    });
  }

  return adminGetProductById(copy.id);
}

export interface AdminVariantInput {
  option_label: string;
  sku: string;
  price_override_cents: number | null;
  inventory_qty: number;
  active: boolean;
  sort_order: number;
}

export async function adminCreateVariant(
  productId: string,
  input: AdminVariantInput,
): Promise<ShopProductVariant | null> {
  const product = await pgOne(`SELECT id FROM shop_products WHERE id = $1`, [productId]);
  if (!product) return null;
  const id = nanoid(16);
  const row = await pgOne<Record<string, unknown>>(
    `INSERT INTO shop_product_variants (
       id, product_id, option_label, sku, price_override_cents, inventory_qty, active, sort_order
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      id,
      productId,
      input.option_label,
      input.sku,
      input.price_override_cents,
      input.inventory_qty,
      input.active ? 1 : 0,
      input.sort_order,
    ],
  );
  return row ? rowToVariant(row) : null;
}

export async function adminUpdateVariant(
  variantId: string,
  input: Partial<AdminVariantInput>,
): Promise<ShopProductVariant | null> {
  const existingRow = await pgOne<Record<string, unknown>>(
    `SELECT * FROM shop_product_variants WHERE id = $1`,
    [variantId],
  );
  if (!existingRow) return null;
  const existing = rowToVariant(existingRow);
  const merged: AdminVariantInput = {
    option_label: input.option_label ?? existing.option_label,
    sku: input.sku ?? existing.sku,
    price_override_cents:
      input.price_override_cents !== undefined ? input.price_override_cents : existing.price_override_cents,
    inventory_qty: input.inventory_qty ?? existing.inventory_qty,
    active: input.active ?? existing.active,
    sort_order: input.sort_order ?? existing.sort_order,
  };
  const row = await pgOne<Record<string, unknown>>(
    `UPDATE shop_product_variants SET
       option_label=$2, sku=$3, price_override_cents=$4, inventory_qty=$5, active=$6, sort_order=$7,
       updated_at=now()
     WHERE id=$1
     RETURNING *`,
    [
      variantId,
      merged.option_label,
      merged.sku,
      merged.price_override_cents,
      merged.inventory_qty,
      merged.active ? 1 : 0,
      merged.sort_order,
    ],
  );
  return row ? rowToVariant(row) : null;
}

/** Hard delete — safe because shop_order_items snapshots variant_label/sku as plain text, no FK. */
export async function adminDeleteVariant(variantId: string): Promise<boolean> {
  const existing = await pgOne(`SELECT id FROM shop_product_variants WHERE id = $1`, [variantId]);
  if (!existing) return false;
  await pgRun(`DELETE FROM shop_product_variants WHERE id = $1`, [variantId]);
  return true;
}

// ---------------------------------------------------------------------------
// Admin — orders
// ---------------------------------------------------------------------------

export async function adminListOrders(limit = 200): Promise<ShopOrderWithItems[]> {
  const orders = await pgAll<Record<string, unknown>>(
    `SELECT * FROM shop_orders ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  if (orders.length === 0) return [];
  const orderIds = orders.map((o) => String(o.id));
  const items = await pgAll<Record<string, unknown>>(
    `SELECT * FROM shop_order_items WHERE order_id = ANY($1::text[]) ORDER BY id ASC`,
    [orderIds],
  );
  const itemsByOrder = new Map<string, ShopOrderItem[]>();
  for (const row of items) {
    const item = rowToOrderItem(row);
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }
  return orders.map((row) => ({ ...rowToOrder(row), items: itemsByOrder.get(String(row.id)) ?? [] }));
}

export async function adminUpdateOrderFulfillment(
  orderId: string,
  input: {
    fulfillment_status?: ShopFulfillmentStatus;
    tracking_number?: string | null;
    tracking_carrier?: string | null;
  },
): Promise<ShopOrderWithItems | null> {
  const existingRow = await pgOne<Record<string, unknown>>(`SELECT * FROM shop_orders WHERE id = $1`, [orderId]);
  if (!existingRow) return null;
  const existing = rowToOrder(existingRow);
  const fulfillment_status = input.fulfillment_status ?? existing.fulfillment_status;
  const tracking_number = input.tracking_number !== undefined ? input.tracking_number : existing.tracking_number;
  const tracking_carrier =
    input.tracking_carrier !== undefined ? input.tracking_carrier : existing.tracking_carrier;

  await pgRun(
    `UPDATE shop_orders SET fulfillment_status=$2, tracking_number=$3, tracking_carrier=$4, updated_at=now()
     WHERE id=$1`,
    [orderId, fulfillment_status, tracking_number, tracking_carrier],
  );

  return getOrderById(orderId);
}

export async function getOrderById(orderId: string): Promise<ShopOrderWithItems | null> {
  const row = await pgOne<Record<string, unknown>>(`SELECT * FROM shop_orders WHERE id = $1`, [orderId]);
  if (!row) return null;
  const items = await pgAll<Record<string, unknown>>(
    `SELECT * FROM shop_order_items WHERE order_id = $1 ORDER BY id ASC`,
    [orderId],
  );
  return { ...rowToOrder(row), items: items.map(rowToOrderItem) };
}
