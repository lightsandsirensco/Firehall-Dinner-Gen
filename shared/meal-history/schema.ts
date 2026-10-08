import { z } from "zod";
import { FEEDBACK_TAGS } from "./types.js";

const costSnapshotSchema = z.object({
  totalMin: z.number().nonnegative(),
  totalMax: z.number().nonnegative(),
  perPersonMin: z.number().nonnegative(),
  perPersonMax: z.number().nonnegative(),
  trustworthy: z.boolean(),
});

/**
 * POST /api/meal-history body — recipe slug is authoritative; server
 * resolves title/path/image. Every other field is an OPTIONAL, client-
 * supplied snapshot of context that was actually on screen at the moment
 * the meal was logged (Shift Planner occasion/crew size, saved nutrition
 * goal, the recipe's own RecipeTags booleans, an already-computed cost
 * estimate). Never required, never fabricated when absent.
 */
const recipeSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid recipe identifier");

/** Stable id of the device-local history entry for the same cooked event (idempotency key). */
const clientEntryIdSchema = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/);

export const mealHistoryCreateSchema = z.object({
  recipe_slug: recipeSlugSchema,
  client_entry_id: clientEntryIdSchema.optional(),
  is_high_protein: z.boolean().optional(),
  is_high_fiber: z.boolean().optional(),
  hall_id: z.string().trim().min(1).max(64).optional(),
  meal_occasion: z.string().trim().min(1).max(32).optional(),
  crew_size: z.number().int().min(1).max(200).optional(),
  nutrition_goal: z.string().trim().min(1).max(32).optional(),
  cost: costSnapshotSchema.optional(),
});

export const MEAL_HISTORY_IMPORT_MAX = 200;

/** POST /api/meal-history/import body — device-local cooked entries to backfill. */
export const mealHistoryImportSchema = z.object({
  entries: z
    .array(
      z.object({
        client_entry_id: clientEntryIdSchema,
        recipe_slug: recipeSlugSchema,
        cooked_at: z.string().min(1).max(40),
        crew_size: z.number().int().min(1).max(200).optional(),
      }),
    )
    .max(MEAL_HISTORY_IMPORT_MAX),
});

/** PATCH /api/meal-history/:id/feedback body — every field optional, partial updates allowed (skip everything but a star tap). */
export const mealHistoryFeedbackSchema = z.object({
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  make_again: z.boolean().optional(),
  feedback_tags: z.array(z.enum(FEEDBACK_TAGS)).max(FEEDBACK_TAGS.length).optional(),
  note: z.string().trim().max(280).optional(),
});
