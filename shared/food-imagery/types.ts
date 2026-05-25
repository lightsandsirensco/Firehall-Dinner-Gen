/**
 * Food imagery pipeline — shared types for prompt + asset metadata.
 */

export type FoodImageryMealRole = "hero" | "card" | "og" | "thumb";

export type FoodImageryJobStatus = "queued" | "running" | "succeeded" | "failed" | "rejected";

export interface FoodImageryIngredientHint {
  name: string;
  role?: "protein" | "starch" | "garnish" | "sauce" | "veg";
}

export interface FoodImageryContext {
  /** Stable key: slug, recipe_id, or spoonacular:123 */
  recipeKey: string;
  title: string;
  displayTitle?: string;
  summary?: string;
  cuisine?: string;
  mealFormat?: string;
  protein?: string;
  ingredients?: FoodImageryIngredientHint[];
  tags?: string[];
  /** Skip generation when publisher owns a valid hero */
  heroImage?: string;
  sourceKind?: string;
  /** Hall classic pinned path — skip unless force */
  pinnedHeroPath?: string;
}

export interface FoodImageryPromptSpec {
  positive: string;
  negative: string;
  styleTags: string[];
  composition: string;
  lighting: string;
  camera: string;
  mood: string;
}

export interface FoodImageryAssetRecord {
  assetId: string;
  recipeKey: string;
  promptHash: string;
  publicPath: string;
  absolutePath: string;
  version: number;
  width: number;
  height: number;
  bytes: number;
  model: string;
  status: FoodImageryJobStatus;
  validationNotes?: string;
  createdAt: string;
}
