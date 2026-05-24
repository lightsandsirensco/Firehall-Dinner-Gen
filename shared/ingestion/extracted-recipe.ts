/**
 * Intermediate shape after JSON-LD / page extraction — before IngestRecipeDraft.
 */

export interface ExtractedIngredient {
  name: string;
  amount: number;
  unit: string;
  original: string;
}

export interface ExtractedStep {
  number: number;
  text: string;
}

export interface ExtractedRecipe {
  title: string;
  description?: string;
  heroImage: string;
  sourceUrl: string;
  publisherName: string;
  ingredients: ExtractedIngredient[];
  steps: ExtractedStep[];
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  servings: number;
  cuisine?: string;
  keywords?: string[];
  sideDishHints?: string[];
}
