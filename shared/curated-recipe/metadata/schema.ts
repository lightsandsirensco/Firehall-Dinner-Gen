import { z } from "zod";
import {
  COOK_TIME_BUCKETS,
  CREW_SIZE_BUCKETS,
  CUISINE_KINDS,
  DIFFICULTY_LEVELS,
  EQUIPMENT_KINDS,
  HALL_TESTED_STATUSES,
  LEFTOVERS_QUALITY,
  MEAL_STYLES,
  METADATA_SCHEMA_VERSION,
  NUTRITION_CATEGORIES,
  PROTEIN_KINDS,
} from "./taxonomy.js";

const cleanup1to5 = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const curatedMetadataOverridesSchema = z
  .object({
    protein: z.enum(PROTEIN_KINDS).optional(),
    cuisine: z.enum(CUISINE_KINDS).optional(),
    difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
    cleanupDifficulty: cleanup1to5.optional(),
    cookTimeBucket: z.enum(COOK_TIME_BUCKETS).optional(),
    equipment: z.array(z.enum(EQUIPMENT_KINDS)).max(12).optional(),
    crewSizeBucket: z.enum(CREW_SIZE_BUCKETS).optional(),
    leftoversQuality: z.enum(LEFTOVERS_QUALITY).optional(),
    hallTested: z.enum(HALL_TESTED_STATUSES).optional(),
    featured: z.boolean().optional(),
    busyNightSuitable: z.boolean().optional(),
    mealStyle: z.enum(MEAL_STYLES).optional(),
    nutritionCategory: z.enum(NUTRITION_CATEGORIES).optional(),
  })
  .strict();

export const curatedRecipeMetadataSchema = z.object({
  schemaVersion: z.literal(METADATA_SCHEMA_VERSION),
  protein: z.enum(PROTEIN_KINDS),
  cuisine: z.enum(CUISINE_KINDS),
  difficulty: z.enum(DIFFICULTY_LEVELS),
  cleanupDifficulty: cleanup1to5,
  cookTimeBucket: z.enum(COOK_TIME_BUCKETS),
  totalMinutes: z.number().int().min(5).max(600),
  equipment: z.array(z.enum(EQUIPMENT_KINDS)).min(0).max(12),
  crewSize: z.object({
    bucket: z.enum(CREW_SIZE_BUCKETS),
    servingsBase: z.number().int().min(1).max(24),
    minCrew: z.number().int().min(1).max(24),
    maxCrew: z.number().int().min(1).max(24),
  }),
  leftoversQuality: z.enum(LEFTOVERS_QUALITY),
  hallTested: z.enum(HALL_TESTED_STATUSES),
  featured: z.boolean(),
  busyNightSuitable: z.boolean(),
  mealStyle: z.enum(MEAL_STYLES),
  nutritionCategory: z.enum(NUTRITION_CATEGORIES),
  overrides: curatedMetadataOverridesSchema.optional(),
  updatedAt: z.string().max(40).optional(),
});

export type CuratedRecipeMetadataParsed = z.infer<typeof curatedRecipeMetadataSchema>;

export function validateCuratedRecipeMetadata(
  input: unknown,
): { ok: true; data: CuratedRecipeMetadataParsed } | { ok: false; errors: string[] } {
  const result = curatedRecipeMetadataSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const errors = result.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`);
  return { ok: false, errors };
}
