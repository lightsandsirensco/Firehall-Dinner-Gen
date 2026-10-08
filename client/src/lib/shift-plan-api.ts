import { apiRequest } from "@/lib/queryClient";
import { getRecentMealSlugs } from "@/lib/meal-rotation-memory";
import { buildGenerateRequestInput } from "@shared/generate-request-defaults";
import {
  simplifiedFiltersToGenerateRequest,
  type SimplifiedGeneratorFilters,
} from "@shared/generator-simplified";
import type { ShiftPlanSlotPatchInput } from "@shared/shift-plan/schema";
import type {
  ShiftPlanFillMode,
  ShiftPlanFillResponse,
  ShiftPlanSlotResponse,
  ShiftPlanView,
} from "@shared/shift-plan/types";

export const shiftPlanQueryKey = ["/api/shift-plan"] as const;

const RECENT_SLUG_LIMIT = 30;

export async function fetchShiftPlan(): Promise<ShiftPlanView> {
  const res = await apiRequest("GET", "/api/shift-plan");
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
