/** Legacy Performance Meal slugs → current catalog slug. */
export const PERFORMANCE_MEAL_SLUG_REDIRECTS: Record<string, string> = {
  "coconut-curry-chicken-pot": "boneless-chicken-thighs-sweet-potato-spinach",
};

export function resolvePerformanceMealSlug(slug: string): string {
  const key = slug.trim().toLowerCase();
  return PERFORMANCE_MEAL_SLUG_REDIRECTS[key] ?? key;
}
