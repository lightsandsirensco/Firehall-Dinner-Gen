/**
 * Zod schemas for recommendation API payloads.
 */

import { z } from "zod";
import { MASTER_CATEGORY_IDS } from "../categories/constants.js";

export const recommendationContextQuerySchema = z.object({
  crew_size: z.coerce.number().int().min(2).max(20).optional(),
  max_ready_minutes: z.coerce.number().int().min(15).max(180).optional(),
  performance_mode: z.coerce.number().min(0).max(1).optional(),
  seen: z.string().optional(),
  recent_proteins: z.string().optional(),
  diet: z.string().optional(),
  intolerances: z.string().optional(),
  excludeIngredients: z.string().optional(),
});

export const suggestionQuerySchema = z.object({
  crew_size: z.coerce.number().int().min(2).max(20).optional(),
  limit: z.coerce.number().int().min(1).max(12).optional(),
});

export const categorySuggestionSchema = z.object({
  categoryId: z.enum(MASTER_CATEGORY_IDS),
  displayName: z.string(),
  reason: z.string(),
  score: z.number(),
});

export const contextualSuggestionsSchema = z.object({
  engineVersion: z.number(),
  timeSlot: z.string(),
  suggestions: z.array(categorySuggestionSchema),
  hooks: z.array(z.string()),
});
