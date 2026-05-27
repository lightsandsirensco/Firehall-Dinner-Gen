/**
 * Trending score with time decay — views, saves, generates, hall votes.
 */

import { getEngagementSignals, type RecipeEngagementSignals } from "./engagement.js";

const MS_PER_DAY = 86_400_000;
const DECAY_HALF_LIFE_DAYS = 7;

export interface TrendingScoreInput {
  recipeId: number;
  curatedRecipeId?: string;
  servedCount?: number;
  trendingRank?: number;
  featured?: boolean;
}

function decayMultiplier(lastEventAt: number, now: number): number {
  const ageDays = Math.max(0, (now - lastEventAt) / MS_PER_DAY);
  return Math.pow(0.5, ageDays / DECAY_HALF_LIFE_DAYS);
}

function engagementRaw(signals: RecipeEngagementSignals): number {
  return (
    signals.views * 1 +
    signals.saves * 4 +
    signals.generates * 6 +
    signals.hallVoteWins * 12
  );
}

/** 0–100 trending boost for recommendation composite */
export function computeTrendingBoost(input: TrendingScoreInput, now = Date.now()): number {
  let score = 0;

  if (input.featured) score += 18;
  if (input.trendingRank != null && input.trendingRank > 0) {
    score += Math.min(25, 8 + Math.floor(20 / Math.max(1, input.trendingRank)));
  }
  if (input.servedCount != null && input.servedCount > 0) {
    score += Math.min(20, Math.log10(input.servedCount + 1) * 10);
  }

  const signals = getEngagementSignals(input.recipeId, input.curatedRecipeId);
  if (signals) {
    const raw = engagementRaw(signals);
    const decayed = raw * decayMultiplier(signals.lastEventAt, now);
    score += Math.min(35, Math.sqrt(decayed) * 4);
  }

  return Math.min(100, Math.round(score));
}
