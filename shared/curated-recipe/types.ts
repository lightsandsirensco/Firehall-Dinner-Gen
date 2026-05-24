/**
 * Curated Recipe Database — normalized domain model.
 * Source of truth for real, attributed meals (not AI-invented).
 *
 * Coexists with legacy `recipe_catalog` (JSON blob) during migration.
 */

import type { MealArchetype } from "../canonical-recipe.js";
import type { GenerateResponse } from "../schema.js";

/** Lifecycle for editorial / ingestion workflow */
export type CuratedRecipeStatus = "draft" | "review" | "published" | "archived";

/** How the recipe entered the system */
export type CuratedSourceKind =
  | "spoonacular"
  | "publisher"
  | "partner"
  | "manual"
  | "hall_classic"
  | "import";

export type CuratedSourceLicense = "aggregator" | "owned" | "partner";

export type CuratedImageRole = "hero" | "card" | "og" | "thumb";

export type CuratedTagKind =
  | "general"
  | "diet"
  | "equipment"
  | "editorial"
  | "protein"
  | "explore_pool";

/** Primary firefighter / hall editorial grouping */
export type CuratedHallCategory =
  | "crew_favorite"
  | "shift_night"
  | "game_day"
  | "budget_feed"
  | "high_protein"
  | "one_pot"
  | "grill_station"
  | "comfort_classic"
  | "healthy_hall"
  | "breakfast_for_dinner";

export interface CuratedSourceAttribution {
  kind: CuratedSourceKind;
  name: string;
  url: string;
  license: CuratedSourceLicense;
  /** Spoonacular id, publisher recipe id, etc. */
  externalId?: string;
}

export interface CuratedIngredient {
  position: number;
  name: string;
  amount: number;
  unit: string;
  originalText: string;
  category?: string;
}

export interface CuratedInstruction {
  stepNumber: number;
  heading?: string;
  body: string;
}

export interface CuratedImageMeta {
  role: CuratedImageRole;
  url: string;
  width?: number;
  height?: number;
  altText: string;
  dominantColor?: string;
  blurHash?: string;
  sourceAttribution?: string;
  position?: number;
}

export interface CuratedRecipeScores {
  comfort: number;
  healthy: number;
  firehallSuitability: number;
  quality: number;
  appetite: number;
  trend?: number;
}

/** Sub-scores from unified quality model (stored as JSON when present) */
export interface CuratedQualityBreakdown {
  appetite: number;
  imageQuality: number;
  comfort: number;
  hallSuitability: number;
  cleanupDifficulty: number;
  realism: number;
  visualQuality: number;
  sideDishQuality: number;
  proteinQuality: number;
  ingredientCompleteness: number;
  composite: number;
}

/**
 * Full curated recipe — normalized read model assembled from DB rows.
 */
export interface CuratedRecipe {
  recipeId: string;
  slug: string;
  status: CuratedRecipeStatus;

  title: string;
  summary?: string;

  heroImage: string;
  images: CuratedImageMeta[];

  ingredients: CuratedIngredient[];
  instructions: CuratedInstruction[];

  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  servingsBase: number;
  cleanupDifficulty: 1 | 2 | 3 | 4 | 5;

  protein: string;
  cuisine: string;
  category: string;
  mealFormat: string;
  mealArchetype: MealArchetype;
  archetypeFamily?: string;
  archetypeVariation?: string;
  qualityBreakdown?: CuratedQualityBreakdown;
  cookingStyle?: string;

  tags: string[];
  /** Explore pool tags, hall categories — many-to-many */
  categories: string[];

  scores: CuratedRecipeScores;

  source: CuratedSourceAttribution;

  /** Optional hall-scaled payload for generate / vote compatibility */
  generateResponse?: GenerateResponse;

  /** Link to legacy recipe_catalog row during migration */
  legacyCatalogId?: string;

  featured: boolean;
  trendingRank?: number;
  servedCount: number;

  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

/** Write payload — upsert into curated store */
export interface CuratedRecipeInsert {
  recipeId: string;
  slug: string;
  status?: CuratedRecipeStatus;

  title: string;
  summary?: string;

  heroImage: string;
  images?: CuratedImageMeta[];

  ingredients: CuratedIngredient[];
  instructions: CuratedInstruction[];

  prepMinutes: number;
  cookMinutes?: number;
  totalMinutes: number;
  servingsBase: number;
  cleanupDifficulty: 1 | 2 | 3 | 4 | 5;

  protein: string;
  cuisine: string;
  category: string;
  mealFormat: string;
  mealArchetype: MealArchetype;
  archetypeFamily?: string;
  archetypeVariation?: string;
  qualityBreakdown?: CuratedQualityBreakdown;
  cookingStyle?: string;

  tags?: string[];
  categories?: string[];

  scores: CuratedRecipeScores;

  source: CuratedSourceAttribution;

  generateResponse?: GenerateResponse;
  legacyCatalogId?: string;

  featured?: boolean;
  trendingRank?: number;
}

export interface CuratedRecipeListQuery {
  status?: CuratedRecipeStatus | CuratedRecipeStatus[];
  protein?: string;
  category?: string;
  explorePool?: string;
  minQuality?: number;
  featured?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: "quality" | "trending" | "recent" | "served" | "publisherFirst";
}

export interface CuratedRecipeSummary {
  recipeId: string;
  slug: string;
  title: string;
  heroImage: string;
  protein: string;
  cuisine: string;
  category: string;
  totalMinutes: number;
  scores: Pick<CuratedRecipeScores, "quality" | "firehallSuitability" | "comfort" | "healthy">;
  sourceName: string;
  sourceUrl: string;
  sourceKind: string;
  /** Spoonacular recipe id when source is aggregator */
  spoonacularId: number | null;
  summary: string;
  status: CuratedRecipeStatus;
  featured: boolean;
}
