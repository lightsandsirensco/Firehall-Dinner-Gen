/**

 * Hall growth dashboard — North Star, cohort retention, and time-series charts.

 */



import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";

import type { AnalyticsPeriod } from "../../shared/analytics/events.js";

import {

  GROWTH_NORTH_STAR_DESCRIPTION,

  GROWTH_NORTH_STAR_LABEL,

  type GrowthChartPoint,

  type GrowthChartRange,

  type GrowthDashboardCohortRow,

  type GrowthDashboardPayload,

} from "../../shared/growth-dashboard/types.js";



let db: SqliteDatabase;



const MS_PER_DAY = 86_400_000;

const MS_PER_WEEK = 7 * MS_PER_DAY;



export async function initGrowthDashboardStore(): Promise<void> {

  db = await getSharedLocalDb();

}



export function bindGrowthDashboardDb(database: SqliteDatabase): void {

  db = database;

}



function getDb(): SqliteDatabase {

  if (!db) {

    throw new Error("Growth dashboard store not initialized — call initGrowthDashboardStore() first");

  }

  return db;

}



function periodWhere(period: AnalyticsPeriod, column: string): { clause: string; params: string[] } {

  switch (period) {

    case "today":

      return { clause: `${column} >= datetime('now', 'start of day')`, params: [] };

    case "7d":

      return { clause: `${column} >= datetime('now', '-7 days')`, params: [] };

    case "30d":

      return { clause: `${column} >= datetime('now', '-30 days')`, params: [] };

    default:

      return { clause: "1=1", params: [] };

  }

}



function chartRangeDays(range: GrowthChartRange): number {

  switch (range) {

    case "7d":

      return 7;

    case "30d":

      return 30;

    case "90d":

      return 90;

  }

}



interface HallRow {

  hall_id: string;

  created_at: string;

}



interface ShiftRow {

  hall_id: string;

  shift_id: string;

  shift_key: string;

  name: string;

}



interface ActivityRow {

  hall_id: string;

  occurred_at: string;

  shift_label: string | null;

  shift_key: string | null;

  event_kind: "vote" | "meal" | "shopping" | "other";

}



function loadHalls(period: AnalyticsPeriod): HallRow[] {

  const { clause, params } = periodWhere(period, "created_at");

  return getDb()

    .prepare(`SELECT hall_id, created_at FROM halls WHERE ${clause} ORDER BY created_at`)

    .all(...params) as unknown as HallRow[];

}



function loadEnabledShiftsByHall(): Map<string, ShiftRow[]> {

  const rows = getDb()

    .prepare(

      `SELECT hall_id, shift_id, shift_key, name FROM hall_shifts WHERE enabled = 1 ORDER BY sort_order`,

    )

    .all() as unknown as ShiftRow[];

  const map = new Map<string, ShiftRow[]>();

  for (const row of rows) {

    const list = map.get(row.hall_id) ?? [];

    list.push(row);

    map.set(row.hall_id, list);

  }

  return map;

}



function classifyEventType(eventType: string): ActivityRow["event_kind"] {

  if (

    eventType === "vote_created" ||

    eventType === "hall_vote_started" ||

    eventType === "hall_first_vote_created" ||

    eventType === "hall_vote_create" ||

    eventType === "shift_vote_created"

  ) {

    return "vote";

  }

  if (

    eventType === "meal_cooked" ||

    eventType === "meal_generated" ||

    eventType === "shift_meal_selected"

  ) {

    return "meal";

  }

  if (eventType === "shopping_list_completed" || eventType === "shared_shopping_list_completed") {

    return "shopping";

  }

  return "other";

}



