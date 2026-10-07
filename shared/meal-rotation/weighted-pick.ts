/**
 * Weighted selection helpers for hall meal rotation.
 */

export function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Penalize recently served slugs — more recent = larger penalty.
 * `recentSlugs` is oldest-first (most recent last), matching recordMealSlug.
 */
export function recentSlugPenalty(slug: string, recentSlugs?: string[]): number {
  if (!recentSlugs?.length) return 0;
  const idx = recentSlugs.lastIndexOf(slug);
  if (idx === -1) return 0;
  const recency = idx + 1;
  return recency * 28;
}

/**
 * Firehall Meals Pro V1 Feature 3 — merge durable account-level "cooked"
 * history (oldest-first) with device/session-local recent slugs
 * (oldest-first) into ONE ordered list for the existing `recentSlugPenalty`
 * mechanic above. Reuses the exact same recency-by-array-position contract
 * as client/src/lib/meal-rotation-memory.ts (oldest first, most recent
 * last) — no new scoring model, no new ranking engine.
 *
 * Later entries win position on duplicates (matches recordMealSlug's own
 * "remove earlier occurrence, push to end" behavior), so a recipe cooked
 * durably a week ago but also just shown this session is treated as
 * "just shown" recent, not stale. Capped at 32 to match the existing
 * client-submitted recentSlugs limit (see server/sanitize-request.ts).
 */
export function mergeRecentSlugSources(
  durableOldestFirst: readonly string[],
  sessionOldestFirst: readonly string[],
  maxLength = 32,
): string[] {
  const merged: string[] = [];
  for (const raw of [...durableOldestFirst, ...sessionOldestFirst]) {
    const slug = raw?.trim().toLowerCase();
    if (!slug) continue;
    const existingIdx = merged.indexOf(slug);
    if (existingIdx !== -1) merged.splice(existingIdx, 1);
    merged.push(slug);
  }
  return merged.slice(-maxLength);
}

/** Pick index from weights using deterministic seed. */
export function weightedPickIndex(weights: number[], seed: string): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  // Avalanche the hash (murmur3 fmix32): near-identical seeds ("…:1", "…:2") otherwise
  // land on near-identical values and the draw clusters on a few candidates.
  let h = hashSeed(seed);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  let r = ((h >>> 0) / 0x100000000) * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r < 0) return i;
  }
  return weights.length - 1;
}
