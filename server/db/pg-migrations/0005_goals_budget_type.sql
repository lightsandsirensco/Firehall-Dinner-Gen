-- Goals + Progress V2 — add the budget_avg_under goal type to the allowed
-- set. Additive only: existing rows/other goal types are untouched.
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_goal_type_check;
ALTER TABLE user_goals ADD CONSTRAINT user_goals_goal_type_check CHECK (goal_type IN (
  'new_meals', 'shift_meals', 'high_protein_shifts', 'healthier_meals',
  'plant_forward_meals', 'nutrition_goal_match', 'budget_avg_under'
));