function loadHallActivityRows(): ActivityRow[] {

  const d = getDb();



  const fromHallActivity = d

    .prepare(`SELECT hall_id, occurred_at, shift_label, event_type FROM hall_activity_events`)

    .all() as Array<{

    hall_id: string;

    occurred_at: string;

    shift_label: string | null;

    event_type: string;

  }>;



  const analyticsRows = d

    .prepare(

      `

      SELECT

        json_extract(metadata_json, '$.hall_id') AS hall_id,

        occurred_at,

        event_type,

        json_extract(metadata_json, '$.shift_label') AS shift_label,

        json_extract(metadata_json, '$.shift_key') AS shift_key

      FROM analytics_events

      WHERE json_extract(metadata_json, '$.hall_id') IS NOT NULL

        AND event_type IN (

          'hall_vote_started', 'hall_first_vote_created', 'hall_vote_create',

          'meal_cooked', 'meal_generated', 'shared_shopping_list_completed',

          'hall_activation_completed', 'hall_dashboard_viewed', 'hall_joined',

          'shared_shopping_list_created', 'hall_analytics_viewed',

          'shift_dashboard_viewed', 'shift_vote_created', 'shift_meal_selected'

        )

      `,

    )

    .all() as Array<{

    hall_id: string;

    occurred_at: string;

    event_type: string;

    shift_label: string | null;

    shift_key: string | null;

  }>;



  const rows: ActivityRow[] = [];



  for (const row of fromHallActivity) {

    rows.push({

      hall_id: row.hall_id,

      occurred_at: row.occurred_at,

      shift_label: row.shift_label,

      shift_key: inferShiftKeyFromLabel(row.shift_label),

      event_kind: classifyEventType(row.event_type),

    });

  }



  for (const row of analyticsRows) {

    if (!row.hall_id) continue;

    rows.push({

      hall_id: String(row.hall_id),

      occurred_at: row.occurred_at,

      shift_label: row.shift_label ? String(row.shift_label) : null,

      shift_key: row.shift_key ? String(row.shift_key) : inferShiftKeyFromLabel(row.shift_label),

      event_kind: classifyEventType(row.event_type),

    });

  }



  return rows;

}



function inferShiftKeyFromLabel(label: string | null): string | null {

  if (!label) return null;

  const normalized = label.trim().toLowerCase();

  if (/^a(\s+shift)?$/.test(normalized) || normalized.startsWith("a shift")) return "a";

  if (/^b(\s+shift)?$/.test(normalized) || normalized.startsWith("b shift")) return "b";

  if (/^c(\s+shift)?$/.test(normalized) || normalized.startsWith("c shift")) return "c";

  if (/^d(\s+shift)?$/.test(normalized) || normalized.startsWith("d shift")) return "d";

  return null;

}



function activityMatchesShift(activity: ActivityRow, shift: ShiftRow): boolean {

  if (activity.shift_key && activity.shift_key === shift.shift_key) return true;

  if (activity.shift_label) {

    const normalized = activity.shift_label.trim().toLowerCase();

    if (normalized === shift.name.trim().toLowerCase()) return true;

    if (normalized === `${shift.shift_key} shift`) return true;

    if (normalized === shift.shift_key.toLowerCase()) return true;

  }

  return false;

}



function parseIsoMs(value: string): number {

  const ms = Date.parse(value);

  return Number.isFinite(ms) ? ms : 0;

}



function toDateKey(ms: number): string {

  return new Date(ms).toISOString().slice(0, 10);

}



function weekIndexAfterCreation(createdAt: string, activityAt: string): number | null {

  const createdMs = parseIsoMs(createdAt);

  const activityMs = parseIsoMs(activityAt);

  if (!createdMs || !activityMs || activityMs < createdMs) return null;

  const week = Math.floor((activityMs - createdMs) / MS_PER_WEEK) + 1;

  if (week < 1 || week > 4) return null;

  return week;

}



function hallHadActivityInWeek(

  hallId: string,

  createdAt: string,

  week: number,

  activityByHall: Map<string, ActivityRow[]>,

): boolean {

  const rows = activityByHall.get(hallId) ?? [];

  for (const row of rows) {

    if (weekIndexAfterCreation(createdAt, row.occurred_at) === week) return true;

  }

  return false;

}



