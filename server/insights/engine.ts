/**
 * Firehall Meals Personalized Insights — deterministic engine.
 *
 * NO AI/LLM. Every function here is plain arithmetic over real rows.
 * Each insight type has a hard minimum-sample gate — below the threshold,
 * the insight is simply not generated (never shown with a tiny/misleading
 * sample). See shared/insights/types.ts for the wire shape.
 */
import type { Insight, InsightType } from "../../shared/insights/types.js";
import { getRecipeMeta } from "./catalog-meta.js";
import { NUTRITION_GOAL_LABELS } from "../../shared/nutrition/goal-scoring.js";

export interface InsightHistoryRow {
  recipe_slug: string;
  cooked_at: Date;
  rating: number | null;
  make_again: boolean | null;
  nutrition_goal: string | null;
  cost_per_person_min: number | null;
  cost_per_person_max: number | null;
  cost_trustworthy: boolean;
}

// Minimum sample thresholds — never generate an insight from a smaller sample than this.
const MIN_CUISINE_RATED = 4;
const MIN_PROTEIN_LOGGED = 4;
const MIN_COST_PERIOD = 4;
const MIN_NUTRITION_GOAL = 4;
const MIN_COOKTIME_BUCKET = 4;
const MIN_HIGHLY_RATED_RECENT = 5;
const MIN_VARIETY_NEW = 2;
const COOK_TIME_SPLIT_MIN = 45;
const RECENT_WINDOW = 7;
/** Below this make-again rate, "strong repeat choice" wouldn't be an honest read of the data. */
const MIN_MAKE_AGAIN_RATE_PCT = 50;

function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function mean(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function monthKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return monthKeyOf(d);
}

function insightCuisinePreference(rows: InsightHistoryRow[], now: Date): Insight | null {
  const byCuisine = new Map<string, number[]>();
  for (const r of rows) {
    if (r.rating == null) continue;
    const cuisine = getRecipeMeta(r.recipe_slug).cuisine;
    if (!cuisine) continue;
    if (!byCuisine.has(cuisine)) byCuisine.set(cuisine, []);
    byCuisine.get(cuisine)!.push(r.rating);
  }
  let best: { cuisine: string; avg: number; count: number } | null = null;
  for (const [cuisine, ratings] of byCuisine) {
    if (ratings.length < MIN_CUISINE_RATED) continue;
    const avg = mean(ratings);
    if (!best || avg > best.avg || (avg === best.avg && ratings.length > best.count)) {
      best = { cuisine, avg, count: ratings.length };
    }
  }
  if (!best) return null;
  return {
    id: `cuisine_preference:${best.cuisine}`,
    type: "cuisine_preference",
    category: "crew_preferences",
    title: `Your crew rates ${cap(best.cuisine)} meals highest.`,
    supporting_text: `Averaging ${best.avg.toFixed(1)}★ across ${best.count} rated meals.`,
    sample_count: best.count,
    metric: { label: "Avg rating", value: `${best.avg.toFixed(1)}★` },
    generated_at: now.toISOString(),
  };
}

function insightProteinRepeatRate(rows: InsightHistoryRow[], now: Date): Insight | null {
  const byProtein = new Map<string, { yes: number; total: number }>();
  for (const r of rows) {
    if (r.make_again == null) continue;
    const protein = getRecipeMeta(r.recipe_slug).protein;
    if (!protein) continue;
    if (!byProtein.has(protein)) byProtein.set(protein, { yes: 0, total: 0 });
    const bucket = byProtein.get(protein)!;
    bucket.total += 1;
    if (r.make_again) bucket.yes += 1;
  }
  let best: { protein: string; pct: number; count: number } | null = null;
  for (const [protein, { yes, total }] of byProtein) {
    if (total < MIN_PROTEIN_LOGGED) continue;
    const pct = Math.round((yes / total) * 100);
    if (pct < MIN_MAKE_AGAIN_RATE_PCT) continue;
    if (!best || pct > best.pct || (pct === best.pct && total > best.count)) {
      best = { protein, pct, count: total };
    }
  }
  if (!best) return null;
  return {
    id: `protein_repeat_rate:${best.protein}`,
    type: "protein_repeat_rate",
    category: "crew_preferences",
    title: `${cap(best.protein)} meals are a strong repeat choice.`,
    supporting_text: `${best.pct}% make-again rate across ${best.count} logged meals.`,
    sample_count: best.count,
    metric: { label: "Make again", value: `${best.pct}%` },
    generated_at: now.toISOString(),
  };
}

