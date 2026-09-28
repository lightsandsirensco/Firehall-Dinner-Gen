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
export const mealHistoryCreateSchema = z.object({
  recipe_slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid recipe identifier"),
  is_high_protein: z.boolean().optional(),
  is_high_fiber: z.boolean().optional(),
  hall_id: z.string().trim().min(1).max(64).optional(),
  meal_occasion: z.string().trim().min(1).max(32).optional(),
  crew_size: z.number().int().min(1).max(200).optional(),
  nutrition_goal: z.string().trim().min(1).max(32).optional(),
  cost: costSnapshotSchema.optional(),
});

/** PATCH /api/meal-history/:id/feedback body — every field optional, partial updates allowed (skip everything but a star tap). */
export const mealHistoryFeedbackSchema = z.object({
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  make_again: z.boolean().optional(),
  feedback_tags: z.array(z.enum(FEEDBACK_TAGS)).max(FEEDBACK_TAGS.length).optional(),
  note: z.string().trim().max(280).optional(),
});
