export type DuplicateCategory =
  | "EXACT_DUPLICATE"
  | "NEAR_DUPLICATE"
  | "SAME_MEAL_DIFFERENT_NAME"
  | "UNIQUE";

export type MealArchetypeId =
  | "burrito_bowl"
  | "chicken_rice_bowl"
  | "creamy_chicken_pasta"
  | "taco_variation"
  | "sheet_pan_chicken"
  | "burger_variation"
  | "breakfast_hash"
  | "breakfast_burrito"
  | "pulled_pork_bbq"
  | "brisket_bbq"
  | "chicken_bbq"
  | "pasta_red_sauce"
  | "soup_chili"
  | "sheet_pan_generic"
  | "sandwich_handheld"
  | "smoked_meal"
  | "other";

export interface CatalogRecipeAuditRecord {
  slug: string;
  title: string;
  collection: string;
  category: string;
  cuisine: string;
  protein: string;
  mealFormat: string;
  cookingMethod: string;
  sideDishes: string[];
  ingredientNames: string[];
  equipment: string[];
  tags: string[];
  archetypes: MealArchetypeId[];
}

export interface RecipePairSimilarity {
  slugA: string;
  slugB: string;
  titleA: string;
  titleB: string;
  overall: number;
  titleScore: number;
  proteinScore: number;
  cuisineScore: number;
  cookingMethodScore: number;
  mealFormatScore: number;
  ingredientScore: number;
  sideDishScore: number;
  sharedArchetypes: MealArchetypeId[];
  category: DuplicateCategory;
}

export interface DuplicateReportEntry {
  slug: string;
  title: string;
  collection: string;
  category: DuplicateCategory;
  primaryMatchSlug: string | null;
  primaryMatchTitle: string | null;
  similarity: number;
  archetypes: MealArchetypeId[];
  pairs: RecipePairSimilarity[];
}

export interface DuplicateReport {
  generatedAt: string;
  catalogSummary: {
    totalRecipes: number;
    byCollection: Record<string, number>;
    exactDuplicateRecipes: number;
    nearDuplicateRecipes: number;
    sameMealDifferentNameRecipes: number;
    uniqueRecipes: number;
    duplicatePairCount: number;
  };
  topOverrepresentedMealTypes: Array<{
    archetype: MealArchetypeId;
    label: string;
    count: number;
    examples: string[];
  }>;
  recommendedExpansionOpportunities: Array<{
    opportunity: string;
    rationale: string;
    noveltyExamples: string[];
    underrepresentedCuisines: string[];
    underrepresentedFormats: string[];
  }>;
  rejectionPatterns: Array<{
    pattern: string;
    count: number;
    examples: string[];
  }>;
  noveltyGate: {
    minimumScore: number;
    description: string;
  };
  recipes: DuplicateReportEntry[];
  significantPairs: RecipePairSimilarity[];
}
