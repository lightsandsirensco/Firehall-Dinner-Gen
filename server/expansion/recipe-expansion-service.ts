/**
 * Recipe expansion orchestrator — quality gates, dedupe, balance, ingestion promote.
 */

import { log } from "../logger.js";
import type { IngestRecipeDraft } from "../../shared/ingestion/recipe-ingest-schema.js";
import { recipeFingerprint } from "../../shared/ingestion/dedupe.js";
import {
  inferHallArchetypeFamily,
  archetypeExplorePools,
  archetypeToLegacyMealArchetype,
  pickArchetypeVariation,
  type HallArchetypeFamily,
} from "../../shared/meal-archetype-system.js";
import {
  scoreRecipeQuality,
  qualityInputFromIngestDraft,
  meetsPublishQualityThreshold,
  applyQualityToIngestDraft,
} from "../../shared/recipe-quality-score.js";
import { computeBalanceDecision } from "../../shared/feed-balance.js";
import { getCatalogBalanceSnapshot } from "./catalog-balance.js";
import {
  findExistingCuratedForDraft,
  getCuratedStoreStats,
} from "../curated-recipe-store.js";
import { runIngestionPipeline, type PipelineOptions } from "../ingestion/pipeline.js";
import { listStagingByStatus } from "../ingestion/ingestion-store.js";

export interface ExpansionRunOptions extends PipelineOptions {
  /** Skip ingestion; only promote validated staging with expansion gates */
  promoteOnly?: boolean;
  /** Require publisher-quality hero for publish */
  preferPublisherImages?: boolean;
  /** Max recipes to promote this run */
  promoteLimit?: number;
  minQuality?: number;
}

export interface ExpansionGateResult {
  accept: boolean;
  reason?: string;
  archetypeFamily: HallArchetypeFamily;
  qualityComposite: number;
  balancePenalty: number;
}

export interface ExpansionRunStats {
  ingestion?: Awaited<ReturnType<typeof runIngestionPipeline>>;
  gated: number;
  promoted: number;
  skippedDuplicate: number;
  skippedQuality: number;
  skippedBalance: number;
  catalogPublished: number;
}

/** Enrich draft with unified quality + archetype metadata before stage/promote */
export function enrichDraftForExpansion(draft: IngestRecipeDraft, trendScore: number): IngestRecipeDraft {
  const enriched = applyQualityToIngestDraft(draft, trendScore);
  const family = inferHallArchetypeFamily({
    title: enriched.title,
    summary: enriched.summary,
    mealFormat: enriched.mealFormat,
    tags: enriched.tags,
    protein: enriched.protein,
  });
  const legacy = archetypeToLegacyMealArchetype(family);
  const variation = pickArchetypeVariation(family, enriched.title);
  const pools = archetypeExplorePools(family);
  const exploreCategories = Array.from(new Set([...enriched.exploreCategories, ...pools]));

  return {
    ...enriched,
    mealArchetype: legacy,
    exploreCategories,
    tags: Array.from(
      new Set([
        ...(enriched.tags || []),
        `archetype:${family}`,
        `variation:${variation}`,
        `fp:${recipeFingerprint(enriched)}`,
      ]),
    ),
  };
}

