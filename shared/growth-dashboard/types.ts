import type { AnalyticsPeriod } from "../analytics/events.js";



/** Chart window for time-series on the growth dashboard. */

export type GrowthChartRange = "7d" | "30d" | "90d";



export interface GrowthDashboardCohortRow {

  week: 1 | 2 | 3 | 4;

  label: string;

  active_halls: number;

  retention_pct: number;

}



export interface GrowthDashboardMetrics {

  active_halls: number;

  active_shifts: number;

  hall_votes: number;

  meals_generated: number;

  shopping_lists: number;

  hall_pro_trials: number;

  hall_pro_conversions: number;

}



export interface GrowthDashboardNorthStar {

  label: string;

  count: number;

  description: string;

  cohort_halls: number;

}



export interface GrowthChartPoint {

  date: string;

  active_halls: number;

  active_shifts: number;

  hall_votes: number;

  meals_generated: number;

  shopping_lists: number;

}



export interface GrowthDashboardPayload {

  period: AnalyticsPeriod;

  chart_range: GrowthChartRange;

  generated_at: string;

  north_star: GrowthDashboardNorthStar;

  metrics: GrowthDashboardMetrics;

  cohorts: GrowthDashboardCohortRow[];

  chart: GrowthChartPoint[];

}



export const GROWTH_CHART_RANGES: GrowthChartRange[] = ["7d", "30d", "90d"];



export const GROWTH_NORTH_STAR_LABEL = "Consecutive Shift Halls";



export const GROWTH_NORTH_STAR_DESCRIPTION =

  "Halls where every enabled shift logged crew activity in each of the first four weeks after creation.";


