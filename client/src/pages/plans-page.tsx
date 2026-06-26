import { useEffect, useState } from "react";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { PlanCard } from "@/components/billing/plan-card";
import { useAuth } from "@/lib/auth/context";
import { useBilling, useSelectPlan } from "@/lib/billing/hooks";
import { trackPlanViewed } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { PLAN_CUSTOMER_LABELS, PLANS_PAGE } from "@/lib/plans-display";
import type { PlanCatalogEntry, PlanId } from "@shared/billing/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlansPage() {
  const { authenticated } = useAuth();
  const billing = useBilling();
  const selectPlan = useSelectPlan();
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanCatalogEntry[]>(billing.catalog);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selecting, setSelecting] = useState<PlanId | null>(null);

  useEffect(() => {
    trackPlanViewed();
    void fetch("/api/billing/plans", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.plans) setPlans(data.plans);
      })
      .catch(() => undefined)
      .finally(() => setPlansLoading(false));
  }, []);

  const handleSelect = async (planId: PlanId) => {
    if (planId === "hall_pro") return;
    setSelecting(planId);
    try {
      const result = await selectPlan(planId);
      if (!result.ok) {
        if (result.reason === "sign_in_required") return;
        toast({ title: "Could not start trial", variant: "destructive" });
        return;
      }
      toast({
        title: "Your free trial has started",
        description: "Firefighter Plus is now active on your account.",
      });
    } finally {
      setSelecting(null);
    }
  };

  const visiblePlans = plans.length > 0 ? plans : billing.catalog;
  const currentPlanLabel = PLAN_CUSTOMER_LABELS[billing.effective_plan_id];

  return (
    <MeSubpageShell
      title={PLANS_PAGE.title}
      subtitle={PLANS_PAGE.subtitle}
      testId="plans-page"
      centeredHeader
    >
      <div className="mx-auto max-w-6xl space-y-10 pt-2">
        {authenticated ? (
          <p className="text-center text-sm text-muted-foreground">
            Your account:{" "}
            <span className="font-medium text-foreground">{currentPlanLabel}</span>
          </p>
        ) : null}

        <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {plansLoading && visiblePlans.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="min-h-[36rem] rounded-2xl" />
              ))
            : visiblePlans.map((plan) => (
                <PlanCard
                  key={plan.plan_id}
                  plan={plan}
                  currentPlanId={billing.effective_plan_id}
                  onSelect={(id) => void handleSelect(id)}
                  selecting={selecting}
                />
              ))}
        </div>
      </div>
    </MeSubpageShell>
  );
}
