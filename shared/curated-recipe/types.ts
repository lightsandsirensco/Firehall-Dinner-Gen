/**
 * Curated Recipe Database — normalized domain model.
 * Source of truth for real, attributed meals (not AI-invented).
 *
 * Coexists with legacy `recipe_catalog` (JSON blob) during migration.
 */

import type { MealArchetype } from "../canonical-recipe.js";
import type { GenerateResponse } from "../schema.js";
import type { EditorialImageMetadata } from "../editorial-image-metadata.js";
import type {
  CuratedMetadataFilter,
  CuratedRecipeMetadata,
  CuratedRecipeMetadataOverrides,
} from "./metadata/types.js";
import type { EditorialQaOverrides } from "./qa-engine/types.js";
import type { CuratedRecipeRole } from "./families/types.js";

export type {
  CuratedRecipeMetadata,
  CuratedRecipeMetadataOverrides,
  CuratedMetadataFilter,
} from "./metadata/types.js";
export type {
  EditorialQaReport,
  EditorialQaFlag,
  EditorialQaOverrides,
} from "./qa-engine/types.js";
export type {
  CuratedRecipeRole,
  RecipeArchetype,
  RecipeFamilyLink,
  RecipeFamilyContext,
  VariantSimilarityResult,
} from "./families/types.js";
export type {
  ProteinKind,
  CuisineKind,
  DifficultyLevel,
  CookTimeBucket,
  EquipmentKind,
  CrewSizeBucket,
  LeftoversQuality,
  MealStyle,
  NutritionCategory,
  HallTestedStatus,
} from "./metadata/taxonomy.js";

/** Lifecycle for editorial / ingestion workflow */
export type CuratedRecipeStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

/** How the recipe entered the system */
export type CuratedSourceKind =
  | "spoonacular"
  | "publisher"
  | "partner"
  | "manual"
  | "hall_classic"
  | "import"
  | "template";

export type CuratedSourceLicense = "aggregator" | "owned" | "partner" | "internal";

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
  /** Editorial imagery pipeline — heroes, variants, approval */
  editorialImage?: EditorialImageMetadata;

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

  /** Editorial workflow metadata */
  editorialNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  publishedAt?: string;

  /** Structured CMS metadata (filters, SEO, recommendation) */
  metadata?: CuratedRecipeMetadata;

  /** Manual QA suppressions — does not change recipe body */
  qaOverrides?: EditorialQaOverrides;

  /** Archetype family (DB FK) — editorial grouping */
  archetypeId?: string;
  /** Parent canonical recipe when recipeRole = variant */
  parentRecipeId?: string;
  recipeRole?: CuratedRecipeRole;
  /** Stable variant key within family (not a URL segment) */
  variantKey?: string;
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
  editorialImage?: EditorialImageMetadata;

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
  archetypeId?: string;
  parentRecipeId?: string;
  recipeRole?: CuratedRecipeRole;
  variantKey?: string;
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

  /** Editorial workflow writes (optional; admin tooling sets these) */
  editorialNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  publishedAt?: string;

  /** Explicit metadata; derived on upsert when omitted */
  metadata?: CuratedRecipeMetadata;
}

export interface CuratedRecipeListQuery {
  status?: CuratedRecipeStatus | CuratedRecipeStatus[];
  protein?: string;
  category?: string;
  explorePool?: string;
  minQuality?: number;
  featured?: boolean;
  /** Structured metadata filters (denormalized columns) */
  metadata?: CuratedMetadataFilter;
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
  /** From editorial_image_json — false keeps card in held placeholder state */
  imageApproved?: boolean;
  metadata?: Pick<
    CuratedRecipeMetadata,
    | "difficulty"
    | "cookTimeBucket"
    | "mealStyle"
    | "nutritionCategory"
    | "busyNightSuitable"
    | "hallTested"
  >;
}
