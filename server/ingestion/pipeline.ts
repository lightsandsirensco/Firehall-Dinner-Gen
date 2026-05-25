/**
 * Batch ingestion pipeline — trend discovery → resolve → stage → validate → (optional) promote.
 * Never called from Explore HTTP handlers.
 */

import { randomUUID } from "crypto";
import { log } from "../logger.js";
import type { IngestRunStats, IngestRecipeDraft } from "../../shared/ingestion/recipe-ingest-schema.js";
import { dedupeDrafts } from "../../shared/ingestion/dedupe.js";
import { validateIngestDraft } from "../../shared/ingestion/validate.js";
import {
  createIngestionRun,
  finishIngestionRun,
  insertTrendSignals,
  stageRecipeDraft,
  updateStagingStatus,
} from "./ingestion-store.js";
import type { IngestionSourceBundle } from "./sources/types.js";
import { JsonTrendDiscoverySource } from "./sources/json-trend-source.js";
import { ApifyPinterestTrendSource } from "./sources/apify-pinterest-trend-source.js";
import { PublisherUrlResolveSource } from "./sources/publisher-url-resolve-source.js";
import { SpoonacularResolveSource } from "./sources/spoonacular-resolve-source.js";
import { HallClassicSeedSource } from "./sources/hall-classic-seed-source.js";
import { getApifyToken } from "./apify-client.js";
import { validateImageUrlFetch } from "./extraction/image-validator.js";
import { enrichDraftForExpansion } from "../expansion/recipe-expansion-service.js";

export interface PipelineOptions {
  /** Run catalog promotion after validation */
  promote?: boolean;
  promoteLimit?: number;
  minQuality?: number;
  sources?: IngestionSourceBundle;
}

export interface IngestionPipelineSourceOptions {
  /** Run live Apify Pinterest actor (requires APIFY_API_TOKEN) */
  apifyPinterest?: boolean;
  /** Resolve trusted publisher URLs via JSON-LD */
  publisherUrls?: boolean;
  spoonacularResolve?: boolean;
  hallClassics?: boolean;
}

export function defaultIngestionSources(
  options: IngestionPipelineSourceOptions = {},
): IngestionSourceBundle {
  const useApify = options.apifyPinterest ?? Boolean(getApifyToken());
  const trends: import("./sources/types.js").TrendDiscoverySource[] = [
    new JsonTrendDiscoverySource(),
  ];
  if (useApify) trends.unshift(new ApifyPinterestTrendSource());

  const resolvers = [];
  if (options.publisherUrls !== false) {
    resolvers.push(new PublisherUrlResolveSource(700));
  }
  if (options.spoonacularResolve === true) {
    resolvers.push(new SpoonacularResolveSource(1));
  }
  if (options.hallClassics !== false) {
    resolvers.push(new HallClassicSeedSource(10));
  }

  return { trends, resolvers };
}

export async function runIngestionPipeline(options: PipelineOptions = {}): Promise<IngestRunStats> {
  const sources = options.sources ?? defaultIngestionSources();
  const runId = `run_${randomUUID().slice(0, 8)}`;
  const stats: IngestRunStats = {
    signalsIn: 0,
    draftsStaged: 0,
    validated: 0,
    rejected: 0,
    promoted: 0,
    duplicatesSkipped: 0,
  };

  createIngestionRun(runId, sources.trends.map((t) => t.name).join("+"));

  try {
    const allSignals = [];
    for (const trendSource of sources.trends) {
      try {
        const signals = await trendSource.discover();
        log(`[ingestion] ${trendSource.name}: ${signals.length} trend signals`, "ingestion");
        allSignals.push(...signals);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`[ingestion] ${trendSource.name} failed (continuing): ${msg}`, "ingestion");
      }
    }
    stats.signalsIn = allSignals.length;
    insertTrendSignals(allSignals, runId);

    let allDrafts: IngestRecipeDraft[] = [];
    const publisherResolver = sources.resolvers.find((r) => r.name === "publisher_jsonld");
    const otherResolvers = sources.resolvers.filter((r) => r.name !== "publisher_jsonld");

    if (publisherResolver) {
      const pubDrafts = await publisherResolver.resolve(allSignals);
      log(`[ingestion] ${publisherResolver.name}: ${pubDrafts.length} publisher drafts`, "ingestion");
      allDrafts.push(...pubDrafts);
    }

    const publisherTitleKeys = new Set(
      allDrafts
        .filter((d) => d.source === "publisher")
        .map((d) => d.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48)),
    );

    for (const resolver of otherResolvers) {
      let signalsForResolver = allSignals;
      if (resolver.name === "spoonacular_resolve" && publisherTitleKeys.size > 0) {
        signalsForResolver = allSignals.filter((s) => {
          const hint = (s.titleHint || s.keyword || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return !publisherTitleKeys.has(hint.slice(0, 48));
        });
      }
      const drafts = await resolver.resolve(signalsForResolver);
      log(`[ingestion] ${resolver.name}: ${drafts.length} drafts`, "ingestion");
      allDrafts.push(...drafts);
    }

    const { unique, skipped } = dedupeDrafts(allDrafts);
    stats.duplicatesSkipped = skipped;

    for (const raw of unique) {
      const draft = enrichDraftForExpansion(raw, raw.trendScore ?? 50);
      let imageValid = true;
      if (draft.heroImage?.trim()) {
        const imgCheck = await validateImageUrlFetch(draft.heroImage);
        imageValid = imgCheck.ok;
      }
      const validation = validateIngestDraft(draft, {
        imageValid,
        requirePublisherSteps: draft.source === "publisher",
      });
      const status = validation.ok ? "validated" : "rejected";
      const staged = stageRecipeDraft(
        draft,
        runId,
        validation.ok ? "validated" : "rejected",
      );
      if (!staged) {
        stats.duplicatesSkipped++;
        continue;
      }
      stats.draftsStaged++;
      if (validation.ok) {
        stats.validated++;
        updateStagingStatus(draft.fingerprint, "validated");
      } else {
        stats.rejected++;
        updateStagingStatus(draft.fingerprint, "rejected", validation.reasons.join(","));
      }
    }

    if (options.promote) {
      const { requeuePromoteFailedStaging } = await import("./ingestion-store.js");
      const { promoteValidatedWithExpansionGates } = await import("../expansion/recipe-expansion-service.js");
      requeuePromoteFailedStaging();
      const promoteResult = await promoteValidatedWithExpansionGates({
        limit: options.promoteLimit ?? 15,
        minQuality: options.minQuality ?? 52,
      });
      stats.promoted = promoteResult.promoted;
    }

    finishIngestionRun(runId, "completed", stats);
    log(`[ingestion] pipeline complete: ${JSON.stringify(stats)}`, "ingestion");
    return stats;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    finishIngestionRun(runId, "failed", stats, msg);
    throw err;
  }
}
