import { z } from "zod";

export const generateRequestSchema = z.object({
  crew_size: z.number().min(2).max(20),
  busy_level: z.enum(["quiet", "average", "busy", "slammed"]),
  time_available: z.enum(["15-25", "20-30", "25-40", "30-45", "45-60", "60-90"]),
  appliances: z.array(z.string()).min(1),
  protein: z.enum(["chicken", "beef", "pork", "turkey", "fish", "seafood", "vegetarian", "any"]),
  healthiness_preference: z.enum(["lean", "balanced", "comfort"]),
  budget_level: z.enum(["low", "standard", "splurge"]).optional().default("standard"),
  allergens_to_avoid: z.array(z.string()),
  vegetarian_swap_needed: z.boolean().optional().default(false),
  last_template_id: z.number().optional(),
  use_what_we_have: z.boolean().optional().default(false),
  ingredients_on_hand: z.array(z.string()).optional().default([]),
  cuisine_style: z.enum([
    "any",
    "mediterranean",
    "mexican",
    "italian",
    "asian",
    "korean",
    "thai",
    "indian",
    "middle_eastern",
    "bbq",
    "cajun",
    "canadian",
  ]).optional().default("any"),
  meal_format: z.enum([
    "random",
    "burger",
    "tacos",
    "wrap",
    "bowl",
    "pasta",
    "salad",
    "sheet_pan",
    "skillet",
    "stir_fry",
    "soup_chili",
    "stew",
    "grill",
    "one_pot",
    "breakfast",
    "loaded_fries",
    "sandwich",
    "casserole",
    "plated_main",
  ]).optional().default("random"),
  recent_meal_styles: z.array(z.string()).optional().default([]),
  prefer_different_style: z.boolean().optional().default(false),
  recentSignatures: z.array(z.string()).optional().default([]),
  currentRecipeSignature: z.string().optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export interface IngredientItem {
  item: string;
  amount: string;
  notes: string;
}

export interface ClientIngredient {
  name: string;
  qty: number;
  unit: string;
  category: string;
}

export interface MacrosPerServing {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface RecipeTiming {
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
}

export interface ClientTiming {
  prep_min: number;
  cook_min: number;
  total_min: number;
}

export interface ProteinSafetyItem {
  protein: string;
  target_temp_f: number;
  target_temp_c: number;
  rest_minutes: number;
  probe_where: string;
  notes: string;
}

export interface ClientProteinSafety {
  protein: string;
  internal_temp_f: number;
  rest_min: number;
  notes: string;
}

export interface RecipeStep {
  heading: string;
  body: string;
}

export interface ClientStep {
  n: number;
  title: string;
  heat: string;
  minutes: number;
  instructions: string;
}

export interface ClientPlating {
  serve_style: string;
  assembly_instructions: string;
  optional_toppings: string[];
}

export interface MealPlateLine {
  name: string;
  amount: string;
  role?: "main" | "starch" | "veg" | "optional";
}

export interface MealPlate {
  display_title: string;
  main: MealPlateLine[];
  sides: MealPlateLine[];
  optional: MealPlateLine[];
  cuisine_label?: string;
}

export interface VegOptionIngredient {
  item: string;
  amount: string;
  notes: string;
}

export interface VegOption {
  enabled: boolean;
  swap_protein: string;
  ingredients: VegOptionIngredient[];
  steps: string[];
  plating_notes: string;
}

export interface RecipeTags {
  cuisine: string;
  cooking_method: string;
  base_carb: string;
  key_ingredients: string[];
  high_protein: boolean;
  high_fiber: boolean;
  quick_cleanup: boolean;
}

export interface GenerateResponse {
  template_id: number;
  chosen_protein: string;
  primary_protein_source: string;
  title: string;
  meal_style?: string;
  why_it_fits_tonight: string;
  timing: RecipeTiming;
  protein_safety: ProteinSafetyItem[];
  ingredients: IngredientItem[];
  steps: RecipeStep[];
  cleanup_tip: string;
  macros_per_serving: MacrosPerServing;
  veg_option?: VegOption;
  ingredients_used?: string[];
  extra_items_needed?: string[];
  budget_level?: string;
  budget_tips?: string[];
  pro_tips?: string[];
  tags?: RecipeTags;
}

export interface ClientRecipeResponse {
  title: string;
  meal_plate?: MealPlate;
  meal_format: string;
  servings: number;
  tags: string[];
  timing: ClientTiming;
  protein_safety: ClientProteinSafety;
  ingredients: ClientIngredient[];
  steps: ClientStep[];
  plating: ClientPlating;
  macros_per_serving: MacrosPerServing;
  /** True when sides were composed after fetch — macros are adjusted estimates. */
  macros_estimated?: boolean;
  chosen_protein: string;
  primary_protein_source: string;
  meal_style?: string;
  why_it_fits_tonight: string;
  cleanup_tip: string;
  pro_tips?: string[];
  budget_level?: string;
  budget_tips?: string[];
  veg_option?: VegOption;
  ingredients_used?: string[];
  extra_items_needed?: string[];
  recipe_tags?: RecipeTags;
  template_id?: number;
  _fallback?: boolean;
  _signature?: string;
  _id?: string;
}

export const pizzaRequestSchema = z.object({
  crew_size: z.number().min(2).max(20),
  time_available: z.enum(["30-45", "45-60", "60-90", "90-150"]),
  dough_option: z.enum(["premade", "from_scratch", "surprise_me"]),
  style_preference: z.enum(["classic", "creative", "comfort", "healthier"]),
  heat_level: z.enum(["mild", "medium", "spicy"]),
  allergens_to_avoid: z.array(z.string()),
  vegetarian_swap_needed: z.boolean().optional().default(false),
  last_pizza_style_id: z.string().optional(),
});

export type PizzaRequest = z.infer<typeof pizzaRequestSchema>;

export interface PizzaOvenSetup {
  preheat_temp_f: number;
  preheat_temp_c: number;
  rack_position: string;
  surface_option: string;
}

export interface PizzaTiming {
  prep_minutes: number;
  bake_minutes: number;
  total_minutes: number;
}

export interface PizzaResponse {
  pizza_style_id: string;
  title: string;
  dough_type: string;
  why_this_works: string;
  recommended_pizzas: string;
  timing: PizzaTiming;
  oven_setup: PizzaOvenSetup;
  ingredients: {
    dough?: IngredientItem[];
    sauce: IngredientItem[];
    cheese: IngredientItem[];
    toppings: IngredientItem[];
    drizzles: IngredientItem[];
  };
  build_steps: RecipeStep[];
  protein_safety: ProteinSafetyItem[];
  veg_option?: {
    enabled: boolean;
    description: string;
    swap_toppings: IngredientItem[];
    steps: string[];
  };
  cleanup_tip: string;
  macros_per_serving: MacrosPerServing;
}

export const hallVoteCreateSchema = z.object({
  title: z.string().max(100).optional().default("Tonight's Hall Vote"),
  options: z.array(z.object({
    name: z.string(),
    description: z.string(),
    est_cost: z.string().optional(),
    est_time: z.string().optional(),
    recipe_payload: z.any(),
  })).min(2).max(5),
});

export type HallVoteCreateRequest = z.infer<typeof hallVoteCreateSchema>;

export interface HallVoteOption {
  option_id: number;
  name: string;
  description: string;
  est_cost?: string;
  est_time?: string;
  recipe_payload: GenerateResponse;
  vote_count: number;
}

export interface HallVoteResponse {
  vote_id: string;
  title: string;
  options: HallVoteOption[];
  status: "open" | "closed";
  created_at: string;
  expires_at: string;
  total_votes: number;
  user_vote?: number;
  can_close: boolean;
  winner?: number;
  share_url?: string;
}

export interface TemplateRow {
  template_id: string;
  template_name: string;
  style: string;
  base_idea_description: string;
  appliances_needed: string;
  time_range_minutes: string;
  busy_level_fit: string;
  healthiness_level: string;
  proteins_allowed: string;
  allergens_possible: string;
  mess_level: string;
  reheat_friendly: string;
}
