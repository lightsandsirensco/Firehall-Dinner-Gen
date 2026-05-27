/**
 * Master category types — re-exports + pipeline result shapes.
 */

export type {
  MasterCategoryDefinition,
  MasterSubcategory,
  CategoryAssignment,
  RecommendationIndexEntry,
} from "./schema.js";

export type { MasterCategoryId, LegacyExplorePoolId, CategoryThemeToken, ShiftContext, CrewDynamic } from "./constants.js";

export interface CategoryAffinityScore {
  categoryId: import("./constants.js").MasterCategoryId;
  score: number;
  reasons: string[];
}

export interface RecipeCategoryClassification {
  primary: import("./constants.js").MasterCategoryId;
  secondary: import("./constants.js").MasterCategoryId[];
  subcategories: string[];
  scores: CategoryAffinityScore[];
  assignment: import("./schema.js").CategoryAssignment;
}

export interface CategoryImageryEnrichment {
  masterCategoryIds: import("./constants.js").MasterCategoryId[];
  lighting: string;
  mood: string;
  texture: string;
  negativeHints: string[];
  shotPresetHints: string[];
}
