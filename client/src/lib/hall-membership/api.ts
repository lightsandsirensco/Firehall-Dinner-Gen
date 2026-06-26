import type {
  HallDetailPayload,
  HallInviteMethod,
  HallInviteRecord,
  HallJoinPreview,
  HallSummary,
} from "@shared/hall-membership/types";

export async function fetchJoinPreview(params: {
  token?: string;
  code?: string;
  join_code?: string;
}): Promise<HallJoinPreview> {
  const qs = new URLSearchParams();
  if (params.token) qs.set("token", params.token);
  if (params.code) qs.set("code", params.code);
  if (params.join_code) qs.set("join_code", params.join_code);
  const res = await fetch(`/api/halls/join/preview?${qs}`, { credentials: "include" });
  if (!res.ok) throw new Error("Invite not found");
  return res.json();
}

export async function fetchHallDetail(hallId: string): Promise<HallDetailPayload> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}`, { credentials: "include" });
  if (!res.ok) throw new Error("Hall not found");
  return res.json();
}

export async function fetchMyHalls(): Promise<HallSummary[]> {
  const res = await fetch("/api/halls/mine", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load halls");
  const data = await res.json();
  return data.halls ?? [];
}

export async function fetchHallInvites(hallId: string): Promise<HallInviteRecord[]> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}/invites`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.invites ?? [];
}

export type { HallInviteMethod, HallInviteRecord, HallDetailPayload, HallSummary };
