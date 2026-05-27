import { getClassicHallMeal } from "../../shared/classic-hall-meals.js";
import { isFirehallOwnedHeroUrl } from "../../shared/food-imagery/paths.js";
import { resolveEditorialFallbackHero } from "../../shared/meal-hero-fallback.js";
import { heroPathConflictsTitle } from "../../shared/meal-image-title-match.js";
import { getLatestAssetForRecipe } from "./asset-store.js";
import type { HeroImageStatus } from "./meal-integration.js";

export type HeroSource =
  | "generated_asset"
  | "pinned_classic"
  | "editorial_fallback"
  | "caller_owned"
  | "pending"
  | "unavailable";

export interface HeroHierarchyResult {
  hero_image?: string;
  hero_image_alt?: string;
  hero_image_status: HeroImageStatus;
  hero_image_source?: "generated" | "editorial_fallback" | "pinned";
  source: HeroSource;
}

/**
 * Runtime hero resolution order (documented hierarchy):
 * 1. Latest succeeded generated asset for any alias key
 * 2. Pinned hall classic hero path
 * 3. Caller-provided owned URL (editorial / explore)
 * 4. Editorial category fallback image
 * 5. pending (job queued/running) or unavailable
 */
export async function resolveHeroHierarchy(opts: {
  recipeKeys: string[];
  title?: string;
  mealFormat?: string;
  protein?: string;
  pinnedSlug?: string;
  callerHero?: string;
  imageryEnabled: boolean;
  latestJobFailed: boolean;
}): Promise<HeroHierarchyResult> {
  const alt = opts.title ? `${opts.title} — Firehall Meals` : "Firehall meal";

  for (const key of opts.recipeKeys) {
    const asset = await getLatestAssetForRecipe(key);
    if (asset?.publicPath) {
      const title = opts.title || "";
      if (title && heroPathConflictsTitle(asset.publicPath, title, opts.mealFormat)) {
        continue;
      }
      return {
        hero_image: asset.publicPath,
        hero_image_alt: alt,
        hero_image_status: "ready",
        hero_image_source: "generated",
        source: "generated_asset",
      };
    }
  }

  for (const key of opts.recipeKeys) {
    const slug = key.replace(/^curated:/, "").replace(/^meal:(id|sig):/, "");
    const classic = getClassicHallMeal(slug);
    if (classic?.heroImagePath?.trim()) {
      return {
        hero_image: classic.heroImagePath.trim(),
        hero_image_alt: alt,
        hero_image_status: "ready",
        hero_image_source: "pinned",
        source: "pinned_classic",
      };
    }
  }

  const caller = opts.callerHero?.trim() || "";
  if (caller && isFirehallOwnedHeroUrl(caller)) {
    return {
      hero_image: caller,
      hero_image_alt: alt,
      hero_image_status: "ready",
      hero_image_source: "pinned",
      source: "caller_owned",
    };
  }

  const fb = resolveEditorialFallbackHero(opts.title || "", {
    mealFormat: opts.mealFormat,
    protein: opts.protein,
  });
  if (fb && !heroPathConflictsTitle(fb, opts.title || "", opts.mealFormat)) {
    return {
      hero_image: fb,
      hero_image_alt: alt,
      hero_image_status: "ready",
      hero_image_source: "editorial_fallback",
      source: "editorial_fallback",
    };
  }

  if (!opts.imageryEnabled) {
    return { hero_image_status: "unavailable", source: "unavailable" };
  }

  if (opts.latestJobFailed) {
    return { hero_image_status: "unavailable", source: "unavailable" };
  }

  return { hero_image_status: "pending", source: "pending" };
}
