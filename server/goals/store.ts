/**
 * Firehall Meals Goals + Progress (V2) — server store.
 *
 * Progress is ALWAYS computed live from user_meal_history + the user's
 * saved nutrition_goal — never stored/duplicated, so it can never drift.
 * See shared/goals/types.ts for the product/data contract.
 */
import { verifyPgConnection } from "../db/pg-client.js";
import { pgAll, pgOne, pgRun } from "../db/pg-sql.js";
import {
  GOAL_DEFINITIONS,
  GOAL_TYPES,
  type GoalProgress,
  type GoalType,
  type GoalsResponse,
  type MonthlySummary,
} from "../../shared/goals/types.js";

export async function initGoalsStore(): Promise<void> {
  await verifyPgConnection();
}

/** Calendar month key in UTC, e.g. "2026-09". Shift schedules can cross midnight/timezones — see DATA LIMITATIONS. */
export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface MonthRow {
  recipe_slug: string;
  is_high_protein: number | null;
  is_high_fiber: number | null;
  nutrition_goal: string | null;
  cost_per_person_min: string | number | null;
  cost_per_person_max: string | number | null;
  cost_trustworthy: number | null;
  rating: number | null;
}

export interface MonthStats {
  totalCooked: number;
  newMealsTried: number;
  highProteinCount: number;
  highFiberCount: number;
  healthierCount: number;
  nutritionGoalMatchCount: number;
  /** Match count for ANY nutrition_goal value logged this month — keyed by that goal string, not just the live profile preference. Lets each nutrition_goal_match GOAL count against its own frozen snapshot. */
  matchCountByGoal: Record<string, number>;
  savedNutritionGoal: string | null;
  avgCostPerPerson: number | null;
  costDataCount: number;
  rated4PlusCount: number;
}

function toNum(v: string | number | null): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

async function computeMonthStats(userId: string, monthKey: string): Promise<MonthStats> {
  const prefRow = await pgOne<{ nutrition_goal: string | null }>(
    `SELECT nutrition_goal FROM user_preferences WHERE user_id = $1`,
    [userId],
  );
  const savedNutritionGoal =
    prefRow?.nutrition_goal && prefRow.nutrition_goal !== "no_preference" ? prefRow.nutrition_goal : null;

  const rows = await pgAll<MonthRow>(
    `SELECT recipe_slug, is_high_protein, is_high_fiber, nutrition_goal,
            cost_per_person_min, cost_per_person_max, cost_trustworthy, rating
     FROM user_meal_history
     WHERE user_id = $1 AND to_char(cooked_at, 'YYYY-MM') = $2`,
    [userId, monthKey],
  );

  const firstCookedRows = await pgAll<{ recipe_slug: string; first_month: string }>(
    `SELECT recipe_slug, to_char(MIN(cooked_at), 'YYYY-MM') AS first_month
     FROM user_meal_history WHERE user_id = $1 GROUP BY recipe_slug`,
    [userId],
  );
  const newSlugsThisMonth = new Set(
    firstCookedRows.filter((r) => r.first_month === monthKey).map((r) => r.recipe_slug),
  );
  const distinctSlugsThisMonth = new Set(rows.map((r) => r.recipe_slug));
  const newMealsTried = [...distinctSlugsThisMonth].filter((s) => newSlugsThisMonth.has(s)).length;

  const highProteinCount = rows.filter((r) => r.is_high_protein === 1).length;
  const highFiberCount = rows.filter((r) => r.is_high_fiber === 1).length;
  const healthierCount = rows.filter((r) => r.is_high_protein === 1 || r.is_high_fiber === 1).length;
  const nutritionGoalMatchCount = savedNutritionGoal
    ? rows.filter((r) => r.nutrition_goal === savedNutritionGoal).length
    : 0;
  const matchCountByGoal: Record<string, number> = {};
  for (const r of rows) {
    if (!r.nutrition_goal) continue;
    matchCountByGoal[r.nutrition_goal] = (matchCountByGoal[r.nutrition_goal] ?? 0) + 1;
  }

  const costRows = rows
    .map((r) => ({ min: toNum(r.cost_per_person_min), max: toNum(r.cost_per_person_max), trustworthy: r.cost_trustworthy }))
    .filter((r) => r.trustworthy === 1 && r.min != null && r.max != null) as { min: number; max: number }[];
  const costDataCount = costRows.length;
  const avgCostPerPerson =
    costDataCount > 0
      ? Math.round((costRows.reduce((sum, r) => sum + (r.min + r.max) / 2, 0) / costDataCount) * 100) / 100
      : null;

  const rated4PlusCount = rows.filter((r) => r.rating != null && r.rating >= 4).length;

  return {
    totalCooked: rows.length,
    newMealsTried,
    highProteinCount,
    highFiberCount,
    healthierCount,
    nutritionGoalMatchCount,
    matchCountByGoal,
    savedNutritionGoal,
    avgCostPerPerson,
    costDataCount,
    rated4PlusCount,
  };
}

