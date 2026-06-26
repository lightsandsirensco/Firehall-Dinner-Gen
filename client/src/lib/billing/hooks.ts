import { useCallback } from "react";

import type { BillingFeature, PlanId, UserBillingState } from "@shared/billing/types";

import { hasFeature, isHallProFeature, resolveBillingFeature } from "@shared/billing/types";

import { useAuth } from "@/lib/auth/context";

import { useHallMembership } from "@/lib/hall-membership/context";

import { apiRequest } from "@/lib/queryClient";

import {

  trackHallProConverted,

  trackHallProEnabled,

  trackHallProTrialStarted,

  trackPaywallViewed,

  trackPlanSelected,

} from "@/lib/analytics";

import { GUEST_BILLING } from "./constants";



export function useBilling(): UserBillingState {

  const { billing } = useAuth();

  return billing ?? GUEST_BILLING;

}



export function useFeature(feature: BillingFeature): boolean {

  const billing = useBilling();

  const { activeHallId } = useHallMembership();

  return useHallFeatureInternal(billing, feature, activeHallId);

}



export function useHallFeature(feature: BillingFeature, hallId?: string | null): boolean {

  const billing = useBilling();

  const { activeHallId } = useHallMembership();

  return useHallFeatureInternal(billing, feature, hallId ?? activeHallId);

}



function useHallFeatureInternal(

  billing: UserBillingState,

  feature: BillingFeature,

  hallId: string | null | undefined,

): boolean {

  if (isHallProFeature(resolveBillingFeature(feature))) {

    if (!hallId) return false;

    return billing.hall_pro_hall_ids.includes(hallId);

  }

  return hasFeature(billing.features, feature);

}



export function usePlanId(): PlanId {

  return useBilling().effective_plan_id;

}



export function useHallHasPro(hallId?: string | null): boolean {

  const billing = useBilling();

  const { activeHallId } = useHallMembership();

  const target = hallId ?? activeHallId;

  if (!target) return false;

  return billing.hall_pro_hall_ids.includes(target);

}



export function useSelectPlan() {

  const { refresh, openSignIn, authenticated } = useAuth();



  return useCallback(

    async (planId: PlanId) => {

      if (planId === "guest") return { ok: false as const, reason: "guest" };

      if (planId === "hall_pro") {

        return { ok: false as const, reason: "hall_scoped" };

      }

      if (!authenticated) {

        openSignIn();

        return { ok: false as const, reason: "sign_in_required" };

      }



      const res = await apiRequest("POST", "/api/billing/select-plan", { plan_id: planId });

      const body = await res.json();

      trackPlanSelected(planId);

      await refresh();

      return { ok: true as const, body };

    },

    [authenticated, openSignIn, refresh],

  );

}



export function useHallBillingAction(hallId: string) {

  const { refresh } = useAuth();



  return useCallback(

    async (action: "start_trial" | "enable" | "convert") => {

      const res = await apiRequest("POST", `/api/halls/${hallId}/billing`, { action });

      const body = await res.json();

      if (action === "start_trial") trackHallProTrialStarted(hallId);

      if (action === "enable") trackHallProEnabled(hallId);

      if (action === "convert") trackHallProConverted(hallId);

      await refresh();

      return body as {

        ok: boolean;

        subscription?: { status: string };

        message?: string;

      };

    },

    [hallId, refresh],

  );

}



export function useRecordPaywallView() {

  return useCallback(async (feature?: BillingFeature, surface?: string) => {

    trackPaywallViewed(feature, surface);

    try {

      await apiRequest("POST", "/api/billing/paywall-viewed", { feature, surface });

    } catch {

      /* best-effort */

    }

  }, []);

}

