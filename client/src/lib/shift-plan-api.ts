import { apiRequest } from "@/lib/queryClient";
import { getRecentMealSlugs } from "@/lib/meal-rotation-memory";
import { buildGenerateRequestInput } from "@shared/generate-request-defaults";
import {
  simplifiedFiltersToGenerateRequest,
  type SimplifiedGeneratorFilters,
} from "@shared/generator-simplified";
import type { ShiftPlanSlotPatchInput } from "@shared/shift-plan/schema";
import type {
  RunItBackResponse,
  ShiftPlanFillMode,
  ShiftPlanFillResponse,
  ShiftPlanSlotResponse,
  ShiftPlanView,
  UpcomingShiftsView,
} from "@shared/shift-plan/types";

/** The current/next shift's plan. Plan Ahead shifts use planQueryKeyFor(key) — invalidating this prefix covers both. */
export const shiftPlanQueryKey = ["/api/shift-plan"] as const;
export const upcomingShiftPlansQueryKey = ["/api/shift-plan/upcoming"] as const;

export function planQueryKeyFor(shiftKey: string | null) {
  return shiftKey ? ([...shiftPlanQueryKey, { shiftKey }] as const) : shiftPlanQueryKey;
}

const RECENT_SLUG_LIMIT = 30;

export async function fetchShiftPlan(shiftKey?: string | null): Promise<ShiftPlanView> {
  const query = shiftKey ? `?shiftKey=${encodeURIComponent(shiftKey)}` : "";
  const res = await apiRequest("GET", `/api/shift-plan${query}`);
  return res.json();
}

/** The server refused a shift beyond the free current/next shift (no Pro `plan_ahead`). */
export function isPlanAheadRequired(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("403") && err.message.includes("plan_ahead_required");
}

export async function fetchUpcomingShiftPlans(): Promise<UpcomingShiftsView> {
  const res = await apiRequest("GET", "/api/shift-plan/upcoming");
  return res.json();
}

export async function patchShiftPlanSlot(input: ShiftPlanSlotPatchInput): Promise<ShiftPlanSlotResponse> {
  const res = await apiRequest("PATCH", "/api/shift-plan/slot", input);
  return res.json();
}

/**
 * The user's personalized generator request (allergens, diets, foods to
 * avoid, appliances, healthiness, nutrition goal) — the same one Pick
 * Tonight sends. The server sets per-slot crew size, time budget and format.
 */
export function shiftPlanBaseRequest(filters: SimplifiedGeneratorFilters) {
  return buildGenerateRequestInput(simplifiedFiltersToGenerateRequest(filters));
}

export function isRunItBackRequired(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("403") && err.message.includes("run_it_back_required");
}

export async function runItBackShiftPlan(input: {
  shiftKey: string;
  sourceShiftKey: string;
  mode: "copy" | "refresh";
  filters: SimplifiedGeneratorFilters;
}): Promise<RunItBackResponse> {
  const res = await apiRequest(
    "POST",
    "/api/shift-plan/run-it-back",
    {
      shiftKey: input.shiftKey,
      sourceShiftKey: input.sourceShiftKey,
      mode: input.mode,
      base: shiftPlanBaseRequest(input.filters),
      recentSlugs: getRecentMealSlugs().slice(-RECENT_SLUG_LIMIT),
    },
    60_000,
  );
  return res.json();
}

export async function fillShiftPlan(input: {
  shiftKey: string;
  mode: ShiftPlanFillMode;
  slotKeys?: string[];
  filters: SimplifiedGeneratorFilters;
  excludeSlugs?: string[];
}): Promise<ShiftPlanFillResponse> {
  const res = await apiRequest(
    "POST",
    "/api/shift-plan/fill",
    {
      shiftKey: input.shiftKey,
      mode: input.mode,
      slotKeys: input.slotKeys,
      base: shiftPlanBaseRequest(input.filters),
      recentSlugs: getRecentMealSlugs().slice(-RECENT_SLUG_LIMIT),
      excludeSlugs: input.excludeSlugs?.slice(-40),
    },
    60_000,
  );
  return res.json();
}