/** Exported only for scripts/test-goals-nutrition-snapshot.ts — pure function, no DB access. */
export function computeProgress(
  goalType: GoalType,
  target: number,
  stats: MonthStats,
  nutritionGoalSnapshot?: string | null,
): GoalProgress {
  const def = GOAL_DEFINITIONS[goalType];
  let current: number;
  let dataCoverage: GoalProgress["data_coverage"];

  switch (goalType) {
    case "shift_meals":
      current = stats.totalCooked;
      break;
    case "new_meals":
      current = stats.newMealsTried;
      break;
    case "high_protein_shifts":
      current = stats.highProteinCount;
      break;
    case "plant_forward_meals":
      current = stats.highFiberCount;
      break;
    case "healthier_meals":
      current = stats.healthierCount;
      break;
    case "nutrition_goal_match":
      // Frozen at goal-creation time (nutrition_goal_snapshot) — a later
      // profile preference change never retroactively changes what this
      // specific goal counts toward. Legacy goals created before this
      // snapshot existed have no value here and fall back to the live
      // saved preference, exactly as they always have.
      current = nutritionGoalSnapshot
        ? (stats.matchCountByGoal[nutritionGoalSnapshot] ?? 0)
        : stats.nutritionGoalMatchCount;
      break;
    case "budget_avg_under":
      current = stats.avgCostPerPerson ?? 0;
      dataCoverage = { counted: stats.costDataCount, total: stats.totalCooked };
      break;
  }

  let percent: number;
  let completed: boolean;
  if (def.direction === "at_most") {
    // Budget: bar shows how much of the budget ceiling is used. No cost
    // data yet this month = nothing to judge, never silently "complete".
    const hasData = (dataCoverage?.counted ?? 0) > 0;
    percent = hasData && target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    completed = hasData && current <= target;
  } else {
    percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    completed = current >= target;
  }

  return {
    goal_type: goalType,
    target,
    current,
    unit: def.unit,
    direction: def.direction,
    percent,
    completed,
    ...(dataCoverage ? { data_coverage: dataCoverage } : {}),
    ...(goalType === "nutrition_goal_match"
      ? { nutrition_goal_snapshot: nutritionGoalSnapshot ?? stats.savedNutritionGoal }
      : {}),
  };
}

/** nutrition_goal_match only offered when the user has a real saved goal to compare snapshots against. */
function availableGoalTypes(savedNutritionGoal: string | null): GoalType[] {
  return GOAL_TYPES.filter((t) => t !== "nutrition_goal_match" || savedNutritionGoal !== null);
}

export async function getGoalsForUser(userId: string): Promise<GoalsResponse> {
  const monthKey = currentMonthKey();
  const stats = await computeMonthStats(userId, monthKey);

  const goalRows = await pgAll<{ goal_type: GoalType; target: number; nutrition_goal_snapshot: string | null }>(
    `SELECT goal_type, target, nutrition_goal_snapshot FROM user_goals WHERE user_id = $1 AND month_key = $2`,
    [userId, monthKey],
  );

  const progress = goalRows.map((g) => computeProgress(g.goal_type, g.target, stats, g.nutrition_goal_snapshot));
  const summary: MonthlySummary = {
    month_key: monthKey,
    meals_logged: stats.totalCooked,
    new_meals_tried: stats.newMealsTried,
    saved_nutrition_goal: stats.savedNutritionGoal,
    nutrition_goal_matches: stats.savedNutritionGoal ? stats.nutritionGoalMatchCount : null,
    avg_cost_per_person: stats.avgCostPerPerson,
    cost_data_meal_count: stats.costDataCount,
    rated_4_plus_count: stats.rated4PlusCount,
  };

  return {
    entitled: true,
    month_key: monthKey,
    available_goal_types: availableGoalTypes(stats.savedNutritionGoal),
    active: progress.filter((p) => !p.completed),
    completed: progress.filter((p) => p.completed),
    summary,
  };
}

export async function setUserGoal(userId: string, goalType: GoalType, target: number): Promise<void> {
  const monthKey = currentMonthKey();
  const def = GOAL_DEFINITIONS[goalType];
  const clamped = Math.max(def.minTarget, Math.min(def.maxTarget, Math.round(target)));

  // nutrition_goal_match — freeze the CURRENT active profile nutrition goal
  // into this goal at creation time. Intentionally only ever set on INSERT
  // (see ON CONFLICT clause below): editing the target of an existing goal
  // later must never re-snapshot/change what it's already tracking.
  let snapshot: string | null = null;
  if (goalType === "nutrition_goal_match") {
    const prefRow = await pgOne<{ nutrition_goal: string | null }>(
      `SELECT nutrition_goal FROM user_preferences WHERE user_id = $1`,
      [userId],
    );
    snapshot = prefRow?.nutrition_goal && prefRow.nutrition_goal !== "no_preference" ? prefRow.nutrition_goal : null;
  }

  await pgRun(
    `INSERT INTO user_goals (user_id, goal_type, target, month_key, nutrition_goal_snapshot)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, goal_type, month_key) DO UPDATE SET target = excluded.target`,
    [userId, goalType, clamped, monthKey, snapshot],
  );
}

export async function removeUserGoal(userId: string, goalType: GoalType): Promise<void> {
  const monthKey = currentMonthKey();
  await pgRun(`DELETE FROM user_goals WHERE user_id = $1 AND goal_type = $2 AND month_key = $3`, [
    userId,
    goalType,
    monthKey,
  ]);
}
