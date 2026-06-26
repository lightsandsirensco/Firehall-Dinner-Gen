import type { AnalyticsPeriod, AnalyticsRankedRow } from "../analytics/events.js";

export interface HallOfFamePayload {
  period: AnalyticsPeriod;
  generated_at: string;
  most_cooked: AnalyticsRankedRow[];
  most_voted: AnalyticsRankedRow[];
  most_wheel: AnalyticsRankedRow[];
}

export const HALL_OF_FAME_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  today: "Today",
  "7d": "This Week",
  "30d": "This Month",
  all: "All Time",
};

export function hallOfFameHeadline(period: AnalyticsPeriod): string {
  const span = HALL_OF_FAME_PERIOD_LABELS[period];
  if (period === "all") return "Canada's Top Firehall Meals — All Time";
  return `Canada's Top Meals ${span}`;
}
