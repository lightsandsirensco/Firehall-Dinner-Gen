import { apiRequest } from "@/lib/queryClient";
import type { PersonalSchedule, ScheduleOverride, ShiftInstance } from "@shared/schedule/types";
import type { ScheduleOverrideInput } from "@shared/schedule/schema";

export type SavedSchedule = PersonalSchedule & { updatedAt: string };

export const scheduleQueryKey = ["/api/schedule"] as const;
export const upcomingShiftsQueryKey = ["/api/schedule/shifts", "upcoming"] as const;

/** Look-ahead window for "next shifts" — long enough for any preset to show several. */
const UPCOMING_WINDOW_DAYS = 60;

export async function fetchSchedule(): Promise<{ schedule: SavedSchedule | null; overrides: ScheduleOverride[] }> {
  const res = await apiRequest("GET", "/api/schedule");
  return res.json();
}

export async function saveSchedule(schedule: PersonalSchedule): Promise<SavedSchedule> {
  const res = await apiRequest("PUT", "/api/schedule", schedule);
  return (await res.json()).schedule;
}

export async function fetchUpcomingShifts(now = new Date()): Promise<ShiftInstance[]> {
  const from = new Date(now.getTime() - 24 * 3_600_000);
  const to = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 24 * 3_600_000);
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), includeCancelled: "1" });
  const res = await apiRequest("GET", `/api/schedule/shifts?${params}`);
  return (await res.json()).shifts ?? [];
}

export async function createScheduleOverride(input: ScheduleOverrideInput): Promise<ScheduleOverride> {
  const res = await apiRequest("POST", "/api/schedule/overrides", input);
  return (await res.json()).override;
}

export async function deleteScheduleOverride(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/schedule/overrides/${encodeURIComponent(id)}`);
}

/** Server error text from apiRequest's "status: body" message. */
export function scheduleErrorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : "";
  const body = raw.replace(/^\d{3}:\s*/, "");
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed?.message === "string") return parsed.message;
  } catch {
    // not JSON
  }
  return fallback;
}
