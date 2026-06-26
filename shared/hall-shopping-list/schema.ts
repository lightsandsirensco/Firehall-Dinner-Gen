import { z } from "zod";

export const addShoppingListItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.string().max(120).optional().default(""),
  section: z.string().max(80).optional().default("Other"),
});

export const addRecipeIngredientsSchema = z.object({
  recipe_title: z.string().min(1).max(200),
  recipe_slug: z.string().max(120).optional(),
  sections: z.array(
    z.object({
      title: z.string(),
      items: z.array(
        z.object({
          name: z.string().min(1),
          amount: z.string().optional().default(""),
          notes: z.string().optional().default(""),
        }),
      ),
    }),
  ),
});

export const updateShoppingListItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  quantity: z.string().max(120).optional(),
  purchased: z.boolean().optional(),
});

export const updateShoppingListSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  runner_user_id: z.string().nullable().optional(),
  runner_name: z.string().max(120).nullable().optional(),
});

export const exportShoppingListSchema = z.object({
  format: z.enum(["pdf", "text"]),
});
