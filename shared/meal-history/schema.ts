import { z } from "zod";

/** POST /api/meal-history body — recipe slug only; server resolves everything else. */
export const mealHistoryCreateSchema = z.object({
  recipe_slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid recipe identifier"),
});