function insightCostTrend(rows: InsightHistoryRow[], now: Date): Insight | null {
  const thisMonth = monthKeyOf(now);
  const lastMonth = previousMonthKey(now);
  const priced = rows.filter(
    (r) => r.cost_trustworthy && r.cost_per_person_min != null && r.cost_per_person_max != null,
  );
  const midpoint = (r: InsightHistoryRow) => (r.cost_per_person_min! + r.cost_per_person_max!) / 2;
  const thisRows = priced.filter((r) => monthKeyOf(r.cooked_at) === thisMonth);
  const lastRows = priced.filter((r) => monthKeyOf(r.cooked_at) === lastMonth);
  if (thisRows.length < MIN_COST_PERIOD || lastRows.length < MIN_COST_PERIOD) return null;

  const avgThis = mean(thisRows.map(midpoint));
  const avgLast = mean(lastRows.map(midpoint));
  if (avgLast <= 0) return null;
  const pctChange = Math.round(((avgThis - avgLast) / avgLast) * 100);
  if (pctChange === 0) return null;

  const direction = pctChange < 0 ? "down" : "up";
  return {
    id: "cost_trend",
    type: "cost_trend",
    category: "cost",
    title: `Your average logged dinner cost is ${direction} ${Math.abs(pctChange)}% this month.`,
    supporting_text: `$${avgThis.toFixed(2)}/person this month vs $${avgLast.toFixed(2)}/person last month.`,
    sample_count: thisRows.length + lastRows.length,
    metric: { label: "This month avg", value: `$${avgThis.toFixed(2)}/person` },
    generated_at: now.toISOString(),
  };
}

function insightNutritionGoalPattern(rows: InsightHistoryRow[], now: Date): Insight | null {
  const withGoal = rows.filter((r) => r.nutrition_goal);
  if (withGoal.length < MIN_NUTRITION_GOAL) return null;
  const counts = new Map<string, number>();
  for (const r of withGoal) counts.set(r.nutrition_goal!, (counts.get(r.nutrition_goal!) ?? 0) + 1);
  let topGoal: string | null = null;
  let topCount = 0;
  for (const [goal, count] of counts) {
    if (count > topCount) {
      topGoal = goal;
      topCount = count;
    }
  }
  if (!topGoal) return null;
  const share = Math.round((topCount / withGoal.length) * 100);
  const label = NUTRITION_GOAL_LABELS[topGoal as keyof typeof NUTRITION_GOAL_LABELS] ?? cap(topGoal);
  return {
    id: `nutrition_goal_pattern:${topGoal}`,
    type: "nutrition_goal_pattern",
    category: "nutrition",
    title: `${label} is your most-used nutrition goal.`,
    supporting_text: `${topCount} of your last ${withGoal.length} logged meals with a saved goal (${share}%).`,
    sample_count: withGoal.length,
    metric: { label: "Share", value: `${share}%` },
    generated_at: now.toISOString(),
  };
}

function insightVarietyNewRecipes(now: Date, newRecipesThisMonthCount: number): Insight | null {
  if (newRecipesThisMonthCount < MIN_VARIETY_NEW) return null;
  return {
    id: "variety_new_recipes",
    type: "variety_new_recipes",
    category: "variety",
    title: `You've tried ${newRecipesThisMonthCount} new recipes this month.`,
    supporting_text: `First-time cooks logged this month, out of everything in your history.`,
    sample_count: newRecipesThisMonthCount,
    metric: { label: "New this month", value: String(newRecipesThisMonthCount) },
    generated_at: now.toISOString(),
  };
}

