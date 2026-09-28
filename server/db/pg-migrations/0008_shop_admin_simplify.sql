-- Firehall Meals Shop — Shopify-simple admin follow-up.
--
-- 1. Replaces the boolean `active` flag with a real DRAFT/ACTIVE/ARCHIVED
--    status (drafts are admin-preview-only; archived stays out of the
--    storefront but is preserved for historical orders).
-- 2. Replaces separate primary_image_url/additional_image_urls with a
--    single ordered `image_urls` JSON array — index 0 is always the
--    primary image, so drag-to-reorder in the admin gallery just reorders
--    this one list.
-- 3. Adds `option_name` (e.g. "Size") — the single option-dimension label
--    shown above variant values in the simplified admin editor.
--
-- Safe on an empty/near-empty table (this feature only shipped a few hours
-- ago) — existing rows are still migrated correctly, just without needing
-- to preserve multi-image ordering that no admin UI ever wrote.

ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS status TEXT;
UPDATE shop_products SET status = CASE WHEN active = 1 THEN 'active' ELSE 'archived' END WHERE status IS NULL;
ALTER TABLE shop_products ALTER COLUMN status SET NOT NULL;
ALTER TABLE shop_products ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE shop_products DROP CONSTRAINT IF EXISTS shop_products_status_check;
ALTER TABLE shop_products ADD CONSTRAINT shop_products_status_check
  CHECK (status IN ('draft', 'active', 'archived'));

ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS option_name TEXT;

ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS image_urls TEXT NOT NULL DEFAULT '[]';
UPDATE shop_products
SET image_urls = CASE
  WHEN primary_image_url IS NOT NULL AND primary_image_url <> ''
    THEN jsonb_build_array(primary_image_url)::text
  ELSE '[]'
END
WHERE image_urls = '[]';

ALTER TABLE shop_products DROP COLUMN IF EXISTS primary_image_url;
ALTER TABLE shop_products DROP COLUMN IF EXISTS additional_image_urls;
ALTER TABLE shop_products DROP COLUMN IF EXISTS active;

DROP INDEX IF EXISTS idx_shop_products_active;
CREATE INDEX IF NOT EXISTS idx_shop_products_status ON shop_products(status, category);
