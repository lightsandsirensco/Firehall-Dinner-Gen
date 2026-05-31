import type {
  GoldenRecipePage,
  GoldenRecipePageIngredient,
  GoldenRecipePageStep,
} from "../golden-100/recipe-page-schema.js";

export const HALL_EXPANSION_COUNT = 74;
export const HALL_EXPANSION_SET_TAG = "hall_expansion_74";
export const HALL_EXPANSION_PAGE_CATEGORY = "hall_expansion";

export type ExpansionCategory =
  | "smoker_recipes"
  | "game_day_recipes"
  | "crew_feeders";

export type ExpansionRecipeDef = {
  slug: string;
  title: string;
  subtitle: string;
  category: ExpansionCategory;
  protein: string;
  cuisine: string;
  mealFormat: string;
  explorePools: string[];
  hookLine: string;
  description: string;
  whyCrewsLikeIt: string;
  mealPrepNotes: string;
  stationWorkflow: string[];
  prepMinutes: number;
  cookMinutes: number;
  difficulty: GoldenRecipePage["difficulty"];
  crewSizeDefault: number;
  ingredients: GoldenRecipePageIngredient[];
  steps: GoldenRecipePageStep[];
  proTips: string[];
  tonightSpread: string[];
  leftovers: string[];
  equipment: string[];
  nutrition: { calories: number; protein: number; carbs: number; fats: number; fiber?: number };
  spiceLevel?: GoldenRecipePage["spiceLevel"];
  cleanupDifficulty?: GoldenRecipePage["cleanupDifficulty"];
  searchTerms?: string[];
};