function insightCookTimePreference(rows: InsightHistoryRow[], now: Date): Insight | null {
  const under: number[] = [];
  const over: number[] = [];
  for (const r of rows) {
    if (r.rating == null) continue;
    const cookTime = getRecipeMeta(r.recipe_slug).cookTimeMin;
    if (cookTime == null) continue;
    (cookTime < COOK_TIME_SPLIT_MIN ? under : over).push(r.rating);
  }
  if (under.length < MIN_COOKTIME_BUCKET || over.length < MIN_COOKTIME_BUCKET) return null;
  const avgUnder = mean(under);
  const avgOver = mean(over);
  if (avgUnder === avgOver) return null;
  const underWins = avgUnder > avgOver;
  return {
    id: "cook_time_preference",
    type: "cook_time_preference",
    category: "cooking_time",
    title: underWins
      ? `Your crew rates meals under ${COOK_TIME_SPLIT_MIN} minutes higher.`
      : `Your crew rates meals ${COOK_TIME_SPLIT_MIN}+ minutes higher.`,
    supporting_text: `${avgUnder.toFixed(1)}★ under ${COOK_TIME_SPLIT_MIN} min (${under.length} meals) vs ${avgOver.toFixed(1)}★ at ${COOK_TIME_SPLIT_MIN}+ min (${over.length} meals).`,
    sample_count: under.length + over.length,
    generated_at: now.toISOString(),
  };
}

function insightHighlyRatedPattern(rows: InsightHistoryRow[], now: Date): Insight | null {
  const recent = [...rows].sort((a, b) => b.cooked_at.getTime() - a.cooked_at.getTime()).slice(0, RECENT_WINDOW);
  const rated = recent.filter((r) => r.rating != null);
  if (rated.length < MIN_HIGHLY_RATED_RECENT) return null;
  const highCount = rated.filter((r) => (r.rating ?? 0) >= 4).length;
  return {
    id: "highly_rated_pattern",
    type: "highly_rated_pattern",
    category: "meal_patterns",
    title: `${highCount} of your last ${recent.length} meals were rated 4★ or higher.`,
    supporting_text: `Based on your ${rated.length} most recently rated meals.`,
    sample_count: rated.length,
    generated_at: now.toISOString(),
  };
}

// Fixed, documented ranking weights — deterministic, not learned. Reliability
// comes from each insight's own real sample_count; recency/usefulness are
// per-type judgments about how fresh/actionable that category of insight is.
const RECENCY_WEIGHT: Record<InsightType, number> = {
  highly_rated_pattern: 1,
  cost_trend: 1,
  variety_new_recipes: 0.9,
  nutrition_goal_pattern: 0.6,
  cuisine_preference: 0.5,
  protein_repeat_rate: 0.5,
  cook_time_preference: 0.4,
};
const USEFULNESS_WEIGHT: Record<InsightType, number> = {
  cuisine_preference: 0.9,
  cost_trend: 0.9,
  protein_repeat_rate: 0.8,
  nutrition_goal_pattern: 0.7,
  highly_rated_pattern: 0.7,
  variety_new_recipes: 0.6,
  cook_time_preference: 0.6,
};
const RELIABILITY_CAP_SAMPLE = 12;
const MAX_INSIGHTS = 5;

function rankInsights(insights: Insight[]): Insight[] {
  return [...insights]
    .sort((a, b) => {
      const score = (i: Insight) =>
        0.4 * Math.min(1, i.sample_count / RELIABILITY_CAP_SAMPLE) +
        0.3 * RECENCY_WEIGHT[i.type] +
        0.3 * USEFULNESS_WEIGHT[i.type];
      return score(b) - score(a);
    })
    .slice(0, MAX_INSIGHTS);
}

export function computeInsights(
  rows: InsightHistoryRow[],
  newRecipesThisMonthCount: number,
  now: Date = new Date(),
): Insight[] {
  const candidates = [
    insightCuisinePreference(rows, now),
    insightProteinRepeatRate(rows, now),
    insightCostTrend(rows, now),
    insightNutritionGoalPattern(rows, now),
    insightVarietyNewRecipes(now, newRecipesThisMonthCount),
    insightCookTimePreference(rows, now),
    insightHighlyRatedPattern(rows, now),
  ].filter((i): i is Insight => i !== null);

  return rankInsights(candidates);
}
