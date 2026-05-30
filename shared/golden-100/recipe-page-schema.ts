/**
 * Golden 100 static recipe page — normalized editorial document.
 */

import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const goldenRecipePageIngredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.string().trim().max(80).optional(),
  unit: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(200).optional(),
  group: z.string().trim().max(40).optional(),
  optional: z.boolean().optional(),
});

export const goldenRecipePageStepSchema = z.object({
  stepNumber: z.number().int().min(1).max(40),
  title: z.string().trim().min(2).max(120),
  instruction: z.string().trim().min(20).max(2000),
  minutes: z.number().int().min(0).max(480).optional(),
  heatLevel: z.enum(["low", "medium-low", "medium", "medium-high", "high", ""]).optional(),
});

export const goldenRecipePageNutritionSchema = z.object({
  calories: z.number().int().min(0).max(5000),
  protein: z.number().int().min(0).max(500),
  carbs: z.number().int().min(0).max(500),
  fats: z.number().int().min(0).max(500),
  label: z.string().trim().max(80).optional(),
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

export const goldenRecipePageSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(120),
  displayTitle: z.string().trim().min(3).max(72).optional(),
  seoTitle: z.string().trim().max(80).optional(),
  shortDescription: z.string().trim().max(200).optional(),
  subtitle: z.string().trim().max(160),
  category: z.string().trim().min(1).max(80),
  cuisine: z.string().trim().min(1).max(48),
  description: z.string().trim().min(20).max(800),
  crewSize: z.number().int().min(2).max(16),
  baseServings: z.number().int().min(2).max(16).optional(),
  cookTime: z.number().int().min(5).max(720),
  prepTime: z.number().int().min(0).max(240).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  calories: z.number().int().min(0).max(5000),
  protein: z.number().int().min(0).max(500),
  carbs: z.number().int().min(0).max(500),
  fats: z.number().int().min(0).max(500),
  tags: z.array(z.string().trim().min(1).max(48)).max(24),
  equipment: z.array(z.string().trim().min(1).max(80)).max(12),
  ingredients: z.array(goldenRecipePageIngredientSchema).min(3).max(80),
  steps: z.array(goldenRecipePageStepSchema).min(2).max(30),
  proTips: z.array(z.string().trim().min(12).max(500)).min(2).max(8),
  tonightSpread: z.array(z.string().trim().min(12).max(500)).min(1).max(6),
  leftovers: z.array(z.string().trim().min(12).max(500)).min(1).max(5),
  whyCrewsLikeIt: z.string().trim().max(500).optional(),
  mealPrepNotes: z.string().trim().max(500).optional(),
  substitutions: z.array(z.string().trim().min(8).max(200)).max(8).optional(),
  spiceLevel: z.enum(["mild", "medium", "hot"]).optional(),
  cleanupDifficulty: z.enum(["easy", "medium", "heavy"]).optional(),
  nutrition: goldenRecipePageNutritionSchema,
  heroImage: z.string().trim().max(500),
  heroImageAlt: z.string().trim().max(160).optional(),
  mobileImage: z.string().trim().max(500),
  thumbImage: z.string().trim().max(500),
  railImage: z.string().trim().max(500),
  realismScore: z.number().int().min(0).max(100),
  firefighterScore: z.number().int().min(0).max(100),
  popularityWeight: z.number().min(0).max(10),
  searchTerms: z.array(z.string().trim().min(1).max(80)).max(20),
  relatedSlugs: z.array(slugSchema).max(8),
  sourceName: z.string().trim().max(120).optional(),
  sourceUrl: z.string().trim().max(500).optional(),
  classicSlug: z.string().trim().max(120).optional(),
  generatedAt: z.string().trim().max(40),
  contentVersion: z.number().int().min(1).max(99),
});

export type GoldenRecipePage = z.infer<typeof goldenRecipePageSchema>;
export type GoldenRecipePageIngredient = z.infer<typeof goldenRecipePageIngredientSchema>;
export type GoldenRecipePageStep = z.infer<typeof goldenRecipePageStepSchema>;

export const GOLDEN_RECIPE_PAGE_CONTENT_VERSION = 2 as const;

export interface GoldenCatalogIndexEntry {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  cuisine: string;
  protein: string;
  mealFormat: string;
  cookTime: number;
  difficulty: "easy" | "medium" | "hard";
  heroImage: string;
  thumbImage: string;
  tags: string[];
  firefighterScore: number;
  popularityWeight: number;
  searchTerms: string[];
}

export const goldenCatalogIndexSchema = z.object({
  version: z.number().int(),
  contentVersion: z.number().int(),
  generatedAt: z.string(),
  recipeCount: z.number().int(),
  recipes: z.array(
    z.object({
      slug: slugSchema,
      title: z.string(),
      subtitle: z.string(),
      category: z.string(),
      cuisine: z.string(),
      protein: z.string(),
      mealFormat: z.string(),
      cookTime: z.number().int(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      heroImage: z.string(),
      thumbImage: z.string(),
      tags: z.array(z.string()),
      firefighterScore: z.number().int(),
      popularityWeight: z.number(),
      searchTerms: z.array(z.string()),
    }),
  ),
});

export type GoldenCatalogIndex = z.infer<typeof goldenCatalogIndexSchema>;
