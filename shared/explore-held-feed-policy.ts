/**
 * Explore feed density policy — cap soft-held placeholders, prioritize approved heroes.
 */

import type { ExploreRecipeCard } from "./explore-recipe.js";
import { isFirehallOwnedHeroUrl } from "./food-imagery/paths.js";
import { isSoftHeldExploreCard } from "./explore-imagery-status.js";

/** Max soft-held cards per section (after approved backfill). */
export const MAX_SOFT_HELD_PER_SECTION = 1;

/** Never more than this share of a section may be soft-held. */
export const MAX_SOFT_HELD_RATIO = 0.15;

/** Sections smaller than this never show soft-held placeholders. */
export const MIN_SECTION_SIZE_FOR_SOFT_HELD = 4;

/** Compatible pools for approved backfill when a section is short. */
export const ADJACENT_EXPLORE_POOL_TAGS: Record<string, string[]> = {
  trending: ["comfort", "quick", "chicken", "pasta"],
  bbq: ["comfort", "beef", "hearty", "handheld"],
  comfort: ["hearty", "pasta", "slow", "trending"],
  quick: ["one_pot", "chicken", "handheld", "trending"],
  hearty: ["comfort", "slow", "beef", "soup"],
  healthy: ["quick", "chicken", "bowl", "salmon"],
  chicken: ["quick", "handheld", "comfort", "trending"],
  beef: ["bbq", "hearty", "comfort", "slow"],
  pasta: ["comfort", "italian", "quick", "hearty"],
  handheld: ["quick", "game_day", "chicken", "bbq"],
  slow: ["comfort", "hearty", "beef", "one_pot"],
  one_pot: ["quick", "comfort", "hearty", "slow"],
  bowl: ["healthy", "quick", "chicken", "comfort"],
  breakfast: ["quick", "comfort", "handheld"],
  game_day: ["handheld", "bbq", "quick", "comfort"],
  feed_a_crowd: ["hearty", "comfort", "slow", "bbq"],
  italian: ["pasta", "comfort", "hearty"],
  salmon: ["healthy", "quick", "bowl"],
  soup: ["hearty", "comfort", "slow"],
};

export function maxSoftHeldSlots(sectionLimit: number): number {
  if (sectionLimit < MIN_SECTION_SIZE_FOR_SOFT_HELD) return 0;
  const byRatio = Math.floor(sectionLimit * MAX_SOFT_HELD_RATIO);
  return Math.min(MAX_SOFT_HELD_PER_SECTION, Math.max(0, byRatio));
}

export function rowLikelyHasApprovedHero(row: {
  heroImage?: string;
  imageApproved?: boolean;
}): boolean {
  const hero = (row.heroImage || "").trim();
  if (!hero || hero.includes("spoonacular.com")) return false;
  if (row.imageApproved === false) return false;
  return isFirehallOwnedHeroUrl(hero);
}

export function prioritizeCuratedRowsForExplore<
  T extends { heroImage?: string; imageApproved?: boolean },
>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => Number(rowLikelyHasApprovedHero(b)) - Number(rowLikelyHasApprovedHero(a)),
  );
}

export function adjacentPoolsForTag(poolTag: string): string[] {
  const key = poolTag.toLowerCase();
  return ADJACENT_EXPLORE_POOL_TAGS[key] ?? ["trending", "comfort", "quick"];
}

/**
 * Fill a section: approved first, soft-held only as a capped last resort.
 */
export function balanceExploreSectionCards(
  approved: ExploreRecipeCard[],
  softHeld: ExploreRecipeCard[],
  limit: number,
): ExploreRecipeCard[] {
  const out = approved.slice(0, limit);
  if (out.length >= limit) return out;

  const maxSoft = maxSoftHeldSlots(limit);
  const room = limit - out.length;
  const softToAdd = Math.min(maxSoft, room, softHeld.length);
  if (softToAdd > 0) {
    out.push(...softHeld.slice(0, softToAdd));
  }
  return out;
}

export function countSoftHeldInCards(cards: ExploreRecipeCard[]): number {
  return cards.filter((c) => isSoftHeldExploreCard(c)).length;
}
