import { fetchWithCsrf } from "@/lib/csrf-fetch";
import { apiRequest } from "@/lib/queryClient";
import type { ProteinDealsResponse } from "@shared/protein-deals/types";
import type {
  HallGroceryPreferences,
  NearbyStoresResponse,
} from "@shared/grocery-stores/types";
import type { SaveGroceryPreferencesInput } from "@shared/grocery-stores/schema";

export async function fetchGroceryPreferences(hallId: string): Promise<HallGroceryPreferences> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}/grocery/preferences`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load grocery preferences");
  return res.json();
}

export async function fetchNearbyStores(
  hallId: string,
  params: { postal_code?: string; country?: string; radius_km?: number },
): Promise<NearbyStoresResponse> {
  const qs = new URLSearchParams();
  if (params.postal_code) qs.set("postal_code", params.postal_code);
  if (params.country) qs.set("country", params.country);
  if (params.radius_km != null) qs.set("radius_km", String(params.radius_km));

  const res = await fetch(
    `/api/halls/${encodeURIComponent(hallId)}/grocery/stores/nearby?${qs.toString()}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Failed to find nearby stores");
  return res.json();
}

export async function saveGroceryPreferences(
  hallId: string,
  input: SaveGroceryPreferencesInput,
): Promise<{ preferences: HallGroceryPreferences; deals: ProteinDealsResponse }> {
  const res = await fetchWithCsrf(`/api/halls/${encodeURIComponent(hallId)}/grocery/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Failed to save preferences");
  }
  return res.json();
}

export async function trackGrocerySetupEvent(
  eventType:
    | "grocery_setup_started"
    | "postal_code_saved"
    | "nearby_stores_loaded"
    | "preferred_store_added",
  metadata?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    await apiRequest("POST", "/api/analytics/events", {
      events: [{ event_type: eventType, metadata }],
    });
  } catch {
    /* non-fatal */
  }
}