function shiftHadActivityInWeek(

  hallId: string,

  shift: ShiftRow,

  createdAt: string,

  week: number,

  activityByHall: Map<string, ActivityRow[]>,

): boolean {

  const rows = activityByHall.get(hallId) ?? [];

  for (const row of rows) {

    if (weekIndexAfterCreation(createdAt, row.occurred_at) !== week) continue;

    if (activityMatchesShift(row, shift)) return true;

  }

  return false;

}



function hallActiveEveryShiftEveryWeekForFourWeeks(

  hallId: string,

  createdAt: string,

  activityByHall: Map<string, ActivityRow[]>,

  shiftsByHall: Map<string, ShiftRow[]>,

): boolean {

  const shifts = shiftsByHall.get(hallId) ?? [];

  if (shifts.length === 0) return false;



  for (let week = 1; week <= 4; week++) {

    for (const shift of shifts) {

      if (!shiftHadActivityInWeek(hallId, shift, createdAt, week, activityByHall)) {

        return false;

      }

    }

  }

  return true;

}



function periodCutoffMs(period: AnalyticsPeriod): number | null {

  const now = Date.now();

  switch (period) {

    case "today":

      return new Date().setHours(0, 0, 0, 0);

    case "7d":

      return now - 7 * MS_PER_DAY;

    case "30d":

      return now - 30 * MS_PER_DAY;

    default:

      return null;

  }

}



function countActiveHalls(activityRows: ActivityRow[], period: AnalyticsPeriod): number {

  const { clause } = periodWhere(period, "occurred_at");

  const d = getDb();

  const row = d

    .prepare(

      `

      SELECT COUNT(DISTINCT hall_id) AS c FROM (

        SELECT hall_id, occurred_at FROM hall_activity_events WHERE ${clause}

        UNION ALL

        SELECT json_extract(metadata_json, '$.hall_id') AS hall_id, occurred_at

        FROM analytics_events

        WHERE ${clause}

          AND json_extract(metadata_json, '$.hall_id') IS NOT NULL

          AND event_type IN (

            'hall_vote_started', 'hall_first_vote_created', 'hall_vote_create',

            'meal_cooked', 'meal_generated', 'shared_shopping_list_completed',

            'hall_dashboard_viewed', 'hall_activation_completed', 'shift_dashboard_viewed'

          )

      )

      WHERE hall_id IS NOT NULL

      `,

    )

    .get() as { c: number };



  if (Number(row?.c ?? 0) > 0) return Number(row.c);



  const cutoff = periodCutoffMs(period);

  const halls = new Set<string>();

  for (const row of activityRows) {

    if (cutoff && parseIsoMs(row.occurred_at) < cutoff) continue;

    halls.add(row.hall_id);

  }

  return halls.size;

}



function countActiveShifts(

  activityRows: ActivityRow[],

  shiftsByHall: Map<string, ShiftRow[]>,

  period: AnalyticsPeriod,

): number {

  const cutoff = periodCutoffMs(period);

  const keys = new Set<string>();



  for (const activity of activityRows) {

    if (cutoff && parseIsoMs(activity.occurred_at) < cutoff) continue;

    const shifts = shiftsByHall.get(activity.hall_id) ?? [];

    for (const shift of shifts) {

      if (activityMatchesShift(activity, shift)) {

        keys.add(`${activity.hall_id}:${shift.shift_key}`);

      }

    }

  }



  return keys.size;

}



