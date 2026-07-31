import { z } from "zod";
import type { RecipeSourceAttribution } from "./canonical-recipe.js";
import {
  normalizeRecipeSignature,
  sanitizeRecipeSignatureList,
  sanitizeRecipeMealStyleList,
  RECIPE_SIGNATURE_MAX_LEN,
  RECIPE_MEAL_STYLE_MAX_LEN,
} from "./recipe-signature.js";
import { FIREHALL_CATEGORY_IDS } from "./firehall-categories.js";
import { DIETARY_FILTER_KEYS } from "./dietary/schema.js";

const safeLabel = z.string().trim().min(1).max(80);
const safeAllergen = z.string().trim().min(1).max(40);
const safeMealStyle = z.string().trim().max(RECIPE_MEAL_STYLE_MAX_LEN);

const zOptionalRecipeSignature = z.preprocess(
  (v) => {
    if (v == null || v === "") return undefined;
    const s = normalizeRecipeSignature(v);
    return s.length > 0 ? s : undefined;
  },
  z.string().max(RECIPE_SIGNATURE_MAX_LEN).optional(),
);

const zRecentSignatures = z.preprocess(
  (v) => sanitizeRecipeSignatureList(v),
  z.array(z.string().max(RECIPE_SIGNATURE_MAX_LEN)).max(12),
);

