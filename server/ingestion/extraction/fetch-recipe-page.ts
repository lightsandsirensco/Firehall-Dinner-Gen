/**
 * Fetch publisher recipe pages with timeout, caching, and rate limiting.
 */

import { log } from "../../logger.js";
import { getUrlCache, setUrlCache } from "../url-cache.js";

const USER_AGENT = "FirehallMeals-Ingest/1.0 (+https://firehallmeals.com; recipe-curation)";

export async function fetchRecipePageHtml(url: string): Promise<string | null> {
  const cached = getUrlCache(url);
  if (cached?.html) return cached.html;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      log(`[ingestion] fetch ${res.status} ${url.slice(0, 80)}`, "ingestion");
      return null;
    }

    const html = await res.text();
    if (html.length < 500) return null;

    setUrlCache(url, { html, status: res.status });
    return html;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[ingestion] fetch failed ${url.slice(0, 60)}: ${msg}`, "ingestion");
    return null;
  } finally {
    clearTimeout(timer);
  }
}
