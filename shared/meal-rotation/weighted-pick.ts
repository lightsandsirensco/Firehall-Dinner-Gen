/**
 * Weighted selection helpers for hall meal rotation.
 */

export function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Penalize recently served slugs — more recent = larger penalty. */
export function recentSlugPenalty(slug: string, recentSlugs?: string[]): number {
  if (!recentSlugs?.length) return 0;
  const idx = recentSlugs.lastIndexOf(slug);
  if (idx === -1) return 0;
  const recency = recentSlugs.length - idx;
  return recency * 28;
}

/** Pick index from weights using deterministic seed. */
export function weightedPickIndex(weights: number[], seed: string): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let r = hashSeed(seed) % total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r < 0) return i;
  }
  return weights.length - 1;
}
