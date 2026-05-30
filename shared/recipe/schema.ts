/**
 * Zod schemas for the canonical Firehall recipe document (v1).
 */

import { z } from "zod";
import { cookingMethodSchema } from "../recipe-step-schema.js";
import {
  RECIPE_SCHEMA_VERSION,
  PROTEINS,
  CUISINES,
  MEAL_TYPES,
  DIFFICULTY_LEVELS,
  CLEANUP_LEVELS,
  SPICE_LEVELS,
  EQUIPMENT,
  HEAT_LEVELS,
  INGREDIENT_CATEGORIES,
  SHOPPING_CATEGORIES,
  SOURCE_TYPES,
  VALIDATION_STATUSES,
} from "./constants.js";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const safeTitle = z.string().trim().min(3).max(120);
const safeText = z.string().trim().max(2000);
const safeShort = z.string().trim().max(500);
const isoDate = z.string().trim().max(40);

export const recipeIdentitySchema = z.object({
  id: z.string().trim().min(1).max(80),
  slug: slugSchema,
  title: safeTitle,
  subtitle: z.string().trim().max(160).optional(),
  shortDescription: z.string().trim().max(400).optional(),
});

export const recipeClassificationSchema = z.object({
  protein: z.enum(PROTEINS),
  cuisine: z.enum(CUISINES),
  mealType: z.enum(MEAL_TYPES),
  tags: z.array(z.string().trim().min(1).max(48)).max(24),
  difficulty: z.enum(DIFFICULTY_LEVELS),
  cleanupLevel: z.number().int().min(1).max(5),
  spicyLevel: z.enum(SPICE_LEVELS),
  equipment: z.array(z.enum(EQUIPMENT)).max(8).optional().default([]),
});

export const recipeTimingSchema = z.object({
  prepMinutes: z.number().int().min(0).max(240),
  cookMinutes: z.number().int().min(0).max(480),
  totalMinutes: z.number().int().min(0).max(600),
});

export const recipeServingsSchema = z.object({
  crewSizeMin: z.number().int().min(2).max(20),
  crewSizeMax: z.number().int().min(2).max(20),
  scalableServings: z.boolean().default(true),
});

export const recipeIngredientSchema = z.object({
  position: z.number().int().min(0).max(200),
  name: z.string().trim().min(1).max(120),
  quantity: z.number().finite().min(0).max(10_000).optional(),
  unit: z.string().trim().max(32).optional().default(""),
  originalText: z.string().trim().max(300).optional(),
  optional: z.boolean().optional().default(false),
  substitutions: z.array(z.string().trim().max(120)).max(6).optional().default([]),
  category: z.enum(INGREDIENT_CATEGORIES).optional().default("other"),
});

export const recipeInstructionSchema = z.object({
  stepNumber: z.number().int().min(1).max(40),
  title: z.string().trim().min(2).max(120),
  instruction: z.string().trim().min(12).max(2000),
  minutes: z.number().int().min(0).max(180).optional(),
  heatLevel: z.enum(HEAT_LEVELS).optional(),
  equipment: z.array(z.enum(EQUIPMENT)).max(4).optional().default([]),
  cookingMethod: cookingMethodSchema.optional(),
  tips: z.array(z.string().trim().max(300)).max(4).optional().default([]),
  safetyNotes: z.array(z.string().trim().max(300)).max(4).optional().default([]),
});

export const recipeShoppingItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(200).optional(),
});

export const recipeShoppingSectionSchema = z.object({
  category: z.enum(SHOPPING_CATEGORIES),
  title: z.string().trim().max(80).optional(),
  items: z.array(recipeShoppingItemSchema).max(80),
});

export const recipeShoppingSchema = z.object({
  sections: z.array(recipeShoppingSectionSchema).max(12),
  estimatedCostUsd: z.number().finite().min(0).max(5000).optional(),
  estimatedCostLabel: z.string().trim().max(40).optional(),
});

export const recipeMediaSchema = z.object({
  heroImage: z.string().trim().max(500).optional(),
  cardImage: z.string().trim().max(500).optional(),
  mobileImage: z.string().trim().max(500).optional(),
  thumbnailImage: z.string().trim().max(500).optional(),
  imageAlt: z.string().trim().max(200).optional(),
  imagePrompt: z.string().trim().max(4000).optional(),
  imageStyleVersion: z.string().trim().max(16).optional(),
});

export const recipeFirehallMetaSchema = z.object({
  feedsHardScore: z.number().int().min(0).max(100).optional(),
  cleanupScore: z.number().int().min(0).max(100).optional(),
  rookieFriendly: z.boolean().optional(),
  stationFavorite: z.boolean().optional(),
  mealPrepFriendly: z.boolean().optional(),
  freezerFriendly: z.boolean().optional(),
});

