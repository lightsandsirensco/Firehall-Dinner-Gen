/**
 * Pinterest trend discovery via Apify actor (batch only).
 */

import { log } from "../../logger.js";
import {
  getApifyPinterestActorId,
  getApifyToken,
  runApifyActorSync,
  fetchApifyDatasetItems,
  resolveDatasetIdFromRun,
} from "../apify-client.js";
import type { TrendSignal } from "../../../shared/ingestion/recipe-ingest-schema.js";
import { trendSignalId } from "../../../shared/ingestion/dedupe.js";
import type { TrendDiscoverySource } from "./types.js";

/** Firefighter / hall-friendly Pinterest search queries */
export const DEFAULT_PINTEREST_QUERIES = [
  "comfort food dinner recipes",
  "hearty family dinner",
  "sheet pan chicken dinner",
  "slow cooker beef chili",
  "bbq pulled pork dinner",
  "one pot pasta dinner",
  "firehouse dinner ideas",
  "big batch dinner for crowd",
  "easy crew dinner",
  "grilled steak dinner",
];

interface ApifyPinRow {
  title?: string;
  name?: string;
  description?: string;
  keyword?: string;
  searchTerm?: string;
  url?: string;
  link?: string;
  pinUrl?: string;
  image?: string;
  imageUrl?: string;
  images?: { url?: string }[];
  outboundLink?: string;
  destinationUrl?: string;
  saves?: number;
  repins?: number;
  reactionCount?: number;
  trendScore?: number;
}

function rowToSignal(row: ApifyPinRow): TrendSignal | null {
  const title = (row.title || row.name || row.description || "").trim();
  const outbound =
    row.outboundLink ||
    row.destinationUrl ||
    row.link ||
    row.url ||
    "";

  const keyword =
    (row.searchTerm || row.keyword || title || inferKeywordFromUrl(outbound)).trim();
  if (!keyword || keyword.length < 4) return null;

  const saves = row.saves ?? row.repins ?? row.reactionCount ?? 0;
  const trendScore = row.trendScore ?? Math.min(95, 48 + Math.log10(saves + 1) * 18);

  const imageUrl =
    row.image ||
    row.imageUrl ||
    row.images?.[0]?.url ||
    undefined;

  const pinUrl = row.pinUrl || row.url || row.link;

  const signal: TrendSignal = {
    id: "",
    source: "pinterest",
    keyword: keyword.slice(0, 120),
    trendScore: Math.round(trendScore),
    discoveredAt: new Date().toISOString(),
    pinUrl,
    destinationUrl: outbound && !outbound.includes("pinterest.com") ? outbound : undefined,
    titleHint: title || undefined,
    imageUrl,
    raw: row as Record<string, unknown>,
  };

  signal.id = trendSignalId(signal);
  return signal;
}

function inferKeywordFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const slug = u.pathname.split("/").filter(Boolean).pop() || "";
    return slug.replace(/-/g, " ").slice(0, 80);
  } catch {
    return "";
  }
}

export class ApifyPinterestTrendSource implements TrendDiscoverySource {
  readonly name = "apify_pinterest";

  constructor(
    private options: {
      searchQueries?: string[];
      maxItems?: number;
      useExistingDataset?: boolean;
    } = {},
  ) {}

  async discover(): Promise<TrendSignal[]> {
    if (!getApifyToken()) {
      log("[ingestion] Apify token missing — skip Pinterest discovery", "ingestion");
      return [];
    }

    const datasetId = process.env.APIFY_DATASET_ID;
    const runId = process.env.APIFY_ACTOR_RUN_ID;

    let rows: ApifyPinRow[] = [];

    if (this.options.useExistingDataset !== false && (datasetId || runId)) {
      const id = datasetId || (runId ? await resolveDatasetIdFromRun(runId) : "");
      rows = await fetchApifyDatasetItems<ApifyPinRow>(id, this.options.maxItems ?? 80);
    } else if (process.env.INGEST_SKIP_APIFY_RUN === "true") {
      log("[ingestion] INGEST_SKIP_APIFY_RUN — skip live Apify actor", "ingestion");
    } else {
      const queries = this.options.searchQueries || DEFAULT_PINTEREST_QUERIES;
      const actorId = getApifyPinterestActorId();
      const input: Record<string, unknown> = {
        searchQueries: queries,
        maxItems: this.options.maxItems ?? 40,
        maxPins: this.options.maxItems ?? 40,
        queries,
        query: queries[0],
      };

      try {
        rows = await runApifyActorSync<ApifyPinRow>(actorId, input, {
          timeoutSecs: 240,
          limit: this.options.maxItems ?? 60,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`[ingestion] Apify actor failed (use APIFY_DATASET_ID or trend-signals.json): ${msg}`, "ingestion");
        rows = [];
      }
    }

    const seen = new Set<string>();
    const signals: TrendSignal[] = [];

    for (const row of rows) {
      const signal = rowToSignal(row);
      if (!signal) continue;
      const key = `${signal.keyword}:${signal.destinationUrl || ""}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      signals.push(signal);
    }

    log(`[ingestion] Apify Pinterest: ${signals.length} trend signals`, "ingestion");
    return signals;
  }
}