function countHallProTrials(period: AnalyticsPeriod): number {

  const { clause } = periodWhere(period, "updated_at");

  const hallTrials = getDb()

    .prepare(

      `SELECT COUNT(*) AS c FROM hall_subscriptions WHERE status = 'trialing' AND ${clause}`,

    )

    .get() as { c: number };



  const { clause: eventClause } = periodWhere(period, "occurred_at");

  const trialEvents = getDb()

    .prepare(

      `SELECT COUNT(*) AS c FROM analytics_events WHERE event_type = 'hall_pro_trial_started' AND ${eventClause}`,

    )

    .get() as { c: number };



  const legacyPlanSelected = getDb()

    .prepare(

      `

      SELECT COUNT(*) AS c FROM analytics_events

      WHERE event_type = 'plan_selected'

        AND json_extract(metadata_json, '$.plan_id') = 'hall_pro'

        AND ${eventClause}

      `,

    )

    .get() as { c: number };



  return Number(hallTrials.c) + Number(trialEvents.c) + Number(legacyPlanSelected.c);

}



function countHallProConversions(period: AnalyticsPeriod): number {

  const { clause } = periodWhere(period, "updated_at");

  const hallActive = getDb()

    .prepare(

      `SELECT COUNT(*) AS c FROM hall_subscriptions WHERE status = 'active' AND plan_id = 'hall_pro' AND ${clause}`,

    )

    .get() as { c: number };



  const { clause: eventClause } = periodWhere(period, "occurred_at");

  const convertedEvents = getDb()

    .prepare(

      `SELECT COUNT(*) AS c FROM analytics_events WHERE event_type = 'hall_pro_converted' AND ${eventClause}`,

    )

    .get() as { c: number };



  const enabledEvents = getDb()

    .prepare(

      `SELECT COUNT(*) AS c FROM analytics_events WHERE event_type = 'hall_pro_enabled' AND ${eventClause}`,

    )

    .get() as { c: number };



  return Number(hallActive.c) + Number(convertedEvents.c) + Number(enabledEvents.c);

}



function countEventTotals(period: AnalyticsPeriod): {

  votes: number;

  meals: number;

  shoppingLists: number;

} {

  const { clause } = periodWhere(period, "occurred_at");

  const d = getDb();



  const votesFromActivity = d

    .prepare(

      `SELECT COUNT(*) AS c FROM hall_activity_events WHERE event_type = 'vote_created' AND ${clause}`,

    )

    .get() as { c: number };



  const mealsFromActivity = d

    .prepare(

      `SELECT COUNT(*) AS c FROM hall_activity_events WHERE event_type = 'meal_cooked' AND ${clause}`,

    )

    .get() as { c: number };



  const listsFromActivity = d

    .prepare(

      `SELECT COUNT(*) AS c FROM hall_activity_events WHERE event_type = 'shopping_list_completed' AND ${clause}`,

    )

    .get() as { c: number };



  const votesFromAnalytics = d

    .prepare(

      `

      SELECT COUNT(*) AS c FROM analytics_events

      WHERE event_type IN ('hall_vote_started', 'hall_first_vote_created', 'hall_vote_create', 'shift_vote_created')

        AND ${clause}

      `,

    )

    .get() as { c: number };



  const mealsFromAnalytics = d

    .prepare(

      `

      SELECT COUNT(*) AS c FROM analytics_events

      WHERE event_type IN ('meal_cooked', 'meal_generated', 'shift_meal_selected')

        AND ${clause}

      `,

    )

    .get() as { c: number };



  const listsFromAnalytics = d

    .prepare(

      `

      SELECT COUNT(*) AS c FROM analytics_events

      WHERE event_type = 'shared_shopping_list_completed'

        AND ${clause}

      `,

    )

    .get() as { c: number };



  return {

    votes: Number(votesFromActivity.c) + Number(votesFromAnalytics.c),

    meals: Number(mealsFromActivity.c) + Number(mealsFromAnalytics.c),

    shoppingLists: Number(listsFromActivity.c) + Number(listsFromAnalytics.c),

  };

}



