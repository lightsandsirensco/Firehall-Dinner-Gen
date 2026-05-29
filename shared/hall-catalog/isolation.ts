/**
 * Hall catalog boundaries.
 *
 * The hall catalog is: Golden + Performance + BBQ (curated meals).
 * Excluded: smoothies (fuel drinks) and breakfast meals (separate file).
 */

export function isBreakfastMeal(input: { category?: string; mealFormat?: string; tags?: string[] }): boolean {
  const cat = (input.category || "").toLowerCase();
  const fmt = (input.mealFormat || "").toLowerCase();
  if (cat === "breakfast_brunch") return true;
  if (fmt === "breakfast") return true;
  if (input.tags?.some((t) => t.toLowerCase() === "format:breakfast")) return true;
  return false;
}

