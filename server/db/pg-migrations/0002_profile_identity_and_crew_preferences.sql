-- Profile Identity + Crew Food Profile — additive, backward-compatible.
--
-- IDENTITY (user_profiles): structured location for future local grocery
-- deals/regional pricing (city/province/postal/country only — deliberately
-- NEVER a street address), plus an optional unique username. Username is
-- NOT yet a public-profile handle (no public profile pages exist); it exists
-- so the identity header can show "@handle" instead of an email fragment.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS province_state TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT;

-- Case-insensitive uniqueness, only enforced once a user actually sets one
-- (NULL usernames never collide with each other).
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username_lower
  ON user_profiles (lower(username))
  WHERE username IS NOT NULL;

-- CREW FOOD PROFILE (user_preferences): fills the gaps not already covered
-- by dietary_restrictions_json / excluded_ingredients_json / appliance_preferences_json.
-- Values are drawn from existing recipe/curated-metadata taxonomies
-- (shared/recipe/constants.ts, shared/curated-recipe/metadata/taxonomy.ts)
-- so they line up with real recipe filtering, not a new invented vocabulary.
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS allergies_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS favorite_cuisines_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS spice_level TEXT;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS meal_difficulty TEXT;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS cook_time_preference TEXT;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS nutrition_goal TEXT;
