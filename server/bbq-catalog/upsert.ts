/**
 * Upsert BBQ catalog pages into curated_recipes.
 */

import { mealFormatToArchetype } from "../../shared/canonical-recipe.js";
import { curatedRecipeIdFromSlug } from "../../shared/curated-recipe/ids.js";
import type { CuratedRecipeInsert } from "../../shared/curated-recipe/types.js";
import type { IngestRecipeDraft } from "../../shared/ingestion/recipe-ingest-schema.js";
import { assignExploreCategories } from "../../shared/ingestion/categorize.js";
import { computeIngestQualityScores } from "../../shared/ingestion/scoring.js";
import { recipeFingerprint } from "../../shared/ingestion/dedupe.js";
import type { GoldenRecipePage } from "../../shared/golden-100/recipe-page-schema.js";
import { goldenRecipePageSchema } from "../../shared/golden-100/recipe-page-schema.js";
import { BBQ_30_PAGE_CATEGORY } from "../../shared/bbq-30/types.js";
import { getCuratedRecipeBySlug, upsertCuratedRecipe } from "../curated-recipe-store.js";
import { curatedInsertFromIngestDraft } from "../curated-recipe-bridge.js";
import { buildGenerateResponseFromDraft } from "../ingestion/build-generate-response.js";
import { readBbqCatalogIndexFromDisk } from "./catalog.js";
import fs from "node:fs";
import path from "node:path";

export const BBQ_CATALOG_SET_TAG = "bbq_catalog_batch_25";

const PAGES_DIR = path.join(process.cwd(), "client/public/catalog/bbq/pages");

function bbqTags(page: GoldenRecipePage): string[] {
  return [...new Set([BBQ_CATALOG_SET_TAG, `master:${BBQ_30_PAGE_CATEGORY}`, "bbq", "smoker", "grill", ...page.tags])];
}

function bbqExplorePools(page: GoldenRecipePage): string[] {
  return [...new Set(["bbq_grill_nights", "bbq", "bbq_smoker", "smoker_recipes", ...page.tags.filter((t) => !t.includes(":"))])];
}

function pageToIngestDraft(page: GoldenRecipePage): IngestRecipeDraft {
  const totalMinutes = (page.prepTime ?? 0) + page.cookTime;
  const draft: IngestRecipeDraft = {
    fingerprint: "",
    source: "manual",
    title: page.title,
    summary: page.subtitle || page.description.slice(0, 160),
    heroImage: page.heroImage,
    imageAlt: page.heroImageAlt || page.title,
    ingredients: page.ingredients.map((ing) => ({
      name: ing.name,
      amount: parseFloat(String(ing.quantity ?? "1")) || 1,
      unit: ing.unit || "",
      original: [ing.quantity, ing.unit, ing.name, ing.notes].filter(Boolean).join(" ").trim(),
    })),
    steps: page.steps.map((s) => ({
      number: s.stepNumber,
      step: `${s.title}: ${s.instruction}`,
    })),
    cuisine: page.cuisine,
    protein: page.tags.find((t) => t.startsWith("protein:"))?.replace("protein:", "") ?? "mixed",
    mealFormat: page.tags.find((t) => t.startsWith("format:"))?.replace("format:", "") ?? "bbq",
    mealArchetype: mealFormatToArchetype("bbq_plate"),
    prepMinutes: page.prepTime ?? 20,
    totalMinutes,
    cleanupDifficulty: page.cleanupDifficulty === "heavy" ? 4 : page.cleanupDifficulty === "easy" ? 1 : 2,
    servingsBase: page.baseServings ?? page.crewSize,
    exploreCategories: bbqExplorePools(page),
    tags: bbqTags(page),
    trendScore: 72,
    comfortScore: 78,
    healthyScore: 55,
    firehallSuitabilityScore: 88,
    appetiteScore: 82,
    qualityScore: 85,
    sourceName: "Firehall Meals",
    sourceUrl: "",
    license: "owned",
    curatedSlug: page.slug,
  };

  draft.exploreCategories = assignExploreCategories(draft);
  Object.assign(draft, computeIngestQualityScores(draft, draft.trendScore));
  draft.fingerprint = recipeFingerprint(draft);
  return draft;
}

function buildBbqCuratedInsert(page: GoldenRecipePage): CuratedRecipeInsert {
  const draft = pageToIngestDraft(page);
  const insert = curatedInsertFromIngestDraft(draft);
  const generateResponse = buildGenerateResponseFromDraft(draft);

  generateResponse.title = page.title;
  generateResponse.why_it_fits_tonight = page.subtitle;
  generateResponse._recipe_source = {
    kind: "curated",
    name: "Firehall Meals",
    url: "",
    license: "owned",
  };

  return {
    ...insert,
    recipeId: curatedRecipeIdFromSlug(page.slug),
    slug: page.slug,
    status: "published",
    title: page.title,
    summary: page.subtitle || page.description.slice(0, 200),
    heroImage: page.heroImage,
    images: [
      { role: "hero", url: page.heroImage, altText: page.heroImageAlt || page.title, position: 0 },
      { role: "thumb", url: page.thumbImage, altText: page.heroImageAlt || page.title, position: 1 },
    ],
    category: BBQ_30_PAGE_CATEGORY,
    featured: true,
    categories: bbqExplorePools(page),
    tags: bbqTags(page),
    scores: {
      comfort: 78,
      healthy: 55,
      firehallSuitability: 88,
      quality: 85,
      appetite: 82,
      trend: 72,
    },
    generateResponse,
    source: {
      kind: "manual",
      name: "Firehall Meals",
      url: "",
      license: "owned",
      externalId: `bbq:${page.slug}`,
    },
  };
}

export function listBbqPagesFromDisk(): GoldenRecipePage[] {
  const index = readBbqCatalogIndexFromDisk();
  if (!index) return [];
  const pages: GoldenRecipePage[] = [];
  for (const entry of index.recipes) {
    const file = path.join(PAGES_DIR, `${entry.slug}.json`);
    if (!fs.existsSync(file)) continue;
    pages.push(goldenRecipePageSchema.parse(JSON.parse(fs.readFileSync(file, "utf8"))));
  }
  return pages;
}

export async function upsertBbqCatalogPage(
  page: GoldenRecipePage,
  options: { dryRun?: boolean; skipIfPublished?: boolean } = {},
): Promise<{ ok: boolean; reason?: string; recipeId?: string }> {
  if (options.skipIfPublished) {
    const existing = getCuratedRecipeBySlug(page.slug);
    if (existing?.tags?.includes(BBQ_CATALOG_SET_TAG)) {
      return { ok: true, reason: "already_bbq", recipeId: existing.recipeId };
    }
  }

  const insert = buildBbqCuratedInsert(page);
  if (options.dryRun) {
    return { ok: true, reason: "dry_run", recipeId: insert.recipeId };
  }

  upsertCuratedRecipe(insert);
  return { ok: true, recipeId: insert.recipeId };
}
