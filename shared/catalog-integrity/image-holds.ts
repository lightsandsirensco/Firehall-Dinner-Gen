/**
 * Recipes whose hero photo shows a different dish (vision-confirmed, review/hero-image-validation.json).
 * They stay out of "Pick Tonight's Meal" until a correct photo exists — no substitute image is used.
 */
export const TONIGHT_IMAGE_HOLDS: Readonly<Record<string, string>> = {
  "smoked-turkey-breast": "photo shows chicken wings, not a smoked turkey breast",
  "sheet-pan-meatball-marinara": "photo shows a meatball sandwich, not a sheet-pan meatball dinner",
  "hungarian-goulash-crew": "photo shows goulash over pasta; the recipe is served with potatoes",
  "sheet-pan-meal-prep": "photo shows a sheet pan, not meal-prep containers; sweet potato, broccoli and rice missing",
  "mediterranean-feast-night": "photo is missing the hummus, tzatziki, pita and feta and shows rice instead",
};

export function tonightImageHoldReason(slug: string): string | null {
  return TONIGHT_IMAGE_HOLDS[slug.trim().toLowerCase()] ?? null;
}
