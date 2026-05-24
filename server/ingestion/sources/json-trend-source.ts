/**
 * Offline trend ingestion — read curated trend signals from JSON (Pinterest exports, Apify batches, manual curation).
 * DO NOT call Pinterest from the Explore request path.
 */

import fs from "fs";
import path from "path";
import type { TrendSignal } from "../../../shared/ingestion/recipe-ingest-schema.js";
import { trendSignalId } from "../../../shared/ingestion/dedupe.js";
import { scoreTrendSignal } from "../../../shared/ingestion/scoring.js";
import type { TrendDiscoverySource } from "./types.js";

export interface JsonTrendSignalRow {
  source?: string;
  keyword: string;
  trendScore?: number;
  pinUrl?: string;
  destinationUrl?: string;
  titleHint?: string;
  imageUrl?: string;
  tags?: string[];
}

export interface JsonTrendFile {
  signals: JsonTrendSignalRow[];
}

const DEFAULT_PATH = path.join(process.cwd(), "data", "ingestion", "trend-signals.json");

export class JsonTrendDiscoverySource implements TrendDiscoverySource {
  readonly name = "json_trends";

  constructor(private filePath = process.env.INGEST_TREND_SIGNALS_PATH || DEFAULT_PATH) {}

  async discover(): Promise<TrendSignal[]> {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }
    const raw = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as JsonTrendFile;
    const now = new Date().toISOString();
    return (raw.signals || []).map((row) => {
      const source = (row.source || "pinterest") as TrendSignal["source"];
      const signal: TrendSignal = {
        id: trendSignalId({ source, keyword: row.keyword, destinationUrl: row.destinationUrl }),
        source,
        keyword: row.keyword.trim(),
        trendScore: scoreTrendSignal({ trendScore: row.trendScore, source }),
        discoveredAt: now,
        pinUrl: row.pinUrl,
        destinationUrl: row.destinationUrl,
        titleHint: row.titleHint,
        imageUrl: row.imageUrl,
        tags: row.tags,
      };
      return signal;
    });
  }
}
