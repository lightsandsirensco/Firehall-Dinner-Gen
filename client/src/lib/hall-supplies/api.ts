import { apiRequest } from "@/lib/queryClient";
import type { HallSupplyCategory, HallSuppliesPayload, HallSupplyStatus } from "@shared/hall-supplies/types";

export async function fetchHallSupplies(hallId: string): Promise<HallSuppliesPayload> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}/supplies`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load hall supplies");
  return res.json();
}

export async function updateHallSupplyStatus(
  hallId: string,
  supplyId: string,
  status: HallSupplyStatus,
): Promise<HallSuppliesPayload> {
  const res = await apiRequest(
    "PATCH",
    `/api/halls/${encodeURIComponent(hallId)}/supplies/${encodeURIComponent(supplyId)}`,
    { status },
  );
  return res.json();
}

export async function addHallSupplyItem(
  hallId: string,
  item: { name: string; category: HallSupplyCategory },
): Promise<HallSuppliesPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/supplies`, item);
  return res.json();
}
