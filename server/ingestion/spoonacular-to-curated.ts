/**
 * Spoonacular search hit → full CuratedRecipeInsert for Explore seeding.
 */

import { getRecipeById } from "../spoonacular.js";
import { convertSpoonacularToGenerateResponse, inferActualProtein } from "../spoonacular-converter.js";
import type { GenerateRequest } from "../../shared/schema.js";
import type { CuratedRecipeInsert } from "../../shared/curated-recipe/types.js";
import { curatedRecipeIdFromSpoonacular, slugifyRecipeTitle } from "../../shared/curated-recipe/ids.js";
import { mealFormatToArchetype, publisherNameFromSourceUrl } from "../../shared/canonical-recipe.js";
import { assignExploreCategories } from "../../shared/ingestion/categorize.js";
import { computeIngestQualityScores } from "../../shared/ingestion/scoring.js";
import { upgradeSpoonacularImageSize } from "../../shared/explore-recipe.js";

const DEFAULT_REQUEST: GenerateRequest = {
  crew_size: 8,
  busy_level: "average",
  time_available: "30-45",
  appliances: ["stove", "oven"],
  protein: "any",
  healthiness_preference: "balanced",
  allergens_to_avoid: [],
  cuisine_style: "any",
  meal_format: "random",
  prefer_different_style: false,
};

export interface SpoonacularToCuratedOptions {
  spoonacularId: number;
  searchTitle: string;
  image?: string;
  sourceUrl?: string;
  trendScore?: number;
  extraCategories?: string[];
}

export async function buildCuratedInsertFromSpoonacular(
  options: SpoonacularToCuratedOptions,
): Promise<CuratedRecipeInsert | null> {
  const { spoonacularId, searchTitle } = options;
  if (!spoonacularId || spoonacularId <= 0) return null;

  try {
    const detail = await getRecipeById(spoonacularId, false);
    const ingredientNames = (detail.extendedIngredients || []).map(
      (i) => i.name || i.original || "",
    );
    const protein = inferActualProtein(detail.title, ingredientNames) || "mixed";
    const request: GenerateRequest = {
      ...DEFAULT_REQUEST,
      protein: protein as GenerateRequest["protein"],
      meal_format: "random",
    };
    const generateResponse = convertSpoonacularToGenerateResponse(detail, request, protein);
    const title = detail.title?.trim() || searchTitle;
    const heroImage =
      options.image?.includes("spoonacular.com")
        ? upgradeSpoonacularImageSize(options.image, "636x393")
        : upgradeSpoonacularImageSize(detail.image || "", "636x393");

    if (!heroImage?.includes("spoonacular.com")) return null;

    const mealFormat = "plated_main";
    const mealArchetype = mealFormatToArchetype(mealFormat);
    const prepMin = detail.preparationMinutes || Math.max(5, Math.floor((detail.readyInMinutes || 30) * 0.35));
    const totalMin = detail.readyInMinutes || 35;

    const draftBase = {
      title,
      summary: (detail.summary || "").replace(/<[^>]*>/g, "").slice(0, 400),
      heroImage,
      protein,
      cuisine: detail.cuisines?.[0] || "american",
      mealFormat,
      mealArchetype,
      prepMinutes: prepMin,
      totalMinutes: totalMin,
      servingsBase: Math.max(4, Math.min(12, detail.servings || 6)),
      tags: detail.dishTypes || [],
      trendScore: options.trendScore ?? 65,
    };

    const categories = [
      ...assignExploreCategories({
        title,
        summary: draftBase.summary,
        mealArchetype,
        protein,
        totalMinutes: totalMin,
        tags: draftBase.tags,
      }),
      ...(options.extraCategories || []),
    ];
    const uniqueCategories = [...new Set(categories.map((c) => c.toLowerCase()))];

    const scores = computeIngestQualityScores(
      {
        title,
        heroImage,
        totalMinutes: totalMin,
        mealFormat,
        mealArchetype,
        servingsBase: draftBase.servingsBase,
        steps: (generateResponse.steps || []).map((s) => ({
          heading: s.heading,
          body: s.body,
        })),
        tags: draftBase.tags,
        spoonacularId,
      },
      options.trendScore ?? 65,
    );

    const ingredients = (generateResponse.ingredients || []).map((ing, i) => {
      const name = ing.item || "ingredient";
      return {
        position: i,
        name,
        amount: parseFloat(String(ing.amount).match(/[\d.]+/)?.[0] || "0") || 0,
        unit: "",
        originalText: [ing.amount, ing.item, ing.notes].filter(Boolean).join(" ").trim() || name,
      };
    });

    const instructions = (generateResponse.steps || []).map((s, i) => ({
      stepNumber: i + 1,
      heading: s.heading || undefined,
      body: s.body || "",
    }));

    if (ingredients.length < 3 || instructions.length < 2) return null;

    const sourceUrl = options.sourceUrl || detail.sourceUrl || "";

    return {
      recipeId: curatedRecipeIdFromSpoonacular(spoonacularId),
      slug: slugifyRecipeTitle(title),
      status: "published",
      title,
      summary: generateResponse.why_it_fits_tonight,
      heroImage,
      images: [{ role: "hero", url: heroImage, altText: title, position: 0 }],
      ingredients,
      instructions,
      prepMinutes: prepMin,
      cookMinutes: Math.max(0, totalMin - prepMin),
      totalMinutes: totalMin,
      servingsBase: draftBase.servingsBase,
      cleanupDifficulty: 3,
      protein,
      cuisine: draftBase.cuisine,
      category: uniqueCategories[0] || mealArchetype,
      mealFormat,
      mealArchetype,
      tags: draftBase.tags,
      categories: uniqueCategories,
      scores: {
        comfort: scores.comfortScore,
        healthy: scores.healthyScore,
        firehallSuitability: scores.firehallSuitabilityScore,
        quality: scores.qualityScore,
        appetite: scores.appetiteScore,
        trend: options.trendScore ?? 65,
      },
      source: {
        kind: "spoonacular",
        name: publisherNameFromSourceUrl(sourceUrl),
        url: sourceUrl,
        license: "aggregator",
        externalId: String(spoonacularId),
      },
      generateResponse,
      legacyCatalogId: curatedRecipeIdFromSpoonacular(spoonacularId),
      featured: scores.qualityScore >= 70,
    };
  } catch {
    return null;
  }
}
