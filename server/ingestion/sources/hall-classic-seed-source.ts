/**
 * Hall classic meals as ingest drafts — no Spoonacular API calls.
 * Used to seed staging/catalog when API is down or for crew-trusted staples.
 */

import { CLASSIC_HALL_MEALS, resolveClassicHeroImage } from "../../../shared/classic-hall-meals.js";
import { assignExploreCategories } from "../../../shared/ingestion/categorize.js";
import { recipeFingerprint } from "../../../shared/ingestion/dedupe.js";
import { computeIngestQualityScores } from "../../../shared/ingestion/scoring.js";
import type { IngestRecipeDraft } from "../../../shared/ingestion/recipe-ingest-schema.js";
import { mealFormatToArchetype } from "../../../shared/canonical-recipe.js";
import type { RecipeResolutionSource } from "./types.js";
import type { TrendSignal } from "../../../shared/ingestion/recipe-ingest-schema.js";

export class HallClassicSeedSource implements RecipeResolutionSource {
  readonly name = "hall_classic_seed";

  constructor(private maxMeals = 10) {}

  async resolve(_signals: TrendSignal[]): Promise<IngestRecipeDraft[]> {
    const drafts: IngestRecipeDraft[] = [];

    for (const meal of CLASSIC_HALL_MEALS.slice(0, this.maxMeals)) {
      const mealFormat = meal.generatorFilters.meal_format || "plated_main";
      const base: IngestRecipeDraft = {
        fingerprint: "",
        source: "hall_classic",
        title: meal.title,
        summary: meal.description,
        heroImage: resolveClassicHeroImage(meal),
        imageAlt: meal.imageAlt,
        ingredients: [],
        steps: [],
        cuisine: meal.cuisine,
        protein: meal.protein.toLowerCase(),
        mealFormat,
        mealArchetype: mealFormatToArchetype(mealFormat),
        prepMinutes: 15,
        totalMinutes: 45,
        servingsBase: 8,
        exploreCategories: [],
        tags: meal.tags,
        trendScore: 90,
        comfortScore: 0,
        healthyScore: 0,
        firehallSuitabilityScore: 0,
        appetiteScore: 0,
        qualityScore: 0,
        sourceName: "Firehall Classics",
        sourceUrl: meal.externalUrl || "",
        license: "owned",
        spoonacularId: meal.spoonacularRecipeId,
        curatedSlug: meal.slug,
      };

      base.exploreCategories = assignExploreCategories(base);
      Object.assign(base, computeIngestQualityScores(base, base.trendScore));
      base.fingerprint = recipeFingerprint(base);
      drafts.push(base);
    }

    return drafts;
  }
}
