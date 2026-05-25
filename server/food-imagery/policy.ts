import { isFirehallOwnedHeroUrl } from "../../shared/food-imagery/paths.js";
import { scoreImageQuality } from "../../shared/recipe-quality-score.js";
import type { FoodImageryContext } from "../../shared/food-imagery/types.js";
import { getFoodImageryConfig } from "./config.js";

export function shouldGenerateFoodImagery(ctx: FoodImageryContext, force = false): boolean {
  if (force) return true;
  const cfg = getFoodImageryConfig();
  if (!cfg.enabled) return false;

  if (ctx.pinnedHeroPath?.trim() && !force) return false;

  const hero = ctx.heroImage?.trim() || "";
  const isGeneratedMeal =
    ctx.sourceKind === "generated" ||
    ctx.recipeKey.startsWith("meal:") ||
    ctx.recipeKey.startsWith("pizza:");
  if (isGeneratedMeal && cfg.enabled) return true;
  if (cfg.preservePublisherHeroes && ctx.sourceKind === "publisher" && hero && !hero.includes("spoonacular.com")) {
    return false;
  }

  if (isFirehallOwnedHeroUrl(hero)) return false;

  if (!cfg.replaceAggregatorHeroes && hero && !hero.includes("spoonacular.com")) {
    return false;
  }

  if (!hero || hero.includes("spoonacular.com")) return true;

  const quality = scoreImageQuality(hero, ctx.sourceKind);
  return quality < 72;
}