export function evaluateExpansionPromoteGate(
  draft: IngestRecipeDraft,
  options: { preferPublisherImages?: boolean; minQuality?: number } = {},
): ExpansionGateResult {
  const family = inferHallArchetypeFamily({
    title: draft.title,
    summary: draft.summary,
    mealFormat: draft.mealFormat,
    tags: draft.tags,
    protein: draft.protein,
  });

  const quality = scoreRecipeQuality({
    ...qualityInputFromIngestDraft(draft),
    trendScore: draft.trendScore,
  });

  const minComposite = options.minQuality ?? (draft.source === "publisher" ? 48 : 52);

  if (!meetsPublishQualityThreshold(quality, { minComposite, requirePublisherImage: false })) {
    return {
      accept: false,
      reason: "quality_threshold",
      archetypeFamily: family,
      qualityComposite: quality.composite,
      balancePenalty: 0,
    };
  }

  if (options.preferPublisherImages && draft.source !== "publisher" && quality.imageQuality < 50) {
    return {
      accept: false,
      reason: "publisher_image_preferred",
      archetypeFamily: family,
      qualityComposite: quality.composite,
      balancePenalty: 0,
    };
  }

  const snapshot = getCatalogBalanceSnapshot();
  const balance = computeBalanceDecision(snapshot, {
    protein: draft.protein,
    cuisine: draft.cuisine,
    archetypeFamily: family,
    explorePools: draft.exploreCategories?.length
      ? draft.exploreCategories
      : archetypeExplorePools(family),
    heroImage: draft.heroImage,
    qualityScore: quality.composite,
  });

  if (!balance.accept) {
    return {
      accept: false,
      reason: balance.reason || "balance_cap",
      archetypeFamily: family,
      qualityComposite: quality.composite,
      balancePenalty: balance.penalty,
    };
  }

  return {
    accept: true,
    archetypeFamily: family,
    qualityComposite: quality.composite - balance.penalty,
    balancePenalty: balance.penalty,
  };
}

export async function promoteValidatedWithExpansionGates(options: {
  limit?: number;
  minQuality?: number;
  preferPublisherImages?: boolean;
}): Promise<{ promoted: number; gated: number; skippedDuplicate: number; skippedQuality: number; skippedBalance: number }> {
  const limit = options.limit ?? 15;
  const minQuality = options.minQuality ?? 52;
  const drafts = listStagingByStatus("validated", limit * 3);

  let promoted = 0;
  let gated = 0;
  let skippedDuplicate = 0;
  let skippedQuality = 0;
  let skippedBalance = 0;

  for (const raw of drafts) {
    if (promoted >= limit) break;

    const draft = enrichDraftForExpansion(raw, raw.trendScore ?? 50);
    gated++;

    const existing = findExistingCuratedForDraft(draft);
    if (existing?.status === "published") {
      skippedDuplicate++;
      continue;
    }

    const { promoteDraftToCatalog } = await import("../ingestion/promote.js");
    const ok = await promoteDraftToCatalog(draft, {
      minQuality,
      preferPublisherImages: options.preferPublisherImages,
    });
    if (ok) promoted++;
    await new Promise((r) => setTimeout(r, 350));
  }

  return { promoted, gated, skippedDuplicate, skippedQuality, skippedBalance };
}

export async function runRecipeExpansion(
  options: ExpansionRunOptions = {},
): Promise<ExpansionRunStats> {
  const stats: ExpansionRunStats = {
    gated: 0,
    promoted: 0,
    skippedDuplicate: 0,
    skippedQuality: 0,
    skippedBalance: 0,
    catalogPublished: getCuratedStoreStats().published,
  };

  if (!options.promoteOnly) {
    stats.ingestion = await runIngestionPipeline({
      ...options,
      promote: false,
    });
  }

  if (options.promote || options.promoteOnly) {
    const promoteResult = await promoteValidatedWithExpansionGates({
      limit: options.promoteLimit ?? 12,
      minQuality: options.minQuality ?? 52,
      preferPublisherImages: options.preferPublisherImages ?? false,
    });

    stats.promoted = promoteResult.promoted;
    stats.gated = promoteResult.gated;
    stats.skippedDuplicate = promoteResult.skippedDuplicate;
    stats.skippedQuality = promoteResult.skippedQuality;
    stats.skippedBalance = promoteResult.skippedBalance;
  }

  stats.catalogPublished = getCuratedStoreStats().published;

  log(`[expansion] run complete: ${JSON.stringify(stats)}`, "catalog");
  return stats;
}

export function getExpansionDashboard(): {
  catalog: ReturnType<typeof getCuratedStoreStats>;
  balance: ReturnType<typeof getCatalogBalanceSnapshot>;
} {
  return {
    catalog: getCuratedStoreStats(),
    balance: getCatalogBalanceSnapshot(),
  };
}
