/**
 * Resolves trend keywords → Spoonacular recipes (licensed aggregator path).
 * Batch/offline only — not for live Explore.
 */

import { searchRecipes } from "../../spoonacular.js";
import { log } from "../../logger.js";
import type { IngestRecipeDraft, TrendSignal } from "../../../shared/ingestion/recipe-ingest-schema.js";
import { assignExploreCategories } from "../../../shared/ingestion/categorize.js";
import { recipeFingerprint } from "../../../shared/ingestion/dedupe.js";
import { computeIngestQualityScores } from "../../../shared/ingestion/scoring.js";
import { mealFormatToArchetype, publisherNameFromSourceUrl } from "../../../shared/canonical-recipe.js";
import { spoonacularImageUrl, upgradeSpoonacularImageSize } from "../../../shared/explore-recipe.js";
import type { RecipeResolutionSource } from "./types.js";

function inferProtein(title: string): string {
  const t = title.toLowerCase();
  if (/chicken/.test(t)) return "chicken";
  if (/beef|steak|brisket/.test(t)) return "beef";
  if (/pork|sausage|bacon/.test(t)) return "pork";
  if (/salmon|fish|shrimp|seafood/.test(t)) return "seafood";
  if (/turkey/.test(t)) return "turkey";
  if (/tofu|lentil|bean|vegetarian/.test(t)) return "vegetarian";
  return "mixed";
}

function inferMealFormat(title: string): string {
  const t = title.toLowerCase();
  if (/pasta|spaghetti|lasagna/.test(t)) return "pasta";
  if (/taco|burrito|fajita/.test(t)) return "tacos";
  if (/burger/.test(t)) return "burger";
  if (/sandwich|wrap|slider/.test(t)) return "sandwich";
  if (/bowl/.test(t)) return "bowl";
  if (/chili|stew|soup/.test(t)) return "soup_chili";
  if (/sheet pan/.test(t)) return "sheet_pan";
  if (/slow cooker|crockpot/.test(t)) return "one_pot";
  return "plated_main";
}

export class SpoonacularResolveSource implements RecipeResolutionSource {
  readonly name = "spoonacular_resolve";

  constructor(private resultsPerSignal = 1) {}

  async resolve(signals: TrendSignal[]): Promise<IngestRecipeDraft[]> {
    const drafts: IngestRecipeDraft[] = [];

    for (const signal of signals) {
      try {
        const result = await searchRecipes(signal.keyword, {
          number: this.resultsPerSignal + 2,
          sort: "popularity",
        });

        const hit = result.results[0];
        if (!hit?.id) continue;

        const mealFormat = inferMealFormat(hit.title);
        const mealArchetype = mealFormatToArchetype(mealFormat);
        const protein = inferProtein(hit.title);
        const heroImage = hit.image?.includes("spoonacular.com")
          ? upgradeSpoonacularImageSize(hit.image, "636x393")
          : spoonacularImageUrl(hit.id);

        const base: IngestRecipeDraft = {
          fingerprint: "",
          source: signal.source === "pinterest" ? "pinterest" : "spoonacular",
          title: hit.title,
          heroImage,
          imageAlt: hit.title,
          ingredients: [],
          steps: [],
          cuisine: "american",
          protein,
          mealFormat,
          mealArchetype,
          prepMinutes: Math.max(5, Math.floor((hit.readyInMinutes || 30) * 0.35)),
          totalMinutes: hit.readyInMinutes || 30,
          cleanupDifficulty: 3,
          servingsBase: hit.servings || 6,
          exploreCategories: [],
          tags: signal.tags || [],
          trendScore: signal.trendScore,
          comfortScore: 0,
          healthyScore: 0,
          firehallSuitabilityScore: 0,
          appetiteScore: 0,
          qualityScore: 0,
          sourceName: publisherNameFromSourceUrl(hit.sourceUrl),
          sourceUrl: hit.sourceUrl || signal.destinationUrl || "",
          license: "aggregator",
          spoonacularId: hit.id,
        };

        base.exploreCategories = assignExploreCategories({
          ...base,
          summary: hit.summary,
        });
        Object.assign(base, computeIngestQualityScores({ ...base, summary: hit.summary }, signal.trendScore));
        base.fingerprint = recipeFingerprint(base);

        drafts.push(base);
        await new Promise((r) => setTimeout(r, 350));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`[ingestion] resolve failed keyword="${signal.keyword}": ${msg}`, "ingestion");
      }
    }

    return drafts;
  }
}
