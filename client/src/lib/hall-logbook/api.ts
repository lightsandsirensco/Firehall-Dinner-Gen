import { apiRequest } from "@/lib/queryClient";
import type { HallLogbookPayload } from "@shared/hall-logbook/types";

export async function fetchHallLogbook(hallId: string): Promise<HallLogbookPayload> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}/logbook`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load logbook");
  return res.json();
}

export async function markHallLogbookRead(hallId: string): Promise<HallLogbookPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/logbook/read`);
  return res.json();
}

export async function createHallLogbookEntry(
  hallId: string,
  input: { title: string; body?: string | null; category?: string },
): Promise<HallLogbookPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/logbook`, input);
  return res.json();
}
