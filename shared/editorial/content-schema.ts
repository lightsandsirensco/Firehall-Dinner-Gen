/**
 * Editorial guide articles — firefighter-native, operational, SEO-structured.
 */

import { z } from "zod";
import { editorialPillarSchema } from "./content-pillar.js";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const editorialTopicSchema = z.enum([
  "shift_operations",
  "meal_planning",
  "station_cooking",
  "crew_culture",
  "nutrition_performance",
  "station_lifestyle",
]);

export const editorialSectionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  heading: z.string().trim().min(3).max(120),
  paragraphs: z.array(z.string().trim().min(20).max(1200)).min(1).max(8),
  tips: z.array(z.string().trim().min(12).max(400)).max(8).optional(),
});

export const editorialMealPickSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  title: z.string().trim().min(2).max(120),
  blurb: z.string().trim().min(20).max(280),
  /** Route breakfast picks to /breakfast/{slug} instead of /recipes/{slug} */
  catalog: z.enum(["breakfast", "recipes"]).optional(),
});

export const editorialFaqSchema = z.object({
  question: z.string().trim().min(10).max(200),
  answer: z.string().trim().min(30).max(800),
});

/** Inline recipe (smoothies, etc.) — adapted Firehall originals, not catalog slugs */
export const editorialEmbeddedIngredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.string().trim().max(80).optional(),
  unit: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(200).optional(),
});

export const editorialEmbeddedRecipeSchema = z.object({
  id: slugSchema,
  name: z.string().trim().min(3).max(120),
  category: z.string().trim().min(2).max(48).optional(),
  intro: z.string().trim().min(30).max(500),
  ingredients: z.array(editorialEmbeddedIngredientSchema).min(3).max(20),
  instructions: z.array(z.string().trim().min(25).max(600)).min(2).max(8),
  nutritionHighlights: z.string().trim().min(20).max(400),
  substitutions: z.array(z.string().trim().min(12).max(300)).max(6).optional(),
  shiftNote: z.string().trim().min(25).max(500),
  imagePath: z.string().trim().max(200).optional(),
  imageAlt: z.string().trim().max(160).optional(),
});

export const editorialArticleSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(10).max(120),
  subtitle: z.string().trim().min(10).max(200),
  description: z.string().trim().min(40).max(320),
  topic: editorialTopicSchema,
  pillar: editorialPillarSchema.optional(),
  intro: z.string().trim().min(80).max(1200),
  sections: z.array(editorialSectionSchema).min(1).max(12),
  practicalAdvice: z.array(z.string().trim().min(20).max(500)).min(3).max(10),
  mealRecommendations: z.array(editorialMealPickSchema).min(3).max(30),
  faqs: z.array(editorialFaqSchema).min(2).max(10),
  relatedArticleSlugs: z.array(slugSchema).max(6).optional(),
  keywords: z.array(z.string().trim().min(2).max(48)).max(16),
  publishedAt: z.string().trim().max(40),
  updatedAt: z.string().trim().max(40),
  readMinutes: z.number().int().min(3).max(30),
  /** Optional custom SEO title (≤80 chars with brand suffix applied in metadata) */
  seoTitle: z.string().trim().max(80).optional(),
  heroImage: z.string().trim().max(200).optional(),
  heroImageAlt: z.string().trim().max(160).optional(),
  embeddedRecipes: z.array(editorialEmbeddedRecipeSchema).min(1).max(20).optional(),
});

export const editorialIndexEntrySchema = z.object({
  slug: slugSchema,
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  topic: editorialTopicSchema,
  pillar: editorialPillarSchema.optional(),
  readMinutes: z.number().int(),
  publishedAt: z.string(),
});

export const editorialCatalogIndexSchema = z.object({
  version: z.number().int(),
  generatedAt: z.string(),
  articleCount: z.number().int(),
  articles: z.array(editorialIndexEntrySchema),
});

export type EditorialTopic = z.infer<typeof editorialTopicSchema>;
export type EditorialSection = z.infer<typeof editorialSectionSchema>;
export type EditorialMealPick = z.infer<typeof editorialMealPickSchema>;
export type EditorialFaq = z.infer<typeof editorialFaqSchema>;
export type EditorialEmbeddedIngredient = z.infer<typeof editorialEmbeddedIngredientSchema>;
export type EditorialEmbeddedRecipe = z.infer<typeof editorialEmbeddedRecipeSchema>;
export type EditorialArticle = z.infer<typeof editorialArticleSchema>;
export type EditorialIndexEntry = z.infer<typeof editorialIndexEntrySchema>;
export type EditorialCatalogIndex = z.infer<typeof editorialCatalogIndexSchema>;

export const EDITORIAL_CONTENT_VERSION = 3 as const;

export function guidePath(slug: string): string {
  return `/guides/${slug}`;
}

export function guidesIndexPath(): string {
  return "/guides";
}
