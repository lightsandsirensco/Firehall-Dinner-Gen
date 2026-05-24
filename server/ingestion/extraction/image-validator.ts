/**
 * Validate recipe hero images — batch-safe HEAD checks + URL heuristics.
 */

const MIN_BYTES_HINT = 8_000;
const BAD_URL_PATTERNS = [
  /placeholder/i,
  /1x1/i,
  /pixel\.gif/i,
  /data:image/i,
  /avatar/i,
  /logo/i,
  /icon/i,
];

export interface ImageValidationResult {
  ok: boolean;
  reason?: string;
  contentType?: string;
  contentLength?: number;
}

export function validateImageUrlHeuristic(url: string): ImageValidationResult {
  if (!url?.trim()) return { ok: false, reason: "empty_url" };
  if (!/^https?:\/\//i.test(url)) return { ok: false, reason: "not_http" };
  if (BAD_URL_PATTERNS.some((p) => p.test(url))) return { ok: false, reason: "bad_pattern" };

  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (!/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(path) && !/image|photo|media|cdn|spoonacular/i.test(url)) {
      return { ok: true, reason: "heuristic_pass_no_ext" };
    }
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  return { ok: true };
}

export async function validateImageUrlFetch(url: string, timeoutMs = 6000): Promise<ImageValidationResult> {
  const heuristic = validateImageUrlHeuristic(url);
  if (!heuristic.ok) return heuristic;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "FirehallMeals-Ingest/1.0" },
      redirect: "follow",
    });

    if (!res.ok) return { ok: false, reason: `http_${res.status}` };

    const contentType = res.headers.get("content-type") || "";
    if (contentType && !contentType.startsWith("image/")) {
      return { ok: false, reason: "not_image", contentType };
    }

    const len = parseInt(res.headers.get("content-length") || "0", 10);
    if (len > 0 && len < MIN_BYTES_HINT) {
      return { ok: false, reason: "too_small", contentLength: len };
    }

    return { ok: true, contentType, contentLength: len || undefined };
  } catch {
    return { ok: true, reason: "head_skipped_assume_ok" };
  } finally {
    clearTimeout(timer);
  }
}

/** Prefer publisher image; fallback to Pinterest pin image if valid */
export async function pickBestHeroImage(
  publisherImage: string,
  pinImage?: string,
): Promise<{ url: string; valid: boolean }> {
  const pubCheck = await validateImageUrlFetch(publisherImage);
  if (pubCheck.ok) return { url: publisherImage, valid: true };

  if (pinImage) {
    const pinCheck = await validateImageUrlFetch(pinImage);
    if (pinCheck.ok) return { url: pinImage, valid: true };
  }

  return { url: publisherImage || pinImage || "", valid: false };
}
