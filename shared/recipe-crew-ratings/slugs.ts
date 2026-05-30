export const RED_LEAD_RECIPE_RATING_SLUG = "firefighter-red-lead-recipe" as const;

export function exploreRecipeRatingSlug(recipeId: number): string {
  return `explore-${recipeId}`;
}

export function parseExploreRecipeRatingSlug(slug: string): number | null {
  const match = /^explore-(\d+)$/.exec(slug.trim().toLowerCase());
  if (!match) return null;
  const id = Number.parseInt(match[1]!, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}
