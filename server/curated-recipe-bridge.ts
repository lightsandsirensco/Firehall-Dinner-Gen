/**
 * Bridges legacy shapes → CuratedRecipeInsert (canonical catalog, ingestion drafts).
 */

import type { CanonicalRecipe } from "../shared/canonical-recipe.js";
import type { IngestRecipeDraft } from "../shared/ingestion/recipe-ingest-schema.js";
import type { GenerateResponse } from "../shared/schema.js";
import type { CuratedRecipeInsert } from "../shared/curated-recipe/types.js";
import {
  curatedRecipeIdFromImport,
  curatedRecipeIdFromSpoonacular,
  slugifyRecipeTitle,
} from "../shared/curated-recipe/ids.js";
import {
  inferHallArchetypeFamily,
  archetypeToLegacyMealArchetype,
  pickArchetypeVariation,
  archetypeExplorePools,
} from "../shared/meal-archetype-system.js";
import {
  scoreRecipeQuality,
  qualityInputFromIngestDraft,
} from "../shared/recipe-quality-score.js";

function ingredientsFromGenerate(recipe: GenerateResponse): CuratedRecipeInsert["ingredients"] {
  const raw = recipe.ingredients || [];
  return raw.map((ing, i) => {
    const name = ing.item || "ingredient";
    const originalText =
      [ing.amount, ing.item, ing.notes].filter(Boolean).join(" ").trim() || name;
    const amountMatch = String(ing.amount || "").match(/[\d.]+/);
    return {
      position: i,
      name,
      amount: amountMatch ? parseFloat(amountMatch[0]) : 0,
      unit: "",
      originalText,
    };
  });
}

function instructionsFromGenerate(recipe: GenerateResponse): CuratedRecipeInsert["instructions"] {
  const steps = recipe.steps || [];
  return steps.map((s, i) => ({
    stepNumber: i + 1,
    heading: s.heading || undefined,
    body: s.body || "",
  }));
}

export function curatedInsertFromCanonical(c: CanonicalRecipe): CuratedRecipeInsert {
  const gr = c.generateResponse;
  const cookMinutes = Math.max(
    0,
    (gr.timing?.cook_minutes ?? 0) ||
      (c.totalMinutes - c.prepMinutes),
  );

  return {
    recipeId: c.catalogId,
    slug: c.curatedSlug || slugifyRecipeTitle(c.title),
    status: "published",
    title: c.title,
    summary: gr.why_it_fits_tonight,
    heroImage: c.heroImage,
    images: [
      {
        role: "hero",
        url: c.heroImage,
        altText: c.imageAlt || c.title,
        position: 0,
      },
    ],
    ingredients: ingredientsFromGenerate(gr),
    instructions: instructionsFromGenerate(gr),
    prepMinutes: c.prepMinutes,
    cookMinutes,
    totalMinutes: c.totalMinutes,
    servingsBase: c.servingsBase,
    cleanupDifficulty: c.cleanupDifficulty,
    protein: c.protein,
    cuisine: c.cuisine,
    category: c.mealArchetype,
    mealFormat: c.mealFormat,
    mealArchetype: c.mealArchetype,
    cookingStyle: c.cookingStyle,
    tags: c.tags,
    categories: [c.mealArchetype, c.mealFormat].filter(Boolean),
    scores: {
      comfort: c.comfortScore,
      healthy: c.healthyScore,
      firehallSuitability: c.firehallSuitabilityScore,
      quality: c.qualityScore,
      appetite: c.appetiteScore,
    },
    source: {
      kind: c.source.kind === "curated" ? "manual" : c.source.kind,
      name: c.source.name,
      url: c.source.url,
      license: c.source.license,
      externalId: c.spoonacularId ? String(c.spoonacularId) : undefined,
    },
    generateResponse: gr,
    legacyCatalogId: c.catalogId,
    featured: false,
  };
}

export function curatedInsertFromIngestDraft(d: IngestRecipeDraft): CuratedRecipeInsert {
  const recipeId = d.spoonacularId
    ? curatedRecipeIdFromSpoonacular(d.spoonacularId)
    : d.curatedSlug
      ? `curated:${d.curatedSlug}`
      : curatedRecipeIdFromImport(d.fingerprint);

  const archetypeFamily = inferHallArchetypeFamily({
    title: d.title,
    summary: d.summary,
    mealFormat: d.mealFormat,
    tags: d.tags,
    protein: d.protein,
  });
  const mealArchetype = archetypeToLegacyMealArchetype(archetypeFamily);
  const archetypeVariation = pickArchetypeVariation(archetypeFamily, d.title);
  const poolTags = archetypeExplorePools(archetypeFamily);
  const qualityBreakdown = scoreRecipeQuality({
    ...qualityInputFromIngestDraft(d),
    trendScore: d.trendScore,
  });

  return {
    recipeId,
    slug: d.curatedSlug || slugifyRecipeTitle(d.title),
    status: "review",
    title: d.title,
    summary: d.summary,
    heroImage: d.heroImage,
    images: [
      {
        role: "hero",
        url: d.heroImage,
        altText: d.imageAlt || d.title,
        position: 0,
      },
    ],
    ingredients: d.ingredients.map((ing, i) => ({
      position: i,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      originalText: ing.original,
      category: ing.category,
    })),
    instructions: d.steps.map((s) => ({
      stepNumber: s.number,
      body: s.step,
    })),
    prepMinutes: d.prepMinutes,
    totalMinutes: d.totalMinutes,
    servingsBase: d.servingsBase,
    cleanupDifficulty: Math.min(5, Math.max(1, qualityBreakdown.cleanupDifficulty)) as 1 | 2 | 3 | 4 | 5,
    protein: d.protein,
    cuisine: d.cuisine,
    category: d.exploreCategories[0] || mealArchetype,
    mealFormat: d.mealFormat,
    mealArchetype,
    archetypeFamily,
    archetypeVariation,
    qualityBreakdown,
    tags: Array.from(
      new Set([
        ...(d.tags || []),
        `archetype:${archetypeFamily}`,
        `variation:${archetypeVariation}`,
      ]),
    ),
    categories: Array.from(
      new Set([
        ...(d.exploreCategories.length ? d.exploreCategories : poolTags),
        ...poolTags,
      ]),
    ),
    scores: {
      comfort: qualityBreakdown.comfort,
      healthy: d.healthyScore,
      firehallSuitability: qualityBreakdown.hallSuitability,
      quality: qualityBreakdown.composite,
      appetite: qualityBreakdown.appetite,
      trend: d.trendScore,
    },
    source: {
      kind:
        d.source === "publisher"
          ? "publisher"
          : d.source === "hall_classic"
            ? "hall_classic"
            : d.source === "spoonacular"
              ? "spoonacular"
              : "import",
      name: d.sourceName,
      url: d.sourceUrl,
      license: d.license,
      externalId: d.spoonacularId ? String(d.spoonacularId) : undefined,
    },
    generateResponse: d.generateResponse,
    legacyCatalogId: recipeId,
    featured: false,
  };
}
