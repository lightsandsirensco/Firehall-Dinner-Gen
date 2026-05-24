#!/usr/bin/env tsx
/**
 * P1 — Pull Pinterest (or other) trend rows from an Apify dataset into trend-signals.json.
 *
 * Env:
 *   APIFY_API_TOKEN      — required (or APIFY_TOKEN)
 *   APIFY_DATASET_ID     — dataset id from actor run (or APIFY_ACTOR_RUN_ID)
 *   APIFY_ACTOR_RUN_ID   — optional; fetches default dataset for run
 *
 * Usage:
 *   npx tsx scripts/apify-export-trends.ts
 *   npx tsx scripts/apify-export-trends.ts --merge
 */

import "dotenv/config";
import fs from "fs";
import path from "path";

interface ApifyPinRow {
  title?: string;
  name?: string;
  keyword?: string;
  searchTerm?: string;
  url?: string;
  link?: string;
  image?: string;
  imageUrl?: string;
  trendScore?: number;
  saves?: number;
  repins?: number;
}

interface TrendOut {
  source: string;
  keyword: string;
  trendScore?: number;
  pinUrl?: string;
  destinationUrl?: string;
  titleHint?: string;
  imageUrl?: string;
}

const OUT_PATH =
  process.env.INGEST_TREND_SIGNALS_PATH ||
  path.join(process.cwd(), "data", "ingestion", "trend-signals.json");

function apifyToken(): string {
  const token = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN or APIFY_TOKEN is required");
  return token;
}

async function fetchDatasetItems(): Promise<ApifyPinRow[]> {
  const token = apifyToken();

  let datasetId = process.env.APIFY_DATASET_ID;
  const runId = process.env.APIFY_ACTOR_RUN_ID;

  if (!datasetId && runId) {
    const runRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    if (!runRes.ok) throw new Error(`Apify run lookup failed: ${runRes.status}`);
    const runData = (await runRes.json()) as { data?: { defaultDatasetId?: string } };
    datasetId = runData.data?.defaultDatasetId;
  }

  if (!datasetId) {
    throw new Error("Set APIFY_DATASET_ID or APIFY_ACTOR_RUN_ID");
  }

  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json&clean=true&limit=100`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify dataset fetch failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as ApifyPinRow[];
}

function rowToSignal(row: ApifyPinRow, index: number): TrendOut | null {
  const title = (row.title || row.name || row.keyword || row.searchTerm || "").trim();
  const keyword =
    (row.searchTerm || row.keyword || title || "").trim() ||
    inferKeywordFromUrl(row.link || row.url || "");

  if (!keyword || keyword.length < 4) return null;

  const saves = row.saves ?? row.repins ?? 0;
  const trendScore = row.trendScore ?? Math.min(95, 50 + Math.log10(saves + 1) * 15);

  return {
    source: "pinterest",
    keyword: keyword.slice(0, 120),
    trendScore: Math.round(trendScore),
    pinUrl: row.url || row.link,
    destinationUrl: row.link || row.url,
    titleHint: title || undefined,
    imageUrl: row.image || row.imageUrl,
  };
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

async function main() {
  const merge = process.argv.includes("--merge");
  console.log("[apify] Fetching dataset…");
  const items = await fetchDatasetItems();
  const signals = items
    .map((row, i) => rowToSignal(row, i))
    .filter((s): s is TrendOut => s !== null);

  let existing: TrendOut[] = [];
  if (merge && fs.existsSync(OUT_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as { signals: TrendOut[] };
      existing = parsed.signals || [];
    } catch {
      /* ignore */
    }
  }

  const seen = new Set(existing.map((s) => s.keyword.toLowerCase()));
  const merged = [...existing];
  for (const s of signals) {
    const key = s.keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(s);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify({ signals: merged }, null, 2), "utf8");
  console.log(`[apify] Wrote ${merged.length} signals → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("[apify]", err);
  process.exit(1);
});
