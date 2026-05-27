/**
 * Curated recipe metadata taxonomy — stable enums for CMS, search, filters, SEO.
 * Version bumps require migration when breaking.
 */

export const METADATA_SCHEMA_VERSION = 1 as const;

/** Normalized primary protein */
export const PROTEIN_KINDS = [
  "chicken",
  "beef",
  "pork",
  "turkey",
  "seafood",
  "fish",
  "lamb",
  "vegetarian",
  "vegan",
  "mixed",
  "other",
] as const;
export type ProteinKind = (typeof PROTEIN_KINDS)[number];

/** Editorial cuisine grouping (broader than raw source strings) */
export const CUISINE_KINDS = [
  "american",
  "mexican",
  "italian",
  "bbq",
  "southern",
  "mediterranean",
  "asian",
  "indian",
  "greek",
  "cajun",
  "japanese",
  "thai",
  "moroccan",
  "argentinian",
  "comfort",
  "other",
] as const;
export type CuisineKind = (typeof CUISINE_KINDS)[number];

export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

/** Active cook + prep window for filters / mobile chips */
export const COOK_TIME_BUCKETS = [
  "under_30",
  "thirty_to_45",
  "fortyfive_to_60",
  "over_60",
] as const;
export type CookTimeBucket = (typeof COOK_TIME_BUCKETS)[number];

export const EQUIPMENT_KINDS = [
  "skillet",
  "sheet_pan",
  "grill",
  "smoker",
  "slow_cooker",
  "instant_pot",
  "oven",
  "air_fryer",
  "one_pot",
  "dutch_oven",
  "stockpot",
  "none",
] as const;
export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number];

export const CREW_SIZE_BUCKETS = [
  "small_4_6",
  "standard_6_8",
  "large_8_12",
  "banquet_12_plus",
] as const;
export type CrewSizeBucket = (typeof CREW_SIZE_BUCKETS)[number];

export const LEFTOVERS_QUALITY = ["poor", "fair", "good", "excellent", "meal_prep"] as const;
export type LeftoversQuality = (typeof LEFTOVERS_QUALITY)[number];

export const MEAL_STYLES = [
  "comfort",
  "performance",
  "budget",
  "game_day",
  "shift_night",
  "healthy",
  "classic",
  "hearty",
  "other",
] as const;
export type MealStyle = (typeof MEAL_STYLES)[number];

export const NUTRITION_CATEGORIES = [
  "high_protein",
  "balanced",
  "comfort",
  "lighter",
  "vegetarian_friendly",
  "indulgent",
] as const;
export type NutritionCategory = (typeof NUTRITION_CATEGORIES)[number];

export const HALL_TESTED_STATUSES = ["not_tested", "field_tested", "hall_approved"] as const;
export type HallTestedStatus = (typeof HALL_TESTED_STATUSES)[number];

export const METADATA_LABELS: Record<string, Record<string, string>> = {
  protein: Object.fromEntries(PROTEIN_KINDS.map((k) => [k, k.replace(/_/g, " ")])),
  cuisine: Object.fromEntries(CUISINE_KINDS.map((k) => [k, k.replace(/_/g, " ")])),
  difficulty: { easy: "Easy", medium: "Medium", hard: "Hard" },
  cookTimeBucket: {
    under_30: "≤ 30 min",
    thirty_to_45: "30–45 min",
    fortyfive_to_60: "45–60 min",
    over_60: "> 60 min",
  },
  leftoversQuality: {
    poor: "Poor",
    fair: "Fair",
    good: "Good",
    excellent: "Excellent",
    meal_prep: "Meal prep",
  },
  mealStyle: Object.fromEntries(MEAL_STYLES.map((k) => [k, k.replace(/_/g, " ")])),
  nutritionCategory: {
    high_protein: "High protein",
    balanced: "Balanced",
    comfort: "Comfort",
    lighter: "Lighter",
    vegetarian_friendly: "Vegetarian friendly",
    indulgent: "Indulgent",
  },
  crewSizeBucket: {
    small_4_6: "4–6 crew",
    standard_6_8: "6–8 crew",
    large_8_12: "8–12 crew",
    banquet_12_plus: "12+ crew",
  },
  hallTested: {
    not_tested: "Not tested",
    field_tested: "Field tested",
    hall_approved: "Hall approved",
  },
};
