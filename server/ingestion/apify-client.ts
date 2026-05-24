/**
 * Apify API client — Pinterest trend discovery (batch only).
 */

import { log } from "../logger.js";

export function getApifyToken(): string | null {
  return process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || null;
}

export function getApifyPinterestActorId(): string {
  return (
    process.env.APIFY_PINTEREST_ACTOR_ID ||
    "pear_fight~pinterest-scraper"
  );
}

export interface ApifyRunOptions {
  input: Record<string, unknown>;
  waitSecs?: number;
  memoryMbytes?: number;
}

export interface ApifyRunResult {
  datasetId: string;
  runId: string;
  itemCount: number;
}

/** Run actor synchronously and return dataset items */
export async function runApifyActorSync<T = Record<string, unknown>>(
  actorId: string,
  input: Record<string, unknown>,
  options: { timeoutSecs?: number; limit?: number } = {},
): Promise<T[]> {
  const token = getApifyToken();
  if (!token) throw new Error("APIFY_API_TOKEN or APIFY_TOKEN is required");

  const actorPath = actorId.includes("~") ? actorId : actorId.replace("/", "~");
  const timeout = options.timeoutSecs ?? 300;
  const url = `https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?token=${token}&timeout=${timeout}`;

  log(`[apify] Running actor ${actorPath}…`, "ingestion");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify actor failed ${res.status}: ${text.slice(0, 300)}`);
  }

  const items = (await res.json()) as T[];
  const limit = options.limit ?? 200;
  return items.slice(0, limit);
}

export async function fetchApifyDatasetItems<T = Record<string, unknown>>(
  datasetId: string,
  limit = 100,
): Promise<T[]> {
  const token = getApifyToken();
  if (!token) throw new Error("APIFY_API_TOKEN or APIFY_TOKEN is required");

  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json&clean=true&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify dataset fetch failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T[];
}

export async function resolveDatasetIdFromRun(runId: string): Promise<string> {
  const token = getApifyToken();
  if (!token) throw new Error("APIFY_API_TOKEN or APIFY_TOKEN is required");
  const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
  if (!res.ok) throw new Error(`Apify run lookup failed: ${res.status}`);
  const data = (await res.json()) as { data?: { defaultDatasetId?: string } };
  const datasetId = data.data?.defaultDatasetId;
  if (!datasetId) throw new Error("No defaultDatasetId on Apify run");
  return datasetId;
}
