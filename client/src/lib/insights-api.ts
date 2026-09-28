/**
 * Firehall Meals Personalized Insights client API.
 * Server is the sole source of truth for entitlement + the insight math.
 */
import { apiRequest } from "@/lib/queryClient";
import type { InsightsResponse } from "@shared/insights/types";

export async function fetchInsights(): Promise<InsightsResponse> {
  const res = await apiRequest("GET", "/api/insights");
  return res.json();
}
