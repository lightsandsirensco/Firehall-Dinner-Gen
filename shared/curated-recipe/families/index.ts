export type {
  CuratedRecipeRole,
  RecipeArchetype,
  RecipeArchetypeMetadata,
  RecipeBaseStructure,
  RecipeBaseIngredient,
  RecipeBasePrepPhase,
  RecipeFamilyLink,
  RecipeFamilyContext,
  VariantSimilarityResult,
} from "./types.js";
export { defaultBaseStructureForFamily } from "./base-structure.js";
export { archetypeSlugFromFamilyKey, buildArchetypeMetadata } from "./metadata.js";
export {
  scoreVariantSimilarity,
  findNearDuplicatePairs,
  VARIANT_NEAR_DUPLICATE_THRESHOLD,
  VARIANT_CLUSTER_THRESHOLD,
  type RecipeSimilarityInput,
} from "./similarity.js";
export {
  proposeFamilyLinksForCatalog,
  proposeFamilyLinksForGroup,
  variantKeyFromTitle,
  resolveFamilyContext,
  buildFamilyLinkIndex,
  type LinkableRecipe,
  type ProposedFamilyLink,
} from "./linking.js";
