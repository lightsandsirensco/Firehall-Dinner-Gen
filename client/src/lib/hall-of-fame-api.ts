import type { AnalyticsPeriod } from "@shared/analytics/events";
import type { HallOfFamePayload } from "@shared/hall-of-fame/types";

export const hallOfFameQueryKey = (period: AnalyticsPeriod, limit = 10) =>
  ["hall-of-fame", period, limit] as const;

export async function fetchHallOfFame(
  period: AnalyticsPeriod = "30d",
  limit = 10,
): Promise<HallOfFamePayload> {
  const params = new URLSearchParams({ period, limit: String(limit) });
  const res = await fetch(`/api/hall-of-fame?${params}`, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Hall of Fame fetch ${res.status}`);
  return res.json();
}
