import { apiRequest } from "@/lib/queryClient";
import type { HallAnalyticsPayload } from "@shared/hall-analytics/types";

export async function fetchHallAnalytics(hallId: string): Promise<HallAnalyticsPayload> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}/analytics`, {
    credentials: "include",
  });
  if (res.status === 402) {
    const err = new Error("Hall Pro required");
    (err as Error & { code?: string }).code = "hall_pro_required";
    throw err;
  }
  if (!res.ok) throw new Error("Failed to load hall analytics");
  return res.json();
}

export async function syncHallAnalytics(
  hallId: string,
  body: {
    entries: Array<{
      external_id: string;
      event_type: "meal_cooked" | "vote_created" | "wheel_spin" | "shopping_list_completed";
      title?: string;
      recipe_slug?: string;
      cuisine?: string;
      category?: string;
      shift_label?: string;
      occurred_at: string;
    }>;
    wheel_spin_days?: string[];
  },
): Promise<HallAnalyticsPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/analytics/sync`,
    body,
  );
  const json = await res.json();
  return json.analytics as HallAnalyticsPayload;
}
