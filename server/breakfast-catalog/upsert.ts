/**
 * Upsert Breakfast catalog pages into curated_recipes (same pipeline as Golden/Performance).
 */

import { mealFormatToArchetype } from "../../shared/canonical-recipe.js";
import { curatedRecipeIdFromSlug } from "../../shared/curated-recipe/ids.js";
import type { CuratedRecipeInsert } from "../../shared/curated-recipe/types.js";
import type { IngestRecipeDraft } from "../../shared/ingestion/recipe-ingest-schema.js";
import { assignExploreCategories } from "../../shared/ingestion/categorize.js";
import { computeIngestQualityScores } from "../../shared/ingestion/scoring.js";
import { recipeFingerprint } from "../../shared/ingestion/dedupe.js";
import type { BreakfastRecipePage } from "../../shared/breakfast-schema.js";
import { getCuratedRecipeBySlug, upsertCuratedRecipe } from "../curated-recipe-store.js";
import { curatedInsertFromIngestDraft } from "../curated-recipe-bridge.js";
import { buildGenerateResponseFromDraft } from "../ingestion/build-generate-response.js";
import { readBreakfastCatalogIndexFromDisk } from "./catalog.js";
import fs from "node:fs";
import path from "node:path";
import { breakfastRecipePageSchema } from "../../shared/breakfast-schema.js";

export const BREAKFAST_CATALOG_SET_TAG = "breakfast_catalog";
export const BREAKFAST_PAGE_CATEGORY = "breakfast_brunch";

const PAGES_DIR = path.join(process.cwd(), "client/public/catalog/breakfast/pages");

function breakfastTags(page: BreakfastRecipePage): string[] {
  const tags = new Set<string>([
    BREAKFAST_CATALOG_SET_TAG,
    `master:${BREAKFAST_PAGE_CATEGORY}`,
    "hall_meal",
    "breakfast",
    ...page.tags,
    ...page.filters,
  ]);
  if (page.totalTime <= 45) tags.add("quick_shift_meal");
  return [...tags];
}

function breakfastExplorePools(page: BreakfastRecipePage): string[] {
  const pools = new Set<string>(["breakfast_brunch", "breakfast", "firehall_breakfasts"]);
  for (const f of page.filters) {
    if (f === "feed_a_crew") pools.add("feed_a_crowd");
    if (f === "high_protein") pools.add("healthy_performance");
    if (f === "quick_breakfasts") pools.add("quick_shift_meals");
  }
  return [...pools];
}

function pageToIngestDraft(page: BreakfastRecipePage): IngestRecipeDraft {
  const totalMinutes = page.totalTime ?? page.prepTime + page.cookTime;
  const draft: IngestRecipeDraft = {
    fingerprint: "",
    source: "manual",
    title: page.title,
    summary: page.subtitle || page.description.slice(0, 160),
    heroImage: page.heroImage,
    imageAlt: page.imageAlt || page.title,
    ingredients: page.ingredients.map((ing) => ({
      name: ing.name,
      amount: parseFloat(String(ing.quantity ?? "1")) || 1,
      unit: "",
      original: [ing.quantity, ing.name, ing.notes].filter(Boolean).join(" ").trim(),
    })),
    steps: page.steps.map((s) => ({
      number: s.stepNumber,
      step: `${s.title}: ${s.instruction}`,
    })),
    cuisine: "american",
    protein: page.tags.find((t) => /chicken|steak|sausage|egg|pork|beef|turkey/i.test(t)) ?? "mixed",
    mealFormat: page.filters.includes("feed_a_crew") ? "crew_feed" : "breakfast_plate",
    mealArchetype: mealFormatToArchetype("breakfast_plate"),
    prepMinutes: page.prepTime,
    totalMinutes,
    cleanupDifficulty: 2,
    servingsBase: page.baseServings ?? page.crewSize,
    exploreCategories: breakfastExplorePools(page),
    tags: breakfastTags(page),
    trendScore: 68,
    comfortScore: 70,
    healthyScore: page.filters.includes("healthy_breakfasts") ? 82 : 58,
    firehallSuitabilityScore: 78,
    appetiteScore: 70,
    qualityScore: 78,
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

function buildBreakfastCuratedInsert(page: BreakfastRecipePage): CuratedRecipeInsert {
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
      { role: "hero", url: page.heroImage, altText: page.imageAlt || page.title, position: 0 },
      { role: "thumb", url: page.thumbImage, altText: page.imageAlt || page.title, position: 1 },
    ],
    category: BREAKFAST_PAGE_CATEGORY,
    featured: false,
    categories: breakfastExplorePools(page),
    tags: breakfastTags(page),
    scores: {
      comfort: 70,
      healthy: page.filters.includes("healthy_breakfasts") ? 82 : 58,
      firehallSuitability: 78,
      quality: 78,
      appetite: 70,
      trend: 68,
    },
    generateResponse,
    source: {
      kind: "manual",
      name: "Firehall Meals",
      url: "",
      license: "owned",
      externalId: `breakfast:${page.slug}`,
    },
  };
}

export function listBreakfastPagesFromDisk(): BreakfastRecipePage[] {
  const index = readBreakfastCatalogIndexFromDisk();
  if (!index) return [];
  const pages: BreakfastRecipePage[] = [];
  for (const entry of index.recipes) {
    const file = path.join(PAGES_DIR, `${entry.slug}.json`);
    if (!fs.existsSync(file)) continue;
    pages.push(breakfastRecipePageSchema.parse(JSON.parse(fs.readFileSync(file, "utf8"))));
  }
  return pages;
}

export async function upsertBreakfastCatalogPage(
  page: BreakfastRecipePage,
  options: { dryRun?: boolean; skipIfPublished?: boolean } = {},
): Promise<{ ok: boolean; reason?: string; recipeId?: string }> {
  if (options.skipIfPublished) {
    const existing = getCuratedRecipeBySlug(page.slug);
    if (existing?.tags?.includes(BREAKFAST_CATALOG_SET_TAG)) {
      return { ok: true, reason: "already_breakfast", recipeId: existing.recipeId };
    }
  }

  const insert = buildBreakfastCuratedInsert(page);
  if (options.dryRun) {
    return { ok: true, reason: "dry_run", recipeId: insert.recipeId };
  }

  upsertCuratedRecipe(insert);
  return { ok: true, recipeId: insert.recipeId };
}
