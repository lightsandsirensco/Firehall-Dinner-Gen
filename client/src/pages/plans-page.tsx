import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { PlanCard } from "@/components/billing/plan-card";
import { useAuth } from "@/lib/auth/context";
import { useBilling, useSelectPlan, useStartProCheckout } from "@/lib/billing/hooks";
import {
  trackPlanViewed,
  trackProPaywallViewed,
  trackProPlanSelected,
  trackProUpgradeInterest,
} from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { PLAN_CUSTOMER_LABELS, PLANS_PAGE, type PlanBillingPeriod } from "@/lib/plans-display";
import type { PlanCatalogEntry, PlanId } from "@shared/billing/types";
import { Skeleton } from "@/components/ui/skeleton";

// Customer-facing comparison is TWO choices: Free vs Firehall Meals Pro.
// "guest" and "personal" render as the SAME "Free" card (see
// plans-display.ts) — which underlying catalog entry we show just depends
// on whether the visitor is signed in, since that's the only thing that
// differs between them (their CTA target). Personal never appears as a
// separate priced card next to Pro.
const PRO_PLAN_ID: PlanId = "firefighter_plus";

export default function PlansPage() {
  const { authenticated, refresh } = useAuth();
  const billing = useBilling();
  const selectPlan = useSelectPlan();
  const startCheckout = useStartProCheckout();
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanCatalogEntry[]>(billing.catalog);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selecting, setSelecting] = useState<PlanId | null>(null);
  // Real Stripe checkout stays dark (early-access CTA only) until an admin
  // flips billing_global_flags.payments_enabled — read from the server so
  // this page never hardcodes "payments are live."
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);

  // Source attribution — e.g. arriving from the Explore "High Protein" Pro chip
  // via /plans?feature=high_protein. Read once and carried through this page's
  // own Pro funnel events (pro_paywall_viewed, pro_plan_selected,
  // pro_upgrade_interest) so the funnel doesn't lose "what brought them here."
  const sourceFeatureRef = useRef<string | undefined>(undefined);
  if (sourceFeatureRef.current === undefined && typeof window !== "undefined") {
    const fromUrl = new URLSearchParams(window.location.search).get("feature");
    sourceFeatureRef.current = fromUrl?.trim() || "";
  }
  const sourceFeature = sourceFeatureRef.current || undefined;

  useEffect(() => {
    trackPlanViewed();
    // "Sees Pro offer" funnel step — fire once per visit for prospects only
    // (not for users already on firefighter_plus/hall_pro).
    if (billing.effective_plan_id !== "firefighter_plus" && billing.effective_plan_id !== "hall_pro") {
      trackProPaywallViewed({ feature: sourceFeature, page: "/plans", logged_in: authenticated });
    }
    void fetch("/api/billing/plans", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.plans) setPlans(data.plans);
        if (data.config) setPaymentsEnabled(Boolean(data.config.payments_enabled));
      })
      .catch(() => undefined)
      .finally(() => setPlansLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Returning from Stripe Checkout — success_url/cancel_url both point back
  // here with ?checkout=success|cancelled.
  //
  // IMPORTANT: `checkout=success` only means the *customer* finished Stripe
  // Checkout — our own entitlement is only real once the
  // `checkout.session.completed` webhook has landed and written
  // firefighter_plus into user_subscriptions (see server/billing/routes.ts).
  // Stripe usually delivers that webhook near-instantly, but there is no
  // guarantee it beats the browser's redirect back to this page, so this
  // polls actual server billing state for a few seconds rather than
  // trusting the success URL alone — never claim Pro is active until
  // confirmed. Reads /api/billing/me directly (not the possibly
  // one-render-stale `useAuth()`/`useBilling()` value) so each poll attempt
  // sees fresh data.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkoutResult = new URLSearchParams(window.location.search).get("checkout");
    if (checkoutResult === "success") {
      void confirmProAfterCheckout();
    } else if (checkoutResult === "cancelled") {
      toast({ title: "Checkout cancelled", description: "No charge was made." });
    }
    if (checkoutResult) {
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
    }

    async function confirmProAfterCheckout() {
      const maxAttempts = 5;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const res = await fetch("/api/billing/me", { credentials: "include" });
          const data = (await res.json()) as { effective_plan_id?: string };
          if (data.effective_plan_id === "firefighter_plus") {
            await refresh();
            toast({
              title: "You're on Firehall Meals Pro",
              description: "Welcome aboard — your advanced filters are unlocked.",
            });
            return;
          }
        } catch {
          /* keep polling — a transient fetch failure shouldn't end the attempt loop early */
        }
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
      // Webhook hasn't landed yet after ~5s — payment is real (Stripe already
      // redirected here), but we still refuse to claim Pro is active until
      // our own billing state confirms it.
      await refresh();
      toast({
        title: "Payment received",
        description: "Finishing setup on your Pro account — this can take a few seconds. Refresh if it doesn't unlock shortly.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBillingPeriodChange = (planId: PlanId, billingPeriod: PlanBillingPeriod) => {
    if (planId !== "firefighter_plus") return;
    trackProPlanSelected({
      plan: billingPeriod,
      page: "/plans",
      logged_in: authenticated,
      feature: sourceFeature,
    });
  };

  const handleSelect = async (planId: PlanId, billingPeriod?: PlanBillingPeriod) => {
    if (planId === "hall_pro") return;

    if (planId === "firefighter_plus") {
      if (!paymentsEnabled) {
        // Real Stripe checkout isn't live yet — "Join Pro Early Access" must
        // not grant the plan or charge anyone. Record upgrade interest only.
        trackProUpgradeInterest({
          plan: billingPeriod ?? "annual",
          page: "/plans",
          logged_in: authenticated,
          feature: sourceFeature,
        });
        toast({
          title: "You're on the early-access list",
          description:
            "You're on the Firehall Meals Pro early-access list. We'll let you know when Pro is available.",
        });
        return;
      }

      setSelecting(planId);
      try {
        const result = await startCheckout(billingPeriod ?? "annual", sourceFeature);
        if (!result.ok) {
          if (result.reason === "sign_in_required") return;
          toast({ title: "Could not start checkout", variant: "destructive" });
        }
        // On success the browser is already navigating to Stripe — nothing more to do.
      } finally {
        setSelecting(null);
      }
      return;
    }

    setSelecting(planId);
    try {
      const result = await selectPlan(planId);
      if (!result.ok) {
        if (result.reason === "sign_in_required") return;
        toast({ title: "Could not switch plans", variant: "destructive" });
        return;
      }
      toast({
        title: "You're set on the Free plan",
        description: result.body?.message ?? "No charge — free forever.",
      });
    } finally {
      setSelecting(null);
    }
  };

  const catalog = plans.length > 0 ? plans : billing.catalog;
  // Free card: show the "personal" catalog entry once signed in (their real,
  // already-default plan), otherwise "guest" — same presentation either way
  // (see PLAN_PRESENTATIONS), only the CTA target differs.
  const freePlanId: PlanId = authenticated ? "personal" : "guest";
  const visiblePlans = [freePlanId, PRO_PLAN_ID]
    .map((id) => catalog.find((p) => p.plan_id === id))
    .filter((p): p is PlanCatalogEntry => Boolean(p));
  const currentPlanLabel = PLAN_CUSTOMER_LABELS[billing.effective_plan_id];

  return (
    <MeSubpageShell
      title={PLANS_PAGE.title}
      subtitle={PLANS_PAGE.subtitle}
      testId="plans-page"
      centeredHeader
      wide
    >
      <div className="mx-auto max-w-[1000px] space-y-10 pt-4 sm:space-y-14 sm:pt-8">
        {authenticated ? (
          <p className="text-center text-sm text-muted-foreground">
            Current plan:{" "}
            <span className="font-medium text-foreground">{currentPlanLabel}</span>
          </p>
        ) : null}

        {/* Two generous, roughly-equal-width cards — stacked full-width
            below `md` (768px) rather than squeezing two narrow columns into
            a phone-width viewport, two columns from `md` up. */}
        <div className="grid items-stretch gap-6 md:grid-cols-2 md:gap-8">
          {plansLoading && visiblePlans.length === 0
            ? Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="min-h-[28rem] rounded-2xl" />
              ))
            : visiblePlans.map((plan) => (
                <PlanCard
                  key={plan.plan_id}
                  plan={plan}
                  currentPlanId={billing.effective_plan_id}
                  onSelect={(id, billingPeriod) => void handleSelect(id, billingPeriod)}
                  onBillingPeriodChange={handleBillingPeriodChange}
                  selecting={selecting}
                  paymentsEnabled={paymentsEnabled}
                />
              ))}
        </div>

        <p className="text-center text-xs text-muted-foreground/80 leading-relaxed max-w-lg mx-auto">
          Firehall Meals Pro renews automatically and bills immediately at checkout — no free trial.
          Cancel anytime from Account → Manage Billing; you keep Pro through the end of the period
          you already paid for. See our{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </MeSubpageShell>
  );
}