function buildCohorts(

  cohortHalls: HallRow[],

  activityByHall: Map<string, ActivityRow[]>,

): GrowthDashboardCohortRow[] {

  const cohortSize = cohortHalls.length;

  const rows: GrowthDashboardCohortRow[] = [];



  for (let week = 1; week <= 4; week++) {

    let active = 0;

    for (const hall of cohortHalls) {

      if (hallHadActivityInWeek(hall.hall_id, hall.created_at, week, activityByHall)) {

        active++;

      }

    }

    rows.push({

      week: week as 1 | 2 | 3 | 4,

      label: `Week ${week}`,

      active_halls: active,

      retention_pct: cohortSize > 0 ? Math.round((active / cohortSize) * 1000) / 10 : 0,

    });

  }



  return rows;

}



function buildChart(

  activityRows: ActivityRow[],

  shiftsByHall: Map<string, ShiftRow[]>,

  chartRange: GrowthChartRange,

): GrowthChartPoint[] {

  const days = chartRangeDays(chartRange);

  const end = new Date();

  end.setUTCHours(0, 0, 0, 0);

  const startMs = end.getTime() - (days - 1) * MS_PER_DAY;



  const points: GrowthChartPoint[] = [];



  for (let i = 0; i < days; i++) {

    const dayMs = startMs + i * MS_PER_DAY;

    const date = toDateKey(dayMs);

    const nextDayMs = dayMs + MS_PER_DAY;



    const halls = new Set<string>();

    const shifts = new Set<string>();

    let votes = 0;

    let meals = 0;

    let shopping = 0;



    for (const row of activityRows) {

      const ms = parseIsoMs(row.occurred_at);

      if (ms < dayMs || ms >= nextDayMs) continue;



      halls.add(row.hall_id);



      const hallShifts = shiftsByHall.get(row.hall_id) ?? [];

      for (const shift of hallShifts) {

        if (activityMatchesShift(row, shift)) {

          shifts.add(`${row.hall_id}:${shift.shift_key}`);

        }

      }



      if (row.event_kind === "vote") votes++;

      if (row.event_kind === "meal") meals++;

      if (row.event_kind === "shopping") shopping++;

    }



    points.push({

      date,

      active_halls: halls.size,

      active_shifts: shifts.size,

      hall_votes: votes,

      meals_generated: meals,

      shopping_lists: shopping,

    });

  }



  return points;

}



export function getGrowthDashboard(

  period: AnalyticsPeriod,

  chartRange: GrowthChartRange = "30d",

): GrowthDashboardPayload {

  const halls = loadHalls(period);

  const activityRows = loadHallActivityRows();

  const shiftsByHall = loadEnabledShiftsByHall();



  const activityByHall = new Map<string, ActivityRow[]>();

  for (const row of activityRows) {

    const list = activityByHall.get(row.hall_id) ?? [];

    list.push(row);

    activityByHall.set(row.hall_id, list);

  }



  const cohortHalls =

    period === "all"

      ? halls

      : halls.filter((hall) => parseIsoMs(hall.created_at) <= Date.now() - 4 * MS_PER_WEEK);



  let northStarCount = 0;

  for (const hall of cohortHalls) {

    if (

      hallActiveEveryShiftEveryWeekForFourWeeks(

        hall.hall_id,

        hall.created_at,

        activityByHall,

        shiftsByHall,

      )

    ) {

      northStarCount++;

    }

  }



  const eventTotals = countEventTotals(period);



  return {

    period,

    chart_range: chartRange,

    generated_at: new Date().toISOString(),

    north_star: {

      label: GROWTH_NORTH_STAR_LABEL,

      count: northStarCount,

      description: GROWTH_NORTH_STAR_DESCRIPTION,

      cohort_halls: cohortHalls.length,

    },

    metrics: {

      active_halls: countActiveHalls(activityRows, period),

      active_shifts: countActiveShifts(activityRows, shiftsByHall, period),

      hall_votes: eventTotals.votes,

      meals_generated: eventTotals.meals,

      shopping_lists: eventTotals.shoppingLists,

      hall_pro_trials: countHallProTrials(period),

      hall_pro_conversions: countHallProConversions(period),

    },

    cohorts: buildCohorts(cohortHalls, activityByHall),

    chart: buildChart(activityRows, shiftsByHall, chartRange),

  };

}


