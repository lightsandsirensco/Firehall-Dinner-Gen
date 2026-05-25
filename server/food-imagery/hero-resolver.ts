import { getClassicHallMeal } from "../../shared/classic-hall-meals.js";
import { isFirehallOwnedHeroUrl } from "../../shared/food-imagery/paths.js";
import { getLatestAssetForRecipe } from "./asset-store.js";

/**
 * Resolve best hero URL for a recipe — generated asset > pinned classic > caller fallback.
 */
export async function resolveFoodImageryHero(
  recipeKey: string,
  fallback?: string,
): Promise<{ url: string; source: "generated" | "pinned" | "fallback" }> {
  const asset = await getLatestAssetForRecipe(recipeKey);
  if (asset?.publicPath) {
    return { url: asset.publicPath, source: "generated" };
  }

  const meta = getClassicHallMeal(recipeKey);
  if (meta?.heroImagePath?.trim()) {
    return { url: meta.heroImagePath.trim(), source: "pinned" };
  }

  const fb = fallback?.trim() || "";
  if (fb && isFirehallOwnedHeroUrl(fb)) {
    return { url: fb, source: "pinned" };
  }

  return { url: fb, source: "fallback" };
}
