-- Goals + Progress — freeze the active nutrition goal onto a
-- nutrition_goal_match goal at creation time, so later profile preference
-- changes never retroactively change what an existing goal tracks.
-- Additive, nullable: existing rows (NULL) keep their prior live-comparison
-- behavior exactly as before — see server/goals/store.ts computeProgress().
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS nutrition_goal_snapshot TEXT;
