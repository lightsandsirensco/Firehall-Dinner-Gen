import { apiRequest } from "@/lib/queryClient";

import type {

  HallCanteenCategory,

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

): Promise<HallCanteenPayload> {

  const res = await apiRequest(

    "PATCH",

    `/api/halls/${encodeURIComponent(hallId)}/canteen/${encodeURIComponent(itemId)}`,

    { status },

  );

  return res.json();

}



export async function reportCanteenItem(

  hallId: string,

  body: {

    item_id?: string;

    name?: string;

    category?: HallCanteenCategory;

    status: HallCanteenStatus;

  },

): Promise<HallCanteenPayload> {

  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/canteen/report`, body);

  return res.json();

}



export async function addCanteenItem(

  hallId: string,

  body: { name: string; category?: HallCanteenCategory },

): Promise<HallCanteenPayload> {

  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/canteen/items`, body);

  return res.json();

}



export async function manageCanteenItem(
  hallId: string,
  itemId: string,
  body: {
    status?: HallCanteenStatus;
    archived?: boolean;
    name?: string;
    category?: HallCanteenCategory;
    sort_order?: number;
  },
): Promise<HallCanteenPayload> {
  if (body.status && !body.archived && !body.name && body.category == null && body.sort_order == null) {
    return setCanteenItemStatus(hallId, itemId, body.status);
  }
  const res = await apiRequest(
    "PATCH",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/${encodeURIComponent(itemId)}`,
    body,
  );
  return res.json();
}

export async function claimCanteenPickup(
  hallId: string,
  itemId: string,
): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/${encodeURIComponent(itemId)}/pickup`,
    {},
  );
  return res.json();
}

export async function assignCanteenManager(
  hallId: string,
  userId: string,
): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/manager`,
    { user_id: userId },
  );
  return res.json();
}

export async function releaseCanteenPickup(
  hallId: string,
  itemId: string,
): Promise<HallCanteenPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/canteen/${encodeURIComponent(itemId)}/pickup/release`,
    {},
  );
  return res.json();
}


