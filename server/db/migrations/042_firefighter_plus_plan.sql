-- Correct the plan model: "personal" is the free signed-in experience (was
-- mislabeled "Firefighter Plus — $4.99/month" with nobody ever charged).
-- "firefighter_plus" is introduced as the real future paid tier — entitlement
-- testing only, no payment processing yet (payments_enabled stays 0).

UPDATE plan_catalog
SET display_name = 'Personal',
    tagline = 'Free forever — sync your meals across every device.',
    price_label = 'Free',
    sort_order = 1
WHERE plan_id = 'personal';

INSERT OR IGNORE INTO plan_catalog (plan_id, display_name, tagline, price_label, enabled, sort_order) VALUES
  ('firefighter_plus', 'Firehall Meals Pro', 'Find the right meal faster.', '$4.99/month', 1, 2);

UPDATE plan_catalog SET sort_order = 3 WHERE plan_id = 'hall_pro';
