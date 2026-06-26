-- Hall Pro belongs to halls (not user accounts or departments)

ALTER TABLE hall_subscriptions ADD COLUMN trial_started_at TEXT;
ALTER TABLE hall_subscriptions ADD COLUMN selected_at TEXT NOT NULL DEFAULT (datetime('now'));
ALTER TABLE hall_subscriptions ADD COLUMN subscribed_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL;

UPDATE plan_catalog SET display_name = 'Free', tagline = 'Cook tonight — no account needed' WHERE plan_id = 'guest';
UPDATE plan_catalog SET tagline = 'Hall Pro is enabled per hall — captains manage it in hall settings' WHERE plan_id = 'hall_pro';
