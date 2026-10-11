-- Firehall Meals Pro launch pricing: $5.99/mo, $39.99/yr, and the founding
-- offer ($29.99 for the first annual year via a once-only Stripe coupon —
-- shared/billing/pricing.ts). Checkout itself stays behind payments_enabled.

INSERT INTO billing_global_flags (flag_key, enabled, description) VALUES
  ('founding_offer_enabled', 1, 'Founding offer — first annual year at $29.99 (STRIPE_COUPON_ID_FOUNDING), renews at $39.99')
ON CONFLICT (flag_key) DO NOTHING;

UPDATE plan_catalog
SET price_label = '$5.99/mo · $39.99/yr'
WHERE plan_id = 'firefighter_plus';
