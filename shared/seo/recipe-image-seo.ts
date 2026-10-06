/**
 * Recipe image SEO — descriptive alt text for heroes and cards.
 * Filenames on disk stay slug-based; alt text carries search intent.
 */

export function buildRecipeHeroAlt(title: string): string {
  return title.trim();
}

/** Suggested SEO filename for future asset migrations (does not rename on disk). */
export function suggestRecipeImageFilename(slug: string, suffix = "jpg"): string {
  const base = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `firefighter-${base}.${suffix}`;
}
