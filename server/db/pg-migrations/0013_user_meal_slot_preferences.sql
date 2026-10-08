-- Meal-slot preferences — how a user customizes default meal-slot behavior.
--
-- Meal slots themselves are NOT stored. They are generated deterministically
-- from each shift instance by shared/schedule/meal-slots.ts.
--
-- prefs_json shape (validated by mealSlotPreferencesSchema):
--   { meals?: { breakfast|lunch|dinner|late_night?: { mode?, windowStart?, defaultTime?, windowEnd? } },
--     custom?: [{ id, label, time, optional? }],
--     arrivalGraceMinutes?, departureBufferMinutes? }
-- Always read and written as a whole.

CREATE TABLE IF NOT EXISTS user_meal_slot_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  prefs_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
