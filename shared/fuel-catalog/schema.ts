/**
 * Fuel catalog page schema — smoothies, breakfast, performance drinks (not dinner).
 */

import { z } from "zod";
import { smoothieTaxonomySchema } from "./smoothies/taxonomy.js";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const fuelIngredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.string().trim().max(80).optional(),
  unit: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(200).optional(),
});

export const fuelStepSchema = z.object({
  stepNumber: z.number().int().min(1).max(20),
  instruction: z.string().trim().min(25).max(800),
});

export const fuelNutritionSchema = z.object({
  calories: z.number().int().min(0).max(2000),
  protein: z.number().int().min(0).max(200),
  carbs: z.number().int().min(0).max(300),
  fats: z.number().int().min(0).max(200),
  fiber: z.number().int().min(0).max(100).optional(),
  highlights: z.string().trim().min(12).max(400),
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

export const fuelRecipePageSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(120),
  seoTitle: z.string().trim().min(3).max(120),
  subtitle: z.string().trim().min(10).max(200),
  description: z.string().trim().min(40).max(600),
  fuelType: z.enum(["smoothie", "breakfast", "recovery_drink"]),
  taxonomyCategory: z.string().trim().min(2).max(48),
  taxonomyLabel: z.string().trim().min(2).max(48),
  intro: z.string().trim().min(30).max(600),
  ingredients: z.array(fuelIngredientSchema).min(3).max(24),
  steps: z.array(fuelStepSchema).min(2).max(12),
  nutrition: fuelNutritionSchema,
  substitutions: z.array(z.string().trim().min(12).max(300)).max(6).optional(),
  shiftNote: z.string().trim().min(25).max(500),
  heroImage: z.string().trim().max(200),
  thumbImage: z.string().trim().max(200),
  tags: z.array(z.string().trim().min(1).max(48)).max(16),
  searchTerms: z.array(z.string().trim().min(1).max(80)).max(20),
  relatedSlugs: z.array(slugSchema).max(6),
  catalogSet: z.literal("fuel_smoothie"),
  generatedAt: z.string().trim().max(40),
  contentVersion: z.number().int().min(1).max(99),
});

export const fuelCatalogIndexSchema = z.object({
  version: z.number().int(),
  contentVersion: z.number().int(),
  generatedAt: z.string(),
  catalogSet: z.literal("fuel_smoothie"),
  recipeCount: z.number().int(),
  recipes: z.array(
    z.object({
      slug: slugSchema,
      title: z.string(),
      subtitle: z.string(),
      taxonomyCategory: smoothieTaxonomySchema,
      taxonomyLabel: z.string(),
      heroImage: z.string(),
      thumbImage: z.string(),
      calories: z.number().int(),
      protein: z.number().int(),
    }),
  ),
});

export type FuelRecipePage = z.infer<typeof fuelRecipePageSchema>;
export type FuelCatalogIndex = z.infer<typeof fuelCatalogIndexSchema>;
export type FuelIngredient = z.infer<typeof fuelIngredientSchema>;

export const FUEL_RECIPE_CONTENT_VERSION = 1 as const;
