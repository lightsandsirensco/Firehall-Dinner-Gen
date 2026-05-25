import { resolveCuratedSlugFromTitle } from "./curated-hall-packages.js";
import { getClassicHallMeal, resolveClassicHeroImage } from "./classic-hall-meals.js";
import { GENERATED_IMAGE_URL_PREFIX } from "./food-imagery/paths.js";

/** Editorial / pinned hero for a generated meal when AI imagery is not ready. */
export function resolveEditorialFallbackHero(
  title: string,
  opts?: { mealFormat?: string; protein?: string },
): string | null {
  const slug = resolveCuratedSlugFromTitle(title);
  if (slug) {
    const meta = getClassicHallMeal(slug);
    if (meta) {
      const path = resolveClassicHeroImage(meta);
      if (path.startsWith("/images/")) return path;
    }
  }

  const t = `${title} ${opts?.mealFormat || ""} ${opts?.protein || ""}`.toLowerCase();
  if (/pizza/.test(t)) return null;
  if (/taco|burrito/.test(t)) {
    const meta = getClassicHallMeal("steak-tacos");
    if (meta?.heroImagePath) return meta.heroImagePath;
  }
  if (/burger|smash/.test(t)) {
    const meta = getClassicHallMeal("smash-burgers");
    if (meta?.heroImagePath) return meta.heroImagePath;
  }
  if (/chili|stew/.test(t)) {
    const meta = getClassicHallMeal("chili-garlic-bread");
    if (meta?.heroImagePath) return meta.heroImagePath;
  }
  if (/chicken/.test(t) && /bowl|bbq/.test(t)) {
    const meta = getClassicHallMeal("bbq-chicken-bowls");
    if (meta?.heroImagePath) return meta.heroImagePath;
  }

  return null;
}

export function isGeneratedHeroPath(url: string): boolean {
  return url.trim().startsWith(GENERATED_IMAGE_URL_PREFIX);
}
