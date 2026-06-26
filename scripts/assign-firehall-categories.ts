#!/usr/bin/env tsx
/**
 * Assign Firehall Meals practical categories to the curated 150 (Golden 100 + Performance 50).
 *
 * Writes:
 * - curated_recipe_categories: one primary `fh:<id>` category per recipe
 * - curated_recipe_tags: `fh_primary:<id>` + `fh_tag:<id>` supporting tags (2–4)
 *
 * Usage:
 *   npm run assign:firehall-categories
 */
import { initCuratedRecipeStore, getCuratedRecipeById } from "../server/curated-recipe-store.js";
import {
  listCuratedSummariesByTag,
  replaceCuratedRecipeCategoryKeys,
  replaceCuratedRecipeFirehallTags,
} from "../server/curated-recipe-store.js";
import { GOLDEN_SET_TAG } from "../shared/golden-100/types.js";
import { PERFORMANCE_SET_TAG } from "../shared/performance-meals/types.js";
import {
  FIREHALL_CATEGORY_IDS,
  type FirehallCategoryId,
  firehallCategoryKey,
} from "../shared/firehall-categories.js";

function pickPrimary(r: {
  title: string;
  mealFormat: string;
  category: string;
  totalMinutes: number;
  cleanupDifficulty: number;
  scores: { comfort: number; healthy: number; firehallSuitability: number };
  metadata?: { nutritionCategory?: string; busyNightSuitable?: boolean };
  featured?: boolean;
  sourceKind?: string;
}): FirehallCategoryId {
  const t = `${r.title} ${r.category} ${r.mealFormat}`.toLowerCase();
  const nutrition = (r.metadata?.nutritionCategory || "").toLowerCase();

  // Breakfast → quick_meals for dinner generator (no fh:breakfast key).
  if (r.mealFormat === "breakfast" || /breakfast|pancake|egg|hash/.test(t)) return "quick_meals";

  // BBQ & Smoker
  if (/bbq|barbecue|smok|brisket|ribs|wings|grill/.test(t)) return "bbq_smoker";

  // Game day — watch-party / finger-food / pizza / burgers
  if (
    /nacho|dip|slider|wings|watch party|game day|finger food|loaded fries|pizza|burger|chili dog|queso|mozzarella stick|pretzel/.test(
      t,
    )
  ) {
    return "game_day";
  }

  // Feed a crowd
  if (/batch|feed|crowd|giant|tray|casserole|lasagna|ziti/.test(t)) return "feed_a_crowd";

  // Healthy / High protein — before quick/cleanup so lighter meals land in Healthy Options
  if (nutrition === "high_protein") return "high_protein";
  if (nutrition === "lighter" || nutrition === "healthy") return "healthy_options";

  // Quick meals
  if ((r.metadata?.busyNightSuitable && r.totalMinutes > 0 && r.totalMinutes <= 40) || /quick|fast|30/.test(t)) {
    return "quick_meals";
  }

  // Easy cleanup
  if (r.cleanupDifficulty <= 2 || /sheet pan|one pot|one-pan|skillet/.test(t)) return "easy_cleanup";

  // Comfort
  if (r.scores.comfort >= 70 || /comfort|mac|cheese|meatloaf|pot pie|mashed|stroganoff|alfredo/.test(t)) {
    return "comfort_food";
  }

  // Crew favorites
  if (r.featured || r.sourceKind === "hall_classic" || r.scores.firehallSuitability >= 75) return "crew_favorites";

  // Default
  return "crew_favorites";
}

function supportingTags(primary: FirehallCategoryId, r: { title: string; totalMinutes: number; cleanupDifficulty: number; metadata?: { nutritionCategory?: string; busyNightSuitable?: boolean } }): FirehallCategoryId[] {
  const t = r.title.toLowerCase();
  const nutrition = (r.metadata?.nutritionCategory || "").toLowerCase();

  const tags = new Set<FirehallCategoryId>();

  // Derive common supporting tags
  if (r.totalMinutes > 0 && r.totalMinutes <= 40) tags.add("quick_meals");
  if (r.cleanupDifficulty <= 2) tags.add("easy_cleanup");
  if (nutrition === "high_protein") tags.add("high_protein");
  if (nutrition === "lighter" || nutrition === "healthy") tags.add("healthy_options");
  if (/bbq|smok|grill|wings|ribs|brisket/.test(t)) tags.add("bbq_smoker");
  if (/nacho|dip|slider|wings|pizza|burger|finger|queso|pretzel|loaded fries/.test(t)) tags.add("game_day");
  if (/batch|feed|crowd|tray|casserole|lasagna|ziti|chili/.test(t)) tags.add("feed_a_crowd");
  if (/comfort|mac|cheese|pot pie|mashed|chili|stroganoff/.test(t)) tags.add("comfort_food");
  if (/breakfast|pancake|egg|hash|burrito/.test(t) && primary !== "quick_meals") tags.add("quick_meals");

  tags.delete(primary);

  // Keep 2–4 supporting tags
  const ordered = [...tags].filter((x) => (FIREHALL_CATEGORY_IDS as readonly string[]).includes(x));
  return ordered.slice(0, 4);
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  const golden = listCuratedSummariesByTag(GOLDEN_SET_TAG, 140, "published");
  const perf = listCuratedSummariesByTag(PERFORMANCE_SET_TAG, 80, "published");
  const targets = [...golden, ...perf];

  let updated = 0;
  for (const row of targets) {
    const full = getCuratedRecipeById(row.recipeId);
    if (!full) continue;

    const primary = pickPrimary({
      title: full.title,
      mealFormat: full.mealFormat,
      category: full.category,
      totalMinutes: full.totalMinutes,
      cleanupDifficulty: full.cleanupDifficulty,
      scores: full.scores,
      metadata: full.metadata,
      featured: full.featured,
      sourceKind: full.source.kind,
    });
    const tags = supportingTags(primary, {
      title: full.title,
      totalMinutes: full.totalMinutes,
      cleanupDifficulty: full.cleanupDifficulty,
      metadata: full.metadata,
    });

    replaceCuratedRecipeCategoryKeys(full.recipeId, [firehallCategoryKey(primary)]);
    replaceCuratedRecipeFirehallTags(full.recipeId, [
      `fh_primary:${primary}`,
      ...tags.map((t) => `fh_tag:${t}`),
    ]);
    updated++;
  }

  console.log(`[assign-firehall-categories] updated ${updated} recipes (target=${targets.length})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

