/**
 * Trusted recipe publisher domains — publisher URL resolver only ingests from these hosts.
 * Tier affects quality scoring bonus.
 */

export interface TrustedPublisher {
  host: string;
  name: string;
  tier: 1 | 2 | 3;
}

export const TRUSTED_PUBLISHERS: TrustedPublisher[] = [
  { host: "seriouseats.com", name: "Serious Eats", tier: 1 },
  { host: "halfbakedharvest.com", name: "Half Baked Harvest", tier: 1 },
  { host: "damndelicious.net", name: "Damn Delicious", tier: 1 },
  { host: "sipandfeast.com", name: "Sip & Feast", tier: 1 },
  { host: "bonappetit.com", name: "Bon Appétit", tier: 1 },
  { host: "cooking.nytimes.com", name: "NYT Cooking", tier: 1 },
  { host: "budgetbytes.com", name: "Budget Bytes", tier: 1 },
  { host: "cafedelites.com", name: "Cafe Delites", tier: 1 },
  { host: "simplyrecipes.com", name: "Simply Recipes", tier: 1 },
  { host: "allrecipes.com", name: "AllRecipes", tier: 2 },
  { host: "foodnetwork.com", name: "Food Network", tier: 2 },
  { host: "gimmesomeoven.com", name: "Gimme Some Oven", tier: 2 },
  { host: "thepioneerwoman.com", name: "The Pioneer Woman", tier: 2 },
  { host: "tastesbetterfromscratch.com", name: "Tastes Better From Scratch", tier: 2 },
  { host: "mob.co.uk", name: "Mob Kitchen", tier: 1 },
  { host: "mobkitchen.co.uk", name: "Mob Kitchen", tier: 1 },
  { host: "eatingwell.com", name: "EatingWell", tier: 2 },
  { host: "delish.com", name: "Delish", tier: 2 },
  { host: "tasty.co", name: "Tasty", tier: 3 },
];

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

export function publisherQualityBonus(url: string): number {
  const pub = getTrustedPublisher(url);
  if (!pub) return 0;
  if (pub.tier === 1) return 12;
  if (pub.tier === 2) return 6;
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
