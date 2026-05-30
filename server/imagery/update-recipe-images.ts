/**
 * Persist editorial image metadata + hero URLs on curated recipes.
 */

import { log } from "../logger.js";
import { getCuratedRecipeBySlug, getCuratedRecipeById, upsertCuratedRecipe } from "../curated-recipe-store.js";
import type { CuratedRecipeInsert } from "../../shared/curated-recipe/types.js";
import type { EditorialImageMetadata } from "../../shared/editorial-image-metadata.js";
import { parseEditorialImageMetadata } from "../../shared/editorial-image-metadata.js";
import { applySubjectLockToMetadata } from "../../shared/image-subject-lock.js";
import { scoreImageIntegrity } from "../../shared/image-integrity.js";

export interface AttachEditorialImagesOptions {
  slug: string;
  metadata: EditorialImageMetadata;
  /** When false, keeps imageApproved false for review queue */
  markApproved?: boolean;
  /** Skip integrity gate (remediation scripts only) */
  forceApprove?: boolean;
}

function recipeToInsert(
  existing: NonNullable<ReturnType<typeof getCuratedRecipeBySlug>>,
  metadata: EditorialImageMetadata,
  markApproved: boolean,
  forceApprove = false,
): CuratedRecipeInsert {
  const integrity = scoreImageIntegrity({
      slug: existing.slug,
      title: existing.title,
      protein: existing.protein,
      cuisine: existing.cuisine,
      mealFormat: existing.mealFormat,
      heroImage: metadata.heroImage,
      heroAlt: existing.title,
      imageApproved: markApproved ? metadata.imageApproved : false,
    });
  const approved = forceApprove || (markApproved && integrity.pass);
  const meta: EditorialImageMetadata = applySubjectLockToMetadata(
    {
      ...metadata,
      imageApproved: approved ? metadata.imageApproved : false,
      imageVersion: (metadata.imageVersion || 0) + 1,
    },
    {
      title: existing.title,
      cuisine: existing.cuisine,
      mealFormat: existing.mealFormat,
    },
    { score: integrity.score, flags: integrity.flags },
  );

  const heroUrl = metadata.heroImage;
  const images = [
    {
      role: "hero" as const,
      url: heroUrl,
      altText: existing.title,
      position: 0,
      sourceAttribution: "firehall-editorial",
    },
    {
      role: "card" as const,
      url: metadata.mobileHeroImage,
      altText: existing.title,
      position: 1,
      sourceAttribution: "firehall-editorial-mobile",
    },
    {
      role: "thumb" as const,
      url: metadata.thumbnailImage,
      altText: existing.title,
      position: 2,
      sourceAttribution: "firehall-editorial-thumb",
    },
    {
      role: "card" as const,
      url: metadata.railPreviewImage || metadata.mobileHeroImage,
      altText: existing.title,
      position: 3,
      sourceAttribution: "firehall-editorial-rail",
    },
  ];

  const tags = [
    ...existing.tags.filter((t) => !t.startsWith("img_preset:")),
    `img_preset:${meta.stylePreset}`,
    "editorial_imagery",
  ];
  if (meta.imageApproved) tags.push("image_approved");

  return {
    recipeId: existing.recipeId,
    slug: existing.slug,
    status: existing.status,
    title: existing.title,
    summary: existing.summary,
    heroImage: heroUrl,
    images,
    ingredients: existing.ingredients,
    instructions: existing.instructions,
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
    cookingStyle: existing.cookingStyle,
    scores: existing.scores,
    tags,
    categories: existing.categories,
    source: existing.source,
    generateResponse: existing.generateResponse,
    legacyCatalogId: existing.legacyCatalogId,
    featured: existing.featured,
    trendingRank: existing.trendingRank,
    editorialImage: meta,
  };
}

export function getEditorialImageForSlug(slug: string): EditorialImageMetadata | null {
  const recipe = getCuratedRecipeBySlug(slug);
  if (!recipe?.editorialImage) return null;
  return parseEditorialImageMetadata(recipe.editorialImage) ?? recipe.editorialImage;
}

export function attachEditorialImagesToSlug(
  options: AttachEditorialImagesOptions,
): boolean {
  const existing = getCuratedRecipeBySlug(options.slug);
  if (!existing) {
    log(`[imagery] no curated recipe for slug=${options.slug}`, "catalog");
    return false;
  }

  const insert = recipeToInsert(existing, options.metadata, options.markApproved ?? false, options.forceApprove);
  upsertCuratedRecipe(insert);
  log(
    `[imagery] attached editorial images slug=${options.slug} v=${insert.editorialImage?.imageVersion} approved=${insert.editorialImage?.imageApproved}`,
    "catalog",
  );
  return true;
}

export function markEditorialImageApproved(slug: string, approved = true): boolean {
  const existing = getCuratedRecipeBySlug(slug);
  if (!existing?.editorialImage) return false;
  const meta = { ...existing.editorialImage, imageApproved: approved };
  return attachEditorialImagesToSlug({ slug, metadata: meta, markApproved: approved });
}