export const recipeNutritionSchema = z.object({
  caloriesEstimate: z.number().finite().min(0).max(5000).optional(),
  proteinEstimate: z.number().finite().min(0).max(500).optional(),
  carbEstimate: z.number().finite().min(0).max(500).optional(),
  fatEstimate: z.number().finite().min(0).max(500).optional(),
  source: z.enum(["calculated", "curated", "estimated"]).optional(),
  filterFlags: z
    .object({
      highProtein: z.boolean(),
      under700Calories: z.boolean(),
      under30gFat: z.boolean(),
      highCarb: z.boolean(),
      lowCarb: z.boolean(),
      mealPrepFriendly: z.boolean(),
    })
    .optional(),
  badgeCandidates: z
    .object({
      highProtein: z.boolean(),
      lighterOption: z.boolean(),
      performanceMeal: z.boolean(),
    })
    .optional(),
});

export const recipeSourceSchema = z.object({
  sourceType: z.enum(SOURCE_TYPES),
  sourceName: z.string().trim().max(120).optional(),
  sourceUrl: z.string().trim().max(500).optional(),
  importedAt: isoDate.optional(),
  curatedBy: z.string().trim().max(80).optional(),
  externalId: z.string().trim().max(80).optional(),
  license: z.enum(["aggregator", "owned", "partner", "internal"]).optional(),
});

export const recipeSystemSchema = z.object({
  createdAt: isoDate,
  updatedAt: isoDate,
  schemaVersion: z.literal(RECIPE_SCHEMA_VERSION),
  validationStatus: z.enum(VALIDATION_STATUSES),
  qualityScore: z.number().int().min(0).max(100).optional(),
});

/** Optional legacy / transport fields — not required for catalog publish */
export const recipeLegacyHintsSchema = z
  .object({
    templateId: z.number().int().optional(),
    catalogId: z.string().trim().max(80).optional(),
    signature: z.string().trim().max(120).optional(),
    whyItFitsTonight: safeShort.optional(),
    cleanupTip: safeShort.optional(),
    proTips: z.array(z.string().trim().max(500)).max(8).optional(),
    mealPlateJson: z.record(z.unknown()).optional(),
  })
  .optional();

export const firehallRecipeSchema = z
  .object({
    identity: recipeIdentitySchema,
    classification: recipeClassificationSchema,
    timing: recipeTimingSchema,
    servings: recipeServingsSchema,
    ingredients: z.array(recipeIngredientSchema).min(1).max(80),
    instructions: z.array(recipeInstructionSchema).min(1).max(30),
    shopping: recipeShoppingSchema.optional(),
    media: recipeMediaSchema.optional().default({}),
    firehall: recipeFirehallMetaSchema.optional().default({}),
    nutrition: recipeNutritionSchema.optional().default({}),
    source: recipeSourceSchema,
    system: recipeSystemSchema,
    legacy: recipeLegacyHintsSchema,
  })
  .superRefine((data, ctx) => {
    if (data.servings.crewSizeMin > data.servings.crewSizeMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "crewSizeMin must be <= crewSizeMax",
        path: ["servings", "crewSizeMin"],
      });
    }
    const total = data.timing.prepMinutes + data.timing.cookMinutes;
    if (data.timing.totalMinutes < total - 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalMinutes should be at least prep + cook",
        path: ["timing", "totalMinutes"],
      });
    }
    const stepNums = new Set(data.instructions.map((s) => s.stepNumber));
    if (stepNums.size !== data.instructions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "instruction step numbers must be unique",
        path: ["instructions"],
      });
    }
  });

export type FirehallRecipe = z.infer<typeof firehallRecipeSchema>;
export type RecipeIdentity = z.infer<typeof recipeIdentitySchema>;
export type RecipeClassification = z.infer<typeof recipeClassificationSchema>;
export type RecipeTiming = z.infer<typeof recipeTimingSchema>;
export type RecipeServings = z.infer<typeof recipeServingsSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type RecipeInstruction = z.infer<typeof recipeInstructionSchema>;
export type RecipeShopping = z.infer<typeof recipeShoppingSchema>;
export type RecipeMedia = z.infer<typeof recipeMediaSchema>;
export type RecipeFirehallMeta = z.infer<typeof recipeFirehallMetaSchema>;
export type RecipeNutrition = z.infer<typeof recipeNutritionSchema>;
export type RecipeSource = z.infer<typeof recipeSourceSchema>;
export type RecipeSystem = z.infer<typeof recipeSystemSchema>;
