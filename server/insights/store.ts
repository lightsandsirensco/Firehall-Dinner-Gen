/**
 * Firehall Meals Personalized Insights — Pro-only, deterministic.
 *
 * Reads only from user_meal_history (already-collected rating/make_again/
 * nutrition_goal/frozen cost snapshot columns) joined with already-published
 * catalog metadata (server/insights/catalog-meta.ts). No new tables, no
 * derived/sensitive profile attributes are persisted — insights are
 * recomputed fresh on every request.
 */
import { verifyPgConnection } from "../db/pg-client.js";
import { pgAll } from "../db/pg-sql.js";
import { computeInsights, type InsightHistoryRow } from "./engine.js";
import type { InsightsResponse } from "../../shared/insights/types.js";

export async function initInsightsStore(): Promise<void> {
  await verifyPgConnection();
}

interface RawRow {
  recipe_slug: string;
  cooked_at: Date;
  rating: number | null;
  make_again: number | null;
  nutrition_goal: string | null;
  cost_per_person_min: string | number | null;
  cost_per_person_max: string | number | null;
  cost_trustworthy: number | null;
}

function toNum(v: string | number | null): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// Bounds the query for very long-tenured users — plenty of signal for every
// insight type here (all-time cuisine/protein aggregates, this-month vs
// last-month cost, last-7 rated pattern) without an unbounded scan.
const HISTORY_LOOKBACK_LIMIT = 300;

export async function getInsightsForUser(userId: string): Promise<InsightsResponse> {
  const now = new Date();

  const rawRows = await pgAll<RawRow>(
    `SELECT recipe_slug, cooked_at, rating, make_again, nutrition_goal,
            cost_per_person_min, cost_per_person_max, cost_trustworthy
     FROM user_meal_history
     WHERE user_id = $1
     ORDER BY cooked_at DESC, id DESC
     LIMIT $2`,
    [userId, HISTORY_LOOKBACK_LIMIT],
  );

  const rows: InsightHistoryRow[] = rawRows.map((r) => ({
    recipe_slug: r.recipe_slug,
    cooked_at: r.cooked_at instanceof Date ? r.cooked_at : new Date(r.cooked_at),
    rating: r.rating,
    make_again: r.make_again == null ? null : r.make_again === 1,
    nutrition_goal: r.nutrition_goal,
    cost_per_person_min: toNum(r.cost_per_person_min),
    cost_per_person_max: toNum(r.cost_per_person_max),
    cost_trustworthy: r.cost_trustworthy === 1,
  }));

  // Same "first cooked this calendar month" logic as Goals + Progress
  // (server/goals/store.ts) — kept as its own lightweight query rather than
  // reusing the bounded `rows` above so long meal-history users still get
  // an accurate first-ever-cooked month per recipe.
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const firstCookedRows = await pgAll<{ recipe_slug: string; first_month: string }>(
    `SELECT recipe_slug, to_char(MIN(cooked_at), 'YYYY-MM') AS first_month
     FROM user_meal_history WHERE user_id = $1 GROUP BY recipe_slug`,
    [userId],
  );
  const newRecipesThisMonthCount = firstCookedRows.filter((r) => r.first_month === monthKey).length;

  const insights = computeInsights(rows, newRecipesThisMonthCount, now);

  return {
    entitled: true,
    insights,
    generated_at: now.toISOString(),
  };
}
