/**
 * Trusted recipe publisher domains — publisher URL resolver only ingests from these hosts.
 * Tier and ordering follow shared/recipe-sourcing-policy.ts.
 */

import {
  RECIPE_SOURCE_PUBLISHERS,
  type RecipeSourceTier,
} from "../recipe-sourcing-policy.js";

export interface TrustedPublisher {
  host: string;
  name: string;
  tier: RecipeSourceTier;
  /** Selection rank (lower = prefer when sourcing new recipes) */
  rank: number;
}

export const TRUSTED_PUBLISHERS: TrustedPublisher[] = RECIPE_SOURCE_PUBLISHERS.flatMap((pub) =>
  pub.hosts.map((host) => ({
    host,
    name: pub.name,
    tier: pub.tier,
    rank: pub.rank,
  })),
);

const HOST_MAP = new Map(TRUSTED_PUBLISHERS.map((p) => [p.host, p]));

export function isTrustedPublisherUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    return HOST_MAP.has(host);
  } catch {
    return false;
  }
}

export function getTrustedPublisher(url: string): TrustedPublisher | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    return HOST_MAP.get(host) ?? null;
  } catch {
    return null;
  }
}

/** Quality scoring bonus — favors Tier 1 publishers for ingestion ranking. */
export function publisherQualityBonus(url: string): number {
  const pub = getTrustedPublisher(url);
  if (!pub) return 0;
  if (pub.tier === 1) return 15;
  if (pub.tier === 2) return 10;
  if (pub.rank <= 15) return 6;
  return 2;
}

/** Blocked — not dinner / not appropriate for hall */
const BLOCKED_HOST_FRAGMENTS = [
  "pinterest.com",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "youtube.com",
  "amazon.com",
  "walmart.com",
  "foodista.com",
  "blogspot.com",
  "wixsite.com",
];

export function isBlockedRecipeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return BLOCKED_HOST_FRAGMENTS.some((f) => host.includes(f));
  } catch {
    return true;
  }
}
