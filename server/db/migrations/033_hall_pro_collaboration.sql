-- Hall Pro = crew collaboration only (5 features). Personal tools belong to Firefighter Plus.

UPDATE plan_catalog
SET tagline = 'Shared list, meal history, staples, advanced vote, and crew grocery planning'
WHERE plan_id = 'hall_pro';

-- Retire protein_deals as a Hall Pro flag (moved to Plus / hall_grocery_planning)
UPDATE plan_feature_flags SET enabled = 0
WHERE plan_id = 'hall_pro' AND feature_key = 'protein_deals';

INSERT OR IGNORE INTO plan_feature_flags (plan_id, feature_key, enabled) VALUES
  ('hall_pro', 'advanced_hall_vote', 1),
  ('hall_pro', 'hall_grocery_planning', 1),
  ('personal', 'advanced_hall_vote', 0),
  ('personal', 'hall_grocery_planning', 0),
  ('personal', 'vote_history', 0),
  ('personal', 'view_canteen', 0);
