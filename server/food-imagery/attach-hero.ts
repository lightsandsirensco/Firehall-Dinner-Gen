import { log } from "../logger.js";
import { getCuratedRecipeById, upsertCuratedRecipe } from "../curated-recipe-store.js";
import { getSharedLocalDb } from "../sqlite.js";
import type { FoodImageryContext } from "../../shared/food-imagery/types.js";
import type { IngestRecipeDraft } from "../../shared/ingestion/recipe-ingest-schema.js";
function heroUrlForDb(publicPath: string): string {
  if (/^https?:\/\//i.test(publicPath)) return publicPath;
  return publicPath.startsWith("/") ? publicPath : `/${publicPath}`;
}

/** Patch curated_recipes hero + image row after generation. */
export async function attachGeneratedHeroToCurated(
  recipeId: string,
  publicPath: string,
  altText: string,
): Promise<boolean> {
  const existing = getCuratedRecipeById(recipeId);
  if (!existing) return false;

  const heroUrl = heroUrlForDb(publicPath);

  const insert = {
    recipeId: existing.recipeId,
    slug: existing.slug,
    status: existing.status,
    title: existing.title,
    summary: existing.summary ?? undefined,
    heroImage: heroUrl,
    heroImageAlt: altText,
    prepMinutes: existing.prepMinutes,
    cookMinutes: existing.cookMinutes,
    totalMinutes: existing.totalMinutes,
    servingsBase: existing.servingsBase,
    cleanupDifficulty: existing.cleanupDifficulty,
    protein: existing.protein,
    cuisine: existing.cuisine,
    category: existing.category,
    mealFormat: existing.mealFormat,
    mealArchetype: existing.mealArchetype,
    archetypeFamily: existing.archetypeFamily,
    archetypeVariation: existing.archetypeVariation,
    qualityBreakdown: existing.qualityBreakdown,
    scores: existing.scores,
    tags: existing.tags,
    categories: existing.categories,
    source: existing.source,
    ingredients: existing.ingredients,
    instructions: existing.instructions,
    images: [
      {
        role: "hero" as const,
        url: heroUrl,
        altText,
        position: 0,
        sourceAttribution: "firehall-ai",
      },
    ],
    generateResponse: existing.generateResponse,
    legacyCatalogId: existing.legacyCatalogId,
    featured: existing.featured,
    trendingRank: existing.trendingRank,
  };

  upsertCuratedRecipe(insert);
  log(`[food-imagery] attached hero ${publicPath} → ${recipeId}`, "catalog");
  return true;
}

export async function attachGeneratedHeroBySlug(
  slug: string,
  publicPath: string,
  altText: string,
): Promise<boolean> {
  const db = await getSharedLocalDb();
  const row = db
    .prepare(`SELECT recipe_id FROM curated_recipes WHERE slug = ? AND status != 'archived' LIMIT 1`)
    .get(slug) as { recipe_id: string } | undefined;
  if (!row) return false;
  return attachGeneratedHeroToCurated(row.recipe_id, publicPath, altText);
}

export function foodImageryContextFromDraft(draft: IngestRecipeDraft): FoodImageryContext {
  return {
    recipeKey: draft.curatedSlug || draft.fingerprint,
    title: draft.title,
    summary: draft.summary,
    cuisine: draft.cuisine,
    mealFormat: draft.mealFormat,
    protein: draft.protein,
    ingredients: draft.ingredients?.map((i) => ({ name: i.name })),
    tags: draft.tags,
    heroImage: draft.heroImage,
    sourceKind: draft.source,
  };
}
