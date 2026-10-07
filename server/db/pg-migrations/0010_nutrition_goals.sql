-- Firehall Meals Pro "Nutrition Goals" — saved multi-select recommendation
-- preferences (canonical keys from shared/nutrition/profile-goals.ts).
-- Separate from the single-select nutrition_goal default. Non-Pro accounts
-- can only ever persist '[]' (enforced in server/auth/auth-store.ts).
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS nutrition_goals_json TEXT NOT NULL DEFAULT '[]';
