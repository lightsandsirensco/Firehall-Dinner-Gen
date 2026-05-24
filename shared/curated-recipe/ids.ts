/**
 * Stable IDs for curated recipes — align with legacy catalog where possible.
 */

export function curatedRecipeIdFromSpoonacular(spoonacularId: number): string {
  return `spoonacular:${spoonacularId}`;
}

export function curatedRecipeIdFromSlug(slug: string): string {
  return `curated:${slug}`;
}

export function curatedRecipeIdFromImport(fingerprint: string): string {
  return `import:${fingerprint}`;
}

export function slugifyRecipeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "recipe";
}

export function parseSpoonacularIdFromRecipeId(recipeId: string): number | null {
  const m = recipeId.match(/^spoonacular:(\d+)$/);
  if (!m) return null;
  const id = parseInt(m[1], 10);
  return Number.isFinite(id) ? id : null;
}
