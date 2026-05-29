import { getClassicHallMeal } from "../../shared/classic-hall-meals.js";
import { isFirehallOwnedHeroUrl } from "../../shared/food-imagery/paths.js";
import {
  buildCuratedMealImageProfile,
  validateCuratedImageGovernance,
} from "../../shared/curated-image-governance/index.js";
import { heroPathConflictsTitle } from "../../shared/meal-image-title-match.js";
import { getLatestAssetForRecipe } from "./asset-store.js";

export interface FoodImageryHeroContext {
  title?: string;
  protein?: string;
  cuisine?: string;
  mealFormat?: string;
}

/**
 * Resolve best hero URL for a recipe — generated asset > pinned classic > caller fallback.
 * Rejects imagery that fails curated governance (no keyword auto-assign).
 */
export async function resolveFoodImageryHero(
  recipeKey: string,
  fallback?: string,
  ctx: FoodImageryHeroContext = {},
): Promise<{ url: string; source: "generated" | "pinned" | "fallback" | "none" }> {
  const slug = recipeKey.replace(/^curated:/, "").trim();
  const title = ctx.title || slug;
  const profile = buildCuratedMealImageProfile({
    slug,
    title,
    protein: ctx.protein,
    cuisine: ctx.cuisine,
    mealFormat: ctx.mealFormat,
  });

  const accept = (url: string, source: "generated" | "pinned" | "fallback") => {
    if (!url?.trim()) return null;
    if (heroPathConflictsTitle(url, title, ctx.mealFormat)) return null;
    const gov = validateCuratedImageGovernance({
      profile,
      heroImage: url,
      publishGate: false,
    });
    if (!gov.pass && gov.mismatchConfidence >= 72) return null;
    return { url: url.trim(), source };
  };

  const asset = await getLatestAssetForRecipe(recipeKey);
  if (asset?.publicPath) {
    const ok = accept(asset.publicPath, "generated");
    if (ok) return ok;
  }

  const meta = getClassicHallMeal(recipeKey);
  if (meta?.heroImagePath?.trim()) {
    const ok = accept(meta.heroImagePath.trim(), "pinned");
    if (ok) return ok;
  }

  const fb = fallback?.trim() || "";
  if (fb && isFirehallOwnedHeroUrl(fb)) {
    const ok = accept(fb, "pinned");
    if (ok) return ok;
  }

  return { url: "", source: "none" };
}
