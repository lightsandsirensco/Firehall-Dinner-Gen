import type { CatalogIngredientLine } from "./types.js";

export function defaultRecipeServings(
  page: { crewSize?: number; baseServings?: number },
  mealType: "dinner" | "breakfast" | "smoothie",
): number {
  if (page.baseServings) return page.baseServings;
  if (page.crewSize) return page.crewSize;
  if (mealType === "smoothie") return 4;
  if (mealType === "breakfast") return 8;
  return 8;
}

export function catalogIngredientsFromUnknown(raw: unknown): CatalogIngredientLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((ing) => {
    const i = ing as Record<string, unknown>;
    return {
      name: String(i.name || ""),
      quantity: i.quantity != null ? String(i.quantity) : undefined,
      unit: i.unit != null ? String(i.unit) : undefined,
      notes: i.notes != null ? String(i.notes) : undefined,
      optional: Boolean(i.optional),
    };
  });
}