export const generateRequestSchema = z.object({
  crew_size: z.number().min(2).max(20),
  busy_level: z.enum(["quiet", "average", "busy", "slammed"]),
  time_available: z.enum(["15-25", "20-30", "25-40", "30-45", "45-60", "60-90"]),
  appliances: z.array(z.string().trim().min(1).max(40)).min(0).max(8),
  protein: z.enum(["chicken", "beef", "pork", "turkey", "fish", "seafood", "vegetarian", "any"]),
  healthiness_preference: z.enum(["lean", "balanced", "comfort"]),
  /** Firehall Meals primary browsing category (practical situations). */
  firehall_category: z
    .enum(FIREHALL_CATEGORY_IDS)
    .optional(),
  budget_level: z.enum(["low", "standard", "splurge"]).optional().default("standard"),
  allergens_to_avoid: z.array(safeAllergen).max(12),
  vegetarian_swap_needed: z.boolean().optional().default(false),
  /**
   * Strict dietary restrictions the user selected (vegan, pork-free, etc.) — uses the
   * SAME canonical `DietaryFilterKey` vocabulary as the Explore/Browse filters (see
   * shared/dietary/schema.ts), so a single classifier (shared/dietary/classify-recipe.ts)
   * can gate both surfaces. A candidate recipe is only served when every requested flag
   * is confirmed true AND classification confidence is "high" — never inferred/assumed.
   */
  dietary_restrictions: z.array(z.enum(DIETARY_FILTER_KEYS)).max(11).optional().default([]),
  last_template_id: z.number().optional(),
  use_what_we_have: z.boolean().optional().default(false),
  ingredients_on_hand: z.array(safeLabel).max(30).optional().default([]),
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
  recent_meal_styles: z
    .preprocess((v) => sanitizeRecipeMealStyleList(v), z.array(safeMealStyle).max(10))
    .optional()
    .default([]),
  prefer_different_style: z.boolean().optional().default(false),
  recentSignatures: zRecentSignatures.optional().default([]),
  currentRecipeSignature: zOptionalRecipeSignature,
  /** Client correlation id — required for user-initiated generations */
  request_id: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  /** Background prefetch must not consume per-user burst limits */
  generation_intent: z.enum(["user", "prefetch"]).optional().default("user"),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

const emailAddressSchema = z.string().trim().email().max(254);

const emailMacrosSchema = z
  .object({
    calories: z.number().finite().min(0).max(5000).optional().default(0),
    protein_g: z.number().finite().min(0).max(500).optional().default(0),
    carbs_g: z.number().finite().min(0).max(500).optional().default(0),
    fat_g: z.number().finite().min(0).max(500).optional().default(0),
  })
  .optional()
  .default({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

export const emailRecipeSchema = z.object({
  email: emailAddressSchema,
  recipe_title: z.string().trim().min(1).max(200),
  primary_protein: z.string().trim().max(80).optional().default(""),
  healthiness_level: z.string().trim().max(40).optional().default(""),
  crew_size: z.number().int().min(0).max(20).optional().default(0),
  ingredients: z.array(z.string().trim().max(300)).max(50).optional().default([]),
  steps: z.array(z.string().trim().max(2000)).max(20).optional().default([]),
  pro_tips: z.array(z.string().trim().max(500)).max(5).optional().default([]),
  macros: emailMacrosSchema,
  timestamp: z.string().trim().max(40).optional(),
  capture_source: z.string().trim().max(40).optional(),
});

export type EmailRecipePayload = z.infer<typeof emailRecipeSchema>;

const shoppingListItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  amount: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(300).optional(),
});

export const emailShoppingListSchema = z.object({
  email: emailAddressSchema,
  recipe_title: z.string().trim().min(1).max(200),
  shopping_list_sections: z
    .array(
      z.object({
        title: z.string().trim().max(100),
        items: z.array(shoppingListItemSchema).max(80),
      }),
    )
    .max(15)
    .optional()
    .default([]),
  generator_type: z.enum(["meal", "pizza"]).optional().default("meal"),
  timestamp: z.string().trim().max(40).optional(),
});

export type EmailShoppingListPayload = z.infer<typeof emailShoppingListSchema>;

export const redLeadLeadMagnetSchema = z.object({
  email: emailAddressSchema,
});

export type RedLeadLeadMagnetPayload = z.infer<typeof redLeadLeadMagnetSchema>;

export const homepageSubscribeSchema = z.object({
  email: emailAddressSchema,
  source: z.enum(["homepage", "hall_private_beta"]).optional(),
});

export type HomepageSubscribePayload = z.infer<typeof homepageSubscribeSchema>;

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
  /** Structured step fields (optional — populated by meal instruction engine). */
  title?: string;
  instruction?: string;
  ingredients_used?: string[];
  estimated_time?: number;
  cooking_method?: string;
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

/** Server-side metadata on generated meals (not shown in print HTML). */
/** @deprecated Use RecipeSourceAttribution from canonical-recipe */
export type GenerateResponseSourceMeta = RecipeSourceAttribution;

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
  /** Template / catalog / V2 path markers */
  _fallback?: boolean;
  /** Customer-facing: meal from curated hall catalog (not internal fallback). */
  hall_curated?: boolean;
  _source?: string;
  _catalog_id?: string;
  _recipe_source?: RecipeSourceAttribution;
  /** True when meal body came from publisher, catalog, or Spoonacular — not template/AI invention */
  _imported?: boolean;
  /** When true, generate path keeps original step flow (enhance tone only, no rebuild) */
  _preserve_source_steps?: boolean;
}

/** AI-generated cinematic hero — attached async after generation when enabled */
export type HeroImageStatus = "ready" | "pending" | "unavailable";

/** Hall vote option payload — recipe_payload always required at API boundary. */
export interface VoteOptionInput {
  name: string;
  description: string;
  est_cost?: string;
  est_time?: string;
  recipe_payload: GenerateResponse;
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
  /** Customer-facing: meal from curated hall catalog (not internal fallback). */
  hall_curated?: boolean;
  /** Server generate path: catalog, spoonacular_v2, template_fallback, etc. */
  _source?: string;
  _signature?: string;
  _id?: string;
  /** Catalog write-through from V2 Spoonacular success */
  _catalog_id?: string;
  _recipe_source?: {
    kind: string;
    name: string;
    url: string;
    license?: string;
  };
  /** Site-root or CDN-ready path from Firehall imagery pipeline */
  hero_image?: string;
  hero_image_alt?: string;
  hero_image_status?: HeroImageStatus;
  /** Curated catalog slug (Golden 100 or Performance 50 internally) */
  _slug?: string;
  /** When healthiness preference was relaxed to find a match */
  _relaxation_note?: string;
  _healthiness_relaxed?: boolean;
  /** Customer-facing catalog lineage badge */
  /** Customer-facing catalog lineage badge */
  catalog_badge?:
    | "Firehall Meals Catalog"
    | "Performance Meal"
    | "Hall Classic"
    | "Crew Favorite"
    | "High Protein"
    | "Quick Shift Meal";
  /** Optional trait badges (High Protein, Quick Shift Meal, etc.) */
  catalog_trait_badges?: Array<
    | "Firehall Meals Catalog"
    | "Performance Meal"
    | "Hall Classic"
    | "Crew Favorite"
    | "High Protein"
    | "Quick Shift Meal"
  >;
}

export const pizzaRequestSchema = z.object({
  crew_size: z.number().min(2).max(20),
  time_available: z.enum(["30-45", "45-60", "60-90", "90-150"]),
  dough_option: z.enum(["premade", "from_scratch", "surprise_me"]),
  style_preference: z.enum(["classic", "creative", "comfort", "healthier"]),
  heat_level: z.enum(["mild", "medium", "spicy"]),
  allergens_to_avoid: z.array(safeAllergen).max(12),
  vegetarian_swap_needed: z.boolean().optional().default(false),
  last_pizza_style_id: z
    .string()
    .trim()
    .max(48)
    .regex(/^[a-z0-9_]+$/i)
    .optional(),
  last_pizza_style_ids: z
    .array(z.string().trim().max(48).regex(/^[a-z0-9_]+$/i))
    .max(8)
    .optional(),
  generation_mode: z
    .enum(["standard", "spin_again", "wheel", "specialty_slice", "build_your_own", "fridge"])
    .optional(),
  crust_preference: z.enum(["thin", "regular", "thick", "sheet_pan", "surprise"]).optional(),
  sauce_preference: z.enum(["tomato", "white", "bbq", "buffalo", "pesto", "surprise"]).optional(),
  /** Optional hall side — default is pizza only (no side required). */
  include_hall_side: z.boolean().optional().default(false),
  hall_side_preference: z.string().trim().max(80).optional(),
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
  /** Enriched hall metadata (templates + finalize) */
  category?: string;
  badges?: string[];
  spice_level?: string;
  difficulty?: string;
  estimated_cost?: string;
  recommended_sides?: string[];
  dipping_sauces?: string[];
  crust_type?: string;
  sauce_style?: string;
  substitutions?: string[];
  optional_toppings?: string[];
  hero_emoji?: string;
  hall_line?: string;
  hero_image?: string;
  hero_image_alt?: string;
  hero_image_status?: HeroImageStatus;
}

export const hallVoteCreateSchema = z.object({
  title: z.string().trim().min(1).max(100).optional().default("Tonight's Hall Vote"),
  options: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(300),
        est_cost: z.string().trim().max(40).optional(),
        est_time: z.string().trim().max(40).optional(),
        recipe_payload: z.any(),
      }),
    )
    .min(2)
    .max(5),
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
