import { apiRequest } from "@/lib/queryClient";
import type { HallBoardPayload, BoardTonightStatus, BoardNoteIntent } from "@shared/hall-board/types";

export async function fetchHallBoard(hallId: string): Promise<HallBoardPayload> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}/board`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load board");
  return res.json();
}

export async function updateHallBoardTonight(
  hallId: string,
  patch: {
    dinner_title?: string | null;
    dinner_slug?: string | null;
    status?: BoardTonightStatus;
    hold_note?: string | null;
  },
): Promise<HallBoardPayload> {
  const res = await apiRequest("PATCH", `/api/halls/${encodeURIComponent(hallId)}/board/tonight`, patch);
  return res.json();
}

export async function createHallBoardNote(
  hallId: string,
  input: {
    intent: BoardNoteIntent;
    title: string;
    body?: string | null;
    pinned?: boolean;
    event_at?: string | null;
    expires_at?: string | null;
  },
): Promise<HallBoardPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/board/notes`, input);
  return res.json();
}

export async function fixHallBoardNote(hallId: string, noteId: string): Promise<HallBoardPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/board/notes/${encodeURIComponent(noteId)}/fix`,
  );
  return res.json();
}
