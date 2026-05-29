/**
 * Firehall Breakfast — dedicated catalog (separate from dinner systems).
 */
import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const breakfastFilterSchema = z.enum([
  "quick_breakfasts",
  "feed_a_crew",
  "high_protein",
  "breakfast_sandwiches",
  "skillets",
  "bbq_breakfast",
  "healthy_breakfasts",
]);
export type BreakfastFilterId = z.infer<typeof breakfastFilterSchema>;

export const breakfastIngredientSchema = z.object({
  name: z.string().trim().min(1).max(140),
  quantity: z.string().trim().max(80).optional(),
  unit: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(220).optional(),
  group: z.string().trim().max(60).optional(),
  optional: z.boolean().optional(),
});

export const breakfastStepSchema = z.object({
  stepNumber: z.number().int().min(1).max(40),
  title: z.string().trim().min(2).max(120),
  instruction: z.string().trim().min(20).max(2200),
  minutes: z.number().int().min(0).max(180).optional(),
  tempF: z.number().int().min(0).max(600).optional(),
});

export const breakfastRecipePageSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(120),
  subtitle: z.string().trim().min(10).max(180),
  description: z.string().trim().min(30).max(900),
  filters: z.array(breakfastFilterSchema).min(1).max(6),
  tags: z.array(z.string().trim().min(2).max(48)).min(2).max(14),

  crewSize: z.number().int().min(4).max(12),
  baseServings: z.number().int().min(4).max(12).optional(),
  prepTime: z.number().int().min(0).max(180),
  cookTime: z.number().int().min(5).max(240),
  totalTime: z.number().int().min(5).max(300),
  difficulty: z.enum(["easy", "medium", "hard"]),

  ingredients: z.array(breakfastIngredientSchema).min(6).max(80),
  steps: z.array(breakfastStepSchema).min(4).max(22),

  stationWorkflow: z.array(z.string().trim().min(12).max(240)).min(3).max(10),
  cleanupNotes: z.array(z.string().trim().min(12).max(240)).min(2).max(8),
  leftovers: z.array(z.string().trim().min(12).max(240)).min(2).max(8),

  heroImage: z.string().trim().max(240),
  thumbImage: z.string().trim().max(240),
  imageAlt: z.string().trim().max(160),

  publishedAt: z.string().trim().max(40),
  updatedAt: z.string().trim().max(40),
  readMinutes: z.number().int().min(3).max(20),
  seoTitle: z.string().trim().max(80).optional(),
});

export type BreakfastRecipePage = z.infer<typeof breakfastRecipePageSchema>;

export const breakfastIndexEntrySchema = z.object({
  slug: slugSchema,
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  filters: z.array(breakfastFilterSchema),
  tags: z.array(z.string()),
  totalTime: z.number().int(),
  heroImage: z.string(),
  thumbImage: z.string(),
  publishedAt: z.string(),
});
export type BreakfastIndexEntry = z.infer<typeof breakfastIndexEntrySchema>;

export const breakfastCatalogIndexSchema = z.object({
  version: z.number().int(),
  generatedAt: z.string(),
  recipeCount: z.number().int(),
  recipes: z.array(breakfastIndexEntrySchema),
});
export type BreakfastCatalogIndex = z.infer<typeof breakfastCatalogIndexSchema>;

