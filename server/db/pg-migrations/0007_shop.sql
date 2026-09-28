-- Firehall Meals Shop — MVP native merch storefront (hats, shirts, aprons,
-- stickers). Small, deliberately non-generic commerce schema: products,
-- variants (every product has >=1 variant row — even "one size" items),
-- orders, and order item snapshots. Payment goes through Stripe-hosted
-- Checkout (mode: "payment") — see server/shop/checkout.ts. Webhook
-- finalization reuses the existing stripe_webhook_events idempotency table
-- from 0001_init.sql (billing) rather than duplicating it.
--
-- Conventions match 0001_init.sql: booleans are INTEGER 0/1, JSON payloads
-- are TEXT, timestamps are TIMESTAMPTZ.

CREATE TABLE IF NOT EXISTS shop_products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  base_price_cents INTEGER NOT NULL CHECK (base_price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'cad',
  primary_image_url TEXT NOT NULL,
  additional_image_urls TEXT NOT NULL DEFAULT '[]',
  size_guide TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_products_active ON shop_products(active, category);

CREATE TABLE IF NOT EXISTS shop_product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  option_label TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  price_override_cents INTEGER CHECK (price_override_cents IS NULL OR price_override_cents >= 0),
  inventory_qty INTEGER NOT NULL DEFAULT 0 CHECK (inventory_qty >= 0),
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_product_variants_product ON shop_product_variants(product_id, sort_order);

-- Sequential, human-friendly order numbers (FH-1000, FH-1001, ...).
CREATE SEQUENCE IF NOT EXISTS shop_order_number_seq START WITH 1000;

CREATE TABLE IF NOT EXISTS shop_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'cad',
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  fulfillment_status TEXT NOT NULL DEFAULT 'NEW'
    CHECK (fulfillment_status IN ('NEW', 'PROCESSING', 'SHIPPED', 'CANCELLED')),
  shipping_name TEXT,
  shipping_address TEXT,
  tracking_number TEXT,
  tracking_carrier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_created ON shop_orders(created_at DESC);

CREATE TABLE IF NOT EXISTS shop_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_label TEXT,
  sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_shop_order_items_order ON shop_order_items(order_id);
