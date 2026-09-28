import { CUISINE_KINDS, DIFFICULTY_LEVELS, COOK_TIME_BUCKETS } from "../curated-recipe/metadata/taxonomy.js";
import { SPICE_LEVELS } from "../recipe/constants.js";

export const PROFILE_PROTEIN_OPTIONS = [
  "chicken",
  "beef",
  "pork",
  "turkey",
  "fish",
  "seafood",
  "vegetarian",
] as const;

export const PROFILE_DIETARY_OPTIONS = [
  "gluten",
  "dairy",
  "nuts",
  "shellfish",
  "eggs",
  "soy",
  "vegetarian",
  "vegan",
] as const;

/** Distinct from dietary_restrictions — a safety-critical "avoid at all costs" signal. */
export const PROFILE_ALLERGY_OPTIONS = [
  "peanuts",
  "tree_nuts",
  "shellfish",
  "dairy",
  "eggs",
  "soy",
  "gluten",
  "sesame",
] as const;

export const PROFILE_APPLIANCE_OPTIONS = [
  "stove",
  "oven",
  "grill",
  "air_fryer",
  "slow_cooker",
  "instant_pot",
  "flat_top",
  "smoker",
] as const;

/** Reuse the real recipe cuisine taxonomy so "favorite cuisines" line up with actual recipe tagging. */
export const PROFILE_CUISINE_OPTIONS = CUISINE_KINDS.filter((c) => c !== "other");

/** Reuse the real recipe spice-level taxonomy. */
export const PROFILE_SPICE_OPTIONS = SPICE_LEVELS;

/** Reuse the real curated-recipe difficulty taxonomy (easy / medium / hard). */
export const PROFILE_DIFFICULTY_OPTIONS = DIFFICULTY_LEVELS;

/** Reuse the real curated-recipe cook-time-bucket taxonomy. */
export const PROFILE_COOK_TIME_OPTIONS = COOK_TIME_BUCKETS;

export const PROFILE_COOK_TIME_LABELS: Record<(typeof COOK_TIME_BUCKETS)[number], string> = {
  under_30: "Under 30 min",
  thirty_to_45: "30–45 min",
  fortyfive_to_60: "45–60 min",
  over_60: "60+ min",
};

/**
 * Nutrition Goal — "what are we optimizing for tonight," not a diet/medical claim.
 * Saved here becomes the signed-in default in the meal generator; always overridable
 * for a single session without touching this saved value (see shared/generator-simplified.ts).
 */
export const PROFILE_NUTRITION_GOAL_OPTIONS = [
  "no_preference",
  "balanced",
  "high_protein",
  "lighter",
  "high_carb",
  "high_fiber",
  "heart_conscious",
  "quick_healthy",
] as const;

export type ProfileNutritionGoal = (typeof PROFILE_NUTRITION_GOAL_OPTIONS)[number];

/**
 * Labels for `high_fiber`/`heart_conscious` (internal keys unchanged — DB/schema
 * stable) were renamed to "Plant Forward" / "Well Rounded": the catalog has no
 * fibre or sodium data, only calories/protein/carbs/fat + an editorial
 * NutritionCategory + cook time. The old names implied a specific nutrient
 * (fibre grams, sodium/heart claims) we can't actually back with data — these
 * two modes only ever score off the same category/macro proxy as every other
 * mode, so the label must read as directional, not a measured guarantee.
 */
export const PROFILE_NUTRITION_GOAL_LABELS: Record<ProfileNutritionGoal, string> = {
  no_preference: "No preference",
  balanced: "Balanced",
  high_protein: "High Protein",
  lighter: "Lighter",
  high_carb: "Training Day",
  high_fiber: "Plant Forward",
  heart_conscious: "Well Rounded",
  quick_healthy: "Quick + Healthy",
};

/**
 * Short, crew-facing microcopy shown when a mode is selected — no clinical,
 * diet-culture, or unsupported-nutrient language. Describes what the scoring
 * actually does (category/macro/time signals), never a specific fibre/sodium
 * claim the catalog can't back.
 */
export const PROFILE_NUTRITION_GOAL_MICROCOPY: Record<ProfileNutritionGoal, string> = {
  no_preference: "Shows tonight's best pick with no nutrition filter applied.",
  balanced: "A practical mix of protein, carbs, and veg.",
  high_protein: "Prioritizes meals with more protein per serving.",
  lighter: "Prioritizes lower-calorie meals with solid protein.",
  high_carb: "Prioritizes meals with more carbohydrates and adequate protein.",
  high_fiber: "Leans toward vegetable-forward, whole-food meals.",
  heart_conscious: "Leans toward meals with a stronger overall nutrition balance.",
  quick_healthy: "Balances nutrition with shorter prep and cook times.",
};

/** username: lowercase letters, numbers, underscores — slug-safe, never an email. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}
