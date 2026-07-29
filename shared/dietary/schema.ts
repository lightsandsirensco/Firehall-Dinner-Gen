/**
 * Zod schema for the persisted per-recipe dietary/allergen profile.
 * Shape mirrors `RecipeDietaryProfile` from classify-recipe.ts so it can be
 * embedded directly in any recipe page schema (golden-100, breakfast,
 * fuel-catalog) and in catalog index entries (as `dietarySummary`).
 */
import { z } from "zod";

const allergenKeySchema = z.enum([
  "gluten", "dairy", "egg", "soy", "treeNuts", "peanuts", "shellfish", "fish", "sesame", "pork", "alcohol",
]);

export const dietaryFlagsSchema = z.object({
  glutenFree: z.boolean(),
  dairyFree: z.boolean(),
  eggFree: z.boolean(),
  nutFree: z.boolean(),
  peanutFree: z.boolean(),
  soyFree: z.boolean(),
  shellfishFree: z.boolean(),
  fishFree: z.boolean(),
  porkFree: z.boolean(),
  vegetarian: z.boolean(),
  vegan: z.boolean(),
});

export const dietaryAdaptableSchema = z.object({
  flag: z.enum(["gluten", "dairy", "egg", "soy", "treeNuts", "peanuts", "pork", "alcohol"]),
  label: z.string(),
  note: z.string(),
});

export const recipeDietaryProfileSchema = z.object({
  confidence: z.enum(["high", "low"]),
  matchedCount: z.number().int().min(0),
  totalCount: z.number().int().min(0),
  uncertainIngredients: z.array(z.object({ name: z.string(), reason: z.string() })),
  flaggedIngredients: z.array(z.object({ name: z.string(), allergens: z.array(allergenKeySchema) })),
  flags: dietaryFlagsSchema,
  adaptable: z.array(dietaryAdaptableSchema),
  classifiedAt: z.string().trim().max(40).optional(),
});

export type DietaryFlags = z.infer<typeof dietaryFlagsSchema>;
export type RecipeDietaryProfileSchema = z.infer<typeof recipeDietaryProfileSchema>;

/** Compact projection embedded in catalog index entries — enough to power Explore filters without fetching full pages. */
export const dietarySummarySchema = z.object({
  confidence: z.enum(["high", "low"]),
  flags: dietaryFlagsSchema,
  adaptable: z.array(dietaryAdaptableSchema),
});
export type DietarySummary = z.infer<typeof dietarySummarySchema>;

export function toDietarySummary(profile: RecipeDietaryProfileSchema): DietarySummary {
  return { confidence: profile.confidence, flags: profile.flags, adaptable: profile.adaptable };
}

/** Explore-filterable dietary flag keys, in display order. */
export const DIETARY_FILTER_KEYS = [
  "vegetarian",
  "vegan",
  "glutenFree",
  "dairyFree",
  "eggFree",
  "nutFree",
  "peanutFree",
  "soyFree",
  "shellfishFree",
  "fishFree",
  "porkFree",
] as const;
export type DietaryFilterKey = (typeof DIETARY_FILTER_KEYS)[number];

export const DIETARY_FILTER_LABELS: Record<DietaryFilterKey, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  glutenFree: "Gluten-Free",
  dairyFree: "Dairy-Free",
  eggFree: "Egg-Free",
  nutFree: "Nut-Free",
  peanutFree: "Peanut-Free",
  soyFree: "Soy-Free",
  shellfishFree: "Shellfish-Free",
  fishFree: "Fish-Free",
  porkFree: "Pork-Free",
};
