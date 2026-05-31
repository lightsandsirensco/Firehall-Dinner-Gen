import { CLASSIC_HALL_MEALS, getClassicHallMeal, resolveClassicHeroImage } from "./classic-hall-meals.js";
import { GENERATED_IMAGE_URL_PREFIX } from "./food-imagery/paths.js";
import { isImageReuseAndFallbacksDisabled } from "./image-reuse-policy.js";

/** Editorial / pinned hero for a generated meal when AI imagery is not ready. */
export function resolveEditorialFallbackHero(
  title: string,
  opts?: { mealFormat?: string; protein?: string },
): string | null {
  if (isImageReuseAndFallbacksDisabled()) return null;
  const t = title.trim().toLowerCase();
  // STRICT: Only return a pinned hero when the title is clearly the classic itself.
  // No heuristic remapping ("bbq chicken" -> bowls) — that caused broad image reuse.
  for (const meta of CLASSIC_HALL_MEALS) {
    const mt = meta.title.trim().toLowerCase();
    if (t === mt) {
      const path = resolveClassicHeroImage(meta);
      if (path.startsWith("/images/")) return path;
      if (meta.heroImagePath?.startsWith("/images/")) return meta.heroImagePath;
      return null;
    }
  }

  return null;
}

export function isGeneratedHeroPath(url: string): boolean {
  return url.trim().startsWith(GENERATED_IMAGE_URL_PREFIX);
}
