/**
 * Performance Meals 50 — lighter / high-protein hall dinners merged into the main catalog.
 * Internal source tracking is separate; never exposed on public pages.
 */

import type { MasterCategoryId } from "../categories/constants.js";
import type {
  GoldenRecipePageIngredient,
  GoldenRecipePageStep,
} from "../golden-100/recipe-page-schema.js";

export const PERFORMANCE_SET_TAG = "performance_meals_50" as const;
export const PERFORMANCE_SET_VERSION = 1 as const;
export const PERFORMANCE_MEAL_COUNT = 50 as const;
export const PERFORMANCE_CANDIDATE_COUNT = 100 as const;

export type PerformancePublisher =
  | "Skinnytaste"
  | "Serious Eats"
  | "Ambitious Kitchen"
  | "The Mediterranean Dish"
  | "Mediterranean Living"
  | "EatingWell"
  | "Bon Appétit"
  | "NYT Cooking";

export type PerformanceNutritionProfile =
  | "high_protein"
  | "balanced"
  | "lean_comfort"
  | "omega3_forward"
  | "plant_forward"
  | "low_glycemic";

/** Internal-only — not published to recipe pages */
export interface PerformanceSourceRecord {
  id: string;
  publisher: PerformancePublisher;
  sourceUrl: string;
  inspirationTitle: string;
  category: string;
  nutritionProfile: PerformanceNutritionProfile;
  adaptationNotes: string;
  /** Set when promoted to the 50-meal catalog */
  selected: boolean;
  firehallSlug?: string;
  selectionScore?: number;
  selectionRationale?: string;
}

export interface PerformanceNutritionEstimate {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  label?: string;
}

export interface PerformanceManifestEntry {
  slug: string;
  title: string;
  subtitle: string;
  protein: string;
  cuisine: string;
  mealFormat: string;
  explorePools: string[];
  hookLine: string;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: "easy" | "medium" | "hard";
  crewSizeDefault: number;
  /** Links internal source record */
  sourceId: string;
  featured?: boolean;
}

/** Fully adapted Firehall-original recipe body */
export interface PerformanceAdaptedRecipe {
  manifest: PerformanceManifestEntry;
  description: string;
  whyCrewsLikeIt: string;
  mealPrepNotes: string;
  stationWorkflow: string[];
  ingredients: GoldenRecipePageIngredient[];
  steps: GoldenRecipePageStep[];
  nutrition: PerformanceNutritionEstimate;
  proTips: string[];
  tonightSpread: string[];
  leftovers: string[];
  substitutions?: string[];
  equipment: string[];
  spiceLevel?: "mild" | "medium" | "hot";
  cleanupDifficulty?: "easy" | "medium" | "heavy";
  searchTerms: string[];
}

export interface PerformanceManifestAuditIssue {
  slug: string;
  code: string;
  message: string;
  severity: "error" | "warn";
}

/** Golden-compatible category for pages */
export const PERFORMANCE_PAGE_CATEGORY: MasterCategoryId = "healthy_performance";
