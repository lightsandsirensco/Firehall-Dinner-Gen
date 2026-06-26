import { fetchWithCsrf } from "@/lib/csrf-fetch";
import { apiRequest } from "@/lib/queryClient";
import type {
  ProteinDealMatchedRecipe,
  ProteinDealRow,
  ProteinDealsResponse,
} from "@shared/protein-deals/types";

export async function fetchHallProteinDeals(hallId: string): Promise<ProteinDealsResponse> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}/protein-deals`, {
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Failed to load protein deals");
  }
  return res.json();
}

export async function refreshHallProteinDeals(hallId: string): Promise<ProteinDealsResponse> {
  const res = await fetchWithCsrf(`/api/halls/${encodeURIComponent(hallId)}/protein-deals/refresh`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Refresh failed");
  }
  const body = await res.json();
  return body.deals as ProteinDealsResponse;
}

export async function fetchProteinDealRecipes(
  hallId: string,
  dealId: string,
): Promise<{ deal: ProteinDealRow; recipes: ProteinDealMatchedRecipe[] }> {
  const res = await fetch(
    `/api/halls/${encodeURIComponent(hallId)}/protein-deals/${encodeURIComponent(dealId)}/recipes`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Failed to load recipe matches");
  return res.json();
}

export async function addProteinDealToShoppingList(hallId: string, dealId: string): Promise<void> {
  const res = await fetchWithCsrf(
    `/api/halls/${encodeURIComponent(hallId)}/protein-deals/${encodeURIComponent(dealId)}/shopping-list`,
    { method: "POST" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Failed to add to shopping list");
  }
}

export async function trackProteinDealClicked(hallId: string, dealId: string): Promise<void> {
  try {
    await apiRequest("POST", "/api/analytics/events", {
      events: [{ event_type: "protein_deal_clicked", metadata: { hall_id: hallId, deal_id: dealId } }],
    });
  } catch {
    /* non-fatal */
  }
}

/** @deprecated */
export const fetchHallDeals = fetchHallProteinDeals;
export const refreshHallDeals = refreshHallProteinDeals;
export const fetchDealRecipes = fetchProteinDealRecipes;
export const addDealToShoppingList = addProteinDealToShoppingList;
export const trackDealClicked = trackProteinDealClicked;
