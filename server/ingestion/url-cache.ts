/**
 * In-process URL fetch cache (TTL) — avoids hammering publishers during batch runs.
 * Persisted copy optional via ingestion_url_cache table.
 */

import { createHash } from "crypto";

interface CacheEntry {
  html?: string;
  extractedJson?: string;
  status?: number;
  expiresAt: number;
}

const TTL_MS = 1000 * 60 * 60 * 24; // 24h
const memory = new Map<string, CacheEntry>();

function urlKey(url: string): string {
  return createHash("sha256").update(url.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function getUrlCache(url: string): { html?: string; extractedJson?: string } | null {
  const key = urlKey(url);
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return { html: entry.html, extractedJson: entry.extractedJson };
}

export function setUrlCache(
  url: string,
  data: { html?: string; extractedJson?: string; status?: number },
): void {
  const key = urlKey(url);
  memory.set(key, {
    ...data,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function clearUrlCache(): void {
  memory.clear();
}
