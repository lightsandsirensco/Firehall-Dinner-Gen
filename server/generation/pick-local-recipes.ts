/**
 * Local recipe picks for generate pipeline — curated editorial + Golden 100.
 */

import type { GenerateRequest, GenerateResponse } from "@shared/schema";
import type { RecipeSourceAttribution } from "../../shared/canonical-recipe.js";
import { GOLDEN_SET_TAG } from "../../shared/golden-100/types.js";
import { applyCrewPortionFloors, hallProTips } from "../firehall-voice.js";
import {
  getCuratedRecipeBySlug,
  listCuratedRecipeSummaries,
  listCuratedSummariesByTag,
} from "../curated-recipe-store.js";
import { proteinMatchesFilter } from "../spoonacular-converter.js";
import { computeSignature } from "../validateRecipe.js";
import { log } from "../logger.js";

const TIME_MAX_MINUTES: Record<string, number> = {
  "15-25": 25,
  "20-30": 30,
  "25-40": 40,
  "30-45": 45,
  "45-60": 60,
  "60-90": 90,
};

export interface LocalRecipePick {
  recipe: GenerateResponse;
  protein: string;
  originalTitle: string;
  catalogId: string;
  recipeSource?: RecipeSourceAttribution;
  slug: string;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function signatureBlocked(
  sig: string,
  recentSignatures?: string[],
  currentRecipeSignature?: string,
): boolean {
  if (currentRecipeSignature && sig === currentRecipeSignature) return true;
  if (recentSignatures?.includes(sig)) return true;
  return false;
}

function scoreCuratedRow(
  row: { protein: string; totalMinutes: number; scores: { quality: number }; sourceKind: string },
  request: GenerateRequest,
): number {
  let score = row.scores.quality || 0;
  const selected = request.protein || "any";
  if (proteinMatchesFilter(row.protein, selected)) score += 40;
  const maxMin = TIME_MAX_MINUTES[request.time_available];
  if (maxMin && row.totalMinutes > 0 && row.totalMinutes <= maxMin + 10) score += 15;
  if (row.sourceKind === "publisher") score += 18;
  else if (row.sourceKind === "hall_classic") score += 12;
  return score;
}

function hydratePick(
  slug: string,
  request: GenerateRequest,
  recipeSource?: RecipeSourceAttribution,
): LocalRecipePick | null {
  const full = getCuratedRecipeBySlug(slug);
  const gr = full?.generateResponse;
  if (!full || !gr?.title?.trim()) return null;

  const protein = full.protein || gr.chosen_protein || "chicken";
  const scaled: GenerateResponse = {
    ...gr,
    chosen_protein: protein,
    ingredients: applyCrewPortionFloors(gr.ingredients || [], request.crew_size),
    pro_tips:
      gr.pro_tips?.length ? gr.pro_tips : hallProTips(request.crew_size, full.servingsBase || 4),
    _recipe_source: (gr._recipe_source ?? full.source) as RecipeSourceAttribution,
  };

  return {
    recipe: scaled,
    protein,
    originalTitle: full.title,
    catalogId: full.recipeId,
    recipeSource: (recipeSource ?? full.source) as RecipeSourceAttribution,
    slug,
  };
}

function pickFromSummaries(
  summaries: Array<{
    slug: string;
    protein: string;
    totalMinutes: number;
    scores: { quality: number };
    sourceKind: string;
  }>,
  request: GenerateRequest,
  options: {
    recentSignatures?: string[];
    currentRecipeSignature?: string;
    varietySeed: string;
    excludeSlugs?: Set<string>;
  },
): LocalRecipePick | null {
  const ranked = summaries
    .filter((r) => !options.excludeSlugs?.has(r.slug))
    .map((row) => ({ row, score: scoreCuratedRow(row, request) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;

  const band = ranked.slice(0, 8);
  const idx = hashSeed(options.varietySeed) % band.length;
  const chosen = band[idx]!.row;

  const pick = hydratePick(chosen.slug, request);
  if (!pick) return null;

  const sig = computeSignature(pick.recipe);
  if (signatureBlocked(sig, options.recentSignatures, options.currentRecipeSignature)) {
    for (const alt of band) {
      if (alt.row.slug === chosen.slug) continue;
      const altPick = hydratePick(alt.row.slug, request);
      if (!altPick) continue;
      const altSig = computeSignature(altPick.recipe);
      if (!signatureBlocked(altSig, options.recentSignatures, options.currentRecipeSignature)) {
        return altPick;
      }
    }
    return null;
  }

  return pick;
}

/** Layer A — published editorial curated (publisher / hall classics, not Golden 100). */
export function pickEditorialCuratedForGenerate(
  request: GenerateRequest,
  options: {
    recentSignatures?: string[];
    currentRecipeSignature?: string;
    varietySeed: string;
  },
): LocalRecipePick | null {
  const goldenSlugs = new Set(
    listCuratedSummariesByTag(GOLDEN_SET_TAG, 120).map((r) => r.slug),
  );

  const rows = listCuratedRecipeSummaries({
    status: "published",
    minQuality: 40,
    limit: 80,
    orderBy: "publisherFirst",
  }).filter((r) => !goldenSlugs.has(r.slug) && r.heroImage?.trim());

  const pick = pickFromSummaries(rows, request, {
    ...options,
    excludeSlugs: goldenSlugs,
  });

  if (pick) {
    log(
      `[generate:local] editorial hit slug=${pick.slug} title="${pick.originalTitle.slice(0, 48)}"`,
      "generate",
    );
  }
  return pick;
}

/** Layer B — Golden 100 branded catalog. */
export function pickGolden100ForGenerate(
  request: GenerateRequest,
  options: {
    recentSignatures?: string[];
    currentRecipeSignature?: string;
    varietySeed: string;
  },
): LocalRecipePick | null {
  const rows = listCuratedSummariesByTag(GOLDEN_SET_TAG, 120).filter((r) => r.heroImage?.trim());
  const summaries = rows.map((r) => ({
    slug: r.slug,
    protein: r.protein,
    totalMinutes: 0,
    scores: { quality: r.quality },
    sourceKind: r.sourceKind,
  }));

  const pick = pickFromSummaries(summaries, request, options);
  if (pick) {
    log(
      `[generate:local] golden_100 hit slug=${pick.slug} title="${pick.originalTitle.slice(0, 48)}"`,
      "generate",
    );
  }
  return pick;
}
