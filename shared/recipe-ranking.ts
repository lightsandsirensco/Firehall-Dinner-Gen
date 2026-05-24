/**
 * Unified recipe ranking — single scoring model for Explore, catalog, and ingest alignment.
 */

import type { ExploreRecipeCard } from "./explore-recipe.js";
import { scoreAppetiteAppeal } from "./explore-editorial.js";

export interface ExploreRankContext {
  sectionBoost?: number;
  /** Penalize if same protein already shown in feed */
  feedProteins?: Set<string>;
  /** Penalize repeated image hosts for visual diversity */
  feedImageHosts?: Set<string>;
  daySeed?: number;
}

const LOW_QUALITY_PATTERNS: RegExp[] = [
  /keto dessert|smoothie only|detox water/i,
  /molecular gastronomy|foam\b/i,
  /instant.*only|microwave only/i,
  /^easy chicken and rice/i,
  /^simple baked chicken/i,
];

const TRUSTED_SOURCE_HINTS: RegExp[] = [
  /allrecipes|serious eats|food network|damn delicious|budget bytes|nyt cooking|bon appétit/i,
];

const APPETITE_BOOST: [RegExp, number][] = [
  [/crispy|crunchy|golden|charred|grill marks|glazed|glossy|caramelized/i, 10],
  [/cheesy|melted|pull|bubbly|loaded/i, 9],
  [/smoked|bbq|barbecue|char\b/i, 8],
  [/juicy|tender|slow cooked|braised/i, 6],
];

function imageHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function proteinKey(card: ExploreRecipeCard): string {
  const p = (card.primaryProtein || "").toLowerCase();
  if (p) return p;
  const t = card.title.toLowerCase();
  if (/chicken/.test(t)) return "chicken";
  if (/beef|steak/.test(t)) return "beef";
  if (/pork|bacon|sausage/.test(t)) return "pork";
  if (/fish|salmon|shrimp|seafood/.test(t)) return "seafood";
  if (/turkey/.test(t)) return "turkey";
  if (/vegetarian|tofu|vegan/.test(t)) return "vegetarian";
  return "mixed";
}

/** Composite 0–100 score for Explore ordering */
export function scoreExploreCard(
  card: ExploreRecipeCard,
  ctx: ExploreRankContext = {},
): number {
  const appetite = scoreAppetiteAppeal(card, ctx.sectionBoost ?? 0);
  const storedQuality = card.qualityScore ?? 0;
  const text = `${card.title} ${card.summary || ""}`.toLowerCase();

  let score = appetite * 0.45 + storedQuality * 0.35;
  for (const [re, pts] of APPETITE_BOOST) {
    if (re.test(text)) score += pts;
  }

  // Visual / image quality — publisher photography beats aggregator thumbnails
  if (card.publisherMedia || (card.image && !card.image.includes("spoonacular.com"))) {
    score += 16;
  } else if (card.image?.includes("spoonacular.com")) {
    score -= 4;
  }
  if (!card.image?.trim()) score -= 40;

  // Trust signals
  const summaryBlob = `${card.title} ${card.summary || ""} ${card.sourceUrl || ""} ${card.publisherName || ""}`;
  if (card._curatedSlug) score += 10;
  if (card.publisherName?.trim()) score += 12;
  if (TRUSTED_SOURCE_HINTS.some((re) => re.test(summaryBlob))) score += 10;
  if (card.sourceUrl && !card.sourceUrl.includes("pinterest.com")) score += 5;
  if (card.fromCuratedDb && card.publisherMedia) score += 8;

  // Hall / crew fit
  if (card.readyInMinutes > 0 && card.readyInMinutes <= 45) score += 6;
  if (card.readyInMinutes > 90) score -= 10;
  if ((card.servings || 0) >= 6) score += 4;

  // Pool editorial boost
  const pool = card._pool || "";
  if (pool === "comfort" || pool === "bbq") score += 5;
  if (pool === "quick" && card.readyInMinutes <= 30) score += 4;

  // Anti low-quality
  if (LOW_QUALITY_PATTERNS.some((re) => re.test(card.title))) score -= 35;

  // Feed-level variety penalties
  const pk = proteinKey(card);
  if (ctx.feedProteins?.has(pk)) score -= 12;

  const host = imageHost(card.image);
  if (host && ctx.feedImageHosts?.has(host)) score -= 6;

  // Deterministic tie-breaker (no Math.random)
  const seed = (ctx.daySeed ?? 0) + card.id;
  score += (seed % 7) * 0.3;

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function sortExploreCardsByRank(
  cards: ExploreRecipeCard[],
  ctx: ExploreRankContext = {},
): ExploreRecipeCard[] {
  return [...cards].sort(
    (a, b) => scoreExploreCard(b, ctx) - scoreExploreCard(a, ctx),
  );
}

/** Re-order for visual rhythm: alternate protein families when possible */
export function sequenceExploreCardsForDisplay(
  cards: ExploreRecipeCard[],
  daySeed: number,
): ExploreRecipeCard[] {
  if (cards.length <= 2) return cards;

  const buckets = new Map<string, ExploreRecipeCard[]>();
  for (const c of cards) {
    const k = proteinKey(c);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(c);
  }

  const keys = [...buckets.keys()].sort();
  const start = daySeed % Math.max(1, keys.length);
  const rotatedKeys = [...keys.slice(start), ...keys.slice(0, start)];

  const out: ExploreRecipeCard[] = [];
  let added = true;
  while (out.length < cards.length && added) {
    added = false;
    for (const k of rotatedKeys) {
      const bucket = buckets.get(k);
      if (bucket?.length) {
        out.push(bucket.shift()!);
        added = true;
      }
    }
  }
  return out.length ? out : cards;
}
