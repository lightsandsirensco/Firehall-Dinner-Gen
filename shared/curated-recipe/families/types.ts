/**
 * Recipe family / archetype domain — parent-child variants with shared base structures.
 * Designed for 500–1000 curated recipes; slugs remain per-recipe for SEO stability.
 */

import type { HallArchetypeFamily } from "../../meal-archetype-system.js";

/** How this recipe relates to its archetype family */
export type CuratedRecipeRole = "standalone" | "canonical" | "variant";

export interface RecipeBaseIngredient {
  /** Optional slot id variants fill (e.g. "protein", "sauce") */
  slot?: string;
  name: string;
  role?: "protein" | "starch" | "veg" | "sauce" | "seasoning" | "other";
  optional?: boolean;
}

export interface RecipeBasePrepPhase {
  phase: string;
  summary: string;
  minutes?: number;
}

/** Shared editorial skeleton — variants extend with full ingredient/step rows */
export interface RecipeBaseStructure {
  version: 1;
  ingredients: RecipeBaseIngredient[];
  prepFlow: RecipeBasePrepPhase[];
  equipment: string[];
  techniques: string[];
}

/** SEO + discovery metadata for archetype hub pages (future) */
export interface RecipeArchetypeMetadata {
  slug: string;
  displayName: string;
  description: string;
  /** Stable hub path — does not replace /recipes/:slug */
  hubPath: string;
  keywords: string[];
  /** JSON-LD hint */
  schemaType: "CollectionPage";
  relatedFamilyKeys?: HallArchetypeFamily[];
}

export interface RecipeArchetype {
  archetypeId: string;
  slug: string;
  familyKey: HallArchetypeFamily;
  displayName: string;
  tagline: string;
  legacyMealArchetype: string;
  explorePools: string[];
  metadata: RecipeArchetypeMetadata;
  baseStructure: RecipeBaseStructure;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeFamilyLink {
  recipeId: string;
  slug: string;
  title: string;
  archetypeId?: string;
  familyKey?: HallArchetypeFamily;
  recipeRole: CuratedRecipeRole;
  parentRecipeId?: string;
  parentSlug?: string;
  parentTitle?: string;
  variantKey?: string;
  archetypeVariation?: string;
}

export interface VariantSimilarityResult {
  recipeIdA: string;
  recipeIdB: string;
  slugA: string;
  slugB: string;
  overall: number;
  ingredients: number;
  steps: number;
  title: number;
  equipment: number;
  isNearDuplicate: boolean;
}

export interface RecipeFamilyContext {
  archetype?: RecipeArchetype;
  link: RecipeFamilyLink;
  siblings: RecipeFamilyLink[];
  variants: RecipeFamilyLink[];
}
