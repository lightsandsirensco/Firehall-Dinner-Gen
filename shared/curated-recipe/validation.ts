/**
 * Zod validation for curated recipe writes — gate ingestion & admin APIs.
 */

import { z } from "zod";

const score0to100 = z.number().int().min(0).max(100);
const cleanup1to5 = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const curatedIngredientSchema = z.object({
  position: z.number().int().min(0),
  name: z.string().min(1).max(200),
  amount: z.number().min(0),
  unit: z.string().max(40),
  originalText: z.string().min(1).max(500),
  category: z.string().max(60).optional(),
});

export const curatedInstructionSchema = z.object({
  stepNumber: z.number().int().min(1),
  heading: z.string().max(120).optional(),
  body: z.string().min(8).max(4000),
});

const ownedOrAbsoluteImageUrl = (v: string) =>
  /^https?:\/\//i.test(v) || v.startsWith("/images/");

export const curatedImageSchema = z.object({
  role: z.enum(["hero", "card", "og", "thumb"]),
  url: z
    .string()
    .max(2000)
    .refine(ownedOrAbsoluteImageUrl, {
      message: "image url must be absolute URL or site-root /images/ path",
    }),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  altText: z.string().max(300),
  dominantColor: z.string().max(20).optional(),
  blurHash: z.string().max(120).optional(),
  sourceAttribution: z.string().max(200).optional(),
  position: z.number().int().min(0).optional(),
});

export const curatedSourceSchema = z.object({
  kind: z.enum([
    "spoonacular",
    "publisher",
    "partner",
    "manual",
    "hall_classic",
    "import",
  ]),
  name: z.string().min(1).max(120),
  url: z.string().max(2000),
  license: z.enum(["aggregator", "owned", "partner"]),
  externalId: z.string().max(120).optional(),
});

export const curatedScoresSchema = z.object({
  comfort: score0to100,
  healthy: score0to100,
  firehallSuitability: score0to100,
  quality: score0to100,
  appetite: score0to100,
  trend: score0to100.optional(),
});

export const curatedRecipeInsertSchema = z.object({
  recipeId: z.string().min(3).max(120),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  status: z.enum(["draft", "review", "published", "archived"]).optional(),

  title: z.string().min(3).max(200),
  summary: z.string().max(2000).optional(),

  heroImage: z
    .string()
    .max(2000)
    .refine((v) => /^https?:\/\//i.test(v) || v.startsWith("/images/"), {
      message: "heroImage must be absolute URL or site-root /images/ path",
    }),
  images: z.array(curatedImageSchema).optional(),

  ingredients: z.array(curatedIngredientSchema).min(2),
  instructions: z.array(curatedInstructionSchema).min(2),

  prepMinutes: z.number().int().min(0).max(600),
  cookMinutes: z.number().int().min(0).max(600).optional(),
  totalMinutes: z.number().int().min(5).max(600),
  servingsBase: z.number().int().min(1).max(24),
  cleanupDifficulty: cleanup1to5,

  protein: z.string().min(1).max(40),
  cuisine: z.string().min(1).max(60),
  category: z.string().min(1).max(60),
  mealFormat: z.string().min(1).max(40),
  mealArchetype: z.string().min(1).max(40),
  archetypeFamily: z.string().max(40).optional(),
  archetypeVariation: z.string().max(80).optional(),
  qualityBreakdown: z
    .object({
      appetite: score0to100,
      imageQuality: score0to100,
      comfort: score0to100,
      hallSuitability: score0to100,
      cleanupDifficulty: z.number().min(1).max(5),
      realism: score0to100,
      visualQuality: score0to100,
      sideDishQuality: score0to100,
      proteinQuality: score0to100,
      ingredientCompleteness: score0to100,
      composite: score0to100,
    })
    .optional(),
  cookingStyle: z.string().max(60).optional(),

  tags: z.array(z.string().max(60)).max(40).optional(),
  categories: z.array(z.string().max(60)).max(20).optional(),

  scores: curatedScoresSchema,

  source: curatedSourceSchema,

  generateResponse: z.record(z.unknown()).optional(),
  legacyCatalogId: z.string().max(120).optional(),

  featured: z.boolean().optional(),
  trendingRank: z.number().int().min(0).optional(),
});

export type CuratedRecipeInsertInput = z.infer<typeof curatedRecipeInsertSchema>;

export function validateCuratedRecipeInsert(
  input: unknown,
): { ok: true; data: CuratedRecipeInsertInput } | { ok: false; errors: string[] } {
  const result = curatedRecipeInsertSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const errors = result.error.issues.map(
    (i) => `${i.path.join(".") || "root"}: ${i.message}`,
  );
  return { ok: false, errors };
}
