-- Meal History + Crew Feedback — additive only, same table (user_meal_history),
-- no second history system. Every column is nullable: rows recorded before
-- this shipped, or logged from a surface missing some context, simply have
-- NULL there — never fabricated.

-- Real context captured at "Made This" / Cook Mode completion time.
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS hall_id TEXT;
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS meal_occasion TEXT;
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS crew_size INTEGER;
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS nutrition_goal TEXT;

-- Cost snapshot AS ESTIMATED AT LOG TIME — never recomputed later with newer
-- prices and backdated. Only populated when the existing pricing engine
-- produced a trustworthy estimate for that recipe at that moment.
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS cost_total_min NUMERIC;
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS cost_total_max NUMERIC;
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS cost_per_person_min NUMERIC;
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS cost_per_person_max NUMERIC;
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS cost_trustworthy INTEGER;

-- Post-meal crew feedback — optional, added via a follow-up PATCH after the
-- row already exists (logging must never block on feedback).
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS make_again INTEGER;
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS feedback_tags_json TEXT;
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_meal_history_user_cooked_at ON user_meal_history(user_id, cooked_at DESC);
