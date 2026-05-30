/** Per-serving nutrition — canonical macro shape across catalogs. */
export interface RecipeNutritionPerServing {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Future Explore filter support — computed, not displayed yet. */
export interface NutritionFilterFlags {
  highProtein: boolean;
  under700Calories: boolean;
  under30gFat: boolean;
  highCarb: boolean;
  lowCarb: boolean;
  mealPrepFriendly: boolean;
}

/** Future badge support — stored but not auto-displayed. */
export interface NutritionBadgeCandidates {
  highProtein: boolean;
  lighterOption: boolean;
  performanceMeal: boolean;
}

export interface RecipeNutritionRecord extends RecipeNutritionPerServing {
  servings: number;
  source: "calculated" | "curated" | "estimated";
  matchedIngredientCount: number;
  totalIngredientCount: number;
  filterFlags: NutritionFilterFlags;
  badgeCandidates: NutritionBadgeCandidates;
}

export interface CatalogIngredientLine {
  name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
  optional?: boolean;
}
