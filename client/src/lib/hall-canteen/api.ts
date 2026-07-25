import { apiRequest } from "@/lib/queryClient";
import type {
  HallCanteenCategory,
  HallCanteenMemberStatus,
  HallCanteenPayload,
  HallCanteenStatus,
} from "@shared/hall-canteen/types";

export async function fetchHallCanteen(hallId: string): Promise<HallCanteenPayload> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}/canteen`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load hall canteen");
  return res.json();
}

export async function setCanteenItemStatus(
  hallId: string,
  itemId: string,
  status: HallCanteenStatus,
  note?: string,
): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "PATCH",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/${encodeURIComponent(itemId)}`,
    note ? { status, note } : { status },
  );
  return res.json();
}

export async function reportCanteenItem(
  hallId: string,
  body: {
    item_id?: string;
    name?: string;
    category?: HallCanteenCategory;
    status: HallCanteenMemberStatus;
    note?: string;
  },
): Promise<HallCanteenPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/canteen/report`, body);
  return res.json();
}

export async function addCanteenItem(
  hallId: string,
  body: {
    name: string;
    category?: HallCanteenCategory;
    preferred_brand?: string;
    package_size?: string;
    reorder_qty?: number;
    costco_search_term?: string;
    product_url?: string;
  },
): Promise<HallCanteenPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/canteen/items`, body);
  return res.json();
}

export async function manageCanteenItem(
  hallId: string,
  itemId: string,
  body: Record<string, unknown>,
): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "PATCH",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/${encodeURIComponent(itemId)}`,
    body,
  );
  return res.json();
}

export async function claimCanteenPickup(hallId: string, itemId: string): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/${encodeURIComponent(itemId)}/pickup`,
    {},
  );
  return res.json();
}

export async function releaseCanteenPickup(hallId: string, itemId: string): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/${encodeURIComponent(itemId)}/pickup/release`,
    {},
  );
  return res.json();
}

export async function assignCanteenManager(hallId: string, userId: string): Promise<HallCanteenPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/canteen/manager`, {
    user_id: userId,
  });
  return res.json();
}

export async function suggestCanteenStaple(
  hallId: string,
  body: { name: string; category?: HallCanteenCategory; note?: string },
): Promise<HallCanteenPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/canteen/suggest`, body);
  return res.json();
}

export async function reviewCanteenSuggestion(
  hallId: string,
  suggestionId: string,
  action: "approve" | "reject",
  category?: HallCanteenCategory,
): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/suggestions/${encodeURIComponent(suggestionId)}/review`,
    { action, category },
  );
  return res.json();
}

export async function addToWeeklyOrder(
  hallId: string,
  body: { item_id: string; requested_qty?: number; notes?: string },
): Promise<HallCanteenPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/canteen/order/items`, body);
  return res.json();
}

export async function updateWeeklyOrderItem(
  hallId: string,
  orderItemId: string,
  body: Record<string, unknown>,
): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "PATCH",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/order/items/${encodeURIComponent(orderItemId)}`,
    body,
  );
  return res.json();
}

export async function claimWeeklyOrderItem(hallId: string, orderItemId: string): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/order/items/${encodeURIComponent(orderItemId)}/claim`,
    {},
  );
  return res.json();
}

export async function releaseWeeklyOrderItem(hallId: string, orderItemId: string): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/order/items/${encodeURIComponent(orderItemId)}/release`,
    {},
  );
  return res.json();
}

export async function fetchCostcoHandoff(
  hallId: string,
): Promise<{ text: string; csv: string; costco_url: string }> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}/canteen/order/costco-handoff`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to build Costco handoff");
  return res.json();
}

export async function recordCanteenCheckout(
  hallId: string,
  body: Record<string, unknown>,
): Promise<HallCanteenPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/canteen/order/checkout`, body);
  return res.json();
}

export async function receiveWeeklyOrderItem(
  hallId: string,
  orderItemId: string,
  body: {
    receive_status: "received_full" | "partial" | "substituted" | "missing" | "damaged";
    received_qty?: number;
    substitute_name?: string;
  },
): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/order/items/${encodeURIComponent(orderItemId)}/receive`,
    body,
  );
  return res.json();
}

export async function completeCanteenDelivery(hallId: string): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/order/complete-delivery`,
    {},
  );
  return res.json();
}

export async function createCanteenManagerNote(
  hallId: string,
  body: string,
): Promise<HallCanteenPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/canteen/manager-notes`, {
    body,
  });
  return res.json();
}

export async function deleteCanteenManagerNote(
  hallId: string,
  noteId: string,
): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "DELETE",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/manager-notes/${encodeURIComponent(noteId)}`,
  );
  return res.json();
}

export async function seedTestCanteenData(hallId: string): Promise<HallCanteenPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/canteen/seed-test-data`, {});
  return res.json();
}
