import { apiRequest } from "@/lib/queryClient";
import type { HallNotesPayload } from "@shared/hall-notes/types";

export async function fetchHallNotes(hallId: string): Promise<HallNotesPayload> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}/notes`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load hall notes");
  return res.json();
}

export async function createHallNote(hallId: string, message: string): Promise<HallNotesPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/notes`, { message });
  return res.json();
}

export async function updateHallNote(
  hallId: string,
  noteId: string,
  message: string,
): Promise<HallNotesPayload> {
  const res = await apiRequest(
    "PATCH",
    `/api/halls/${encodeURIComponent(hallId)}/notes/${encodeURIComponent(noteId)}`,
    { message },
  );
  return res.json();
}

export async function deleteHallNote(hallId: string, noteId: string): Promise<HallNotesPayload> {
  const res = await apiRequest(
    "DELETE",
    `/api/halls/${encodeURIComponent(hallId)}/notes/${encodeURIComponent(noteId)}`,
  );
  return res.json();
}
