import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import {
  useBilling,
  useFeature,
  useRecordPaywallView,
  useStartProCheckout,
  useStartProTrial,
} from "@/lib/billing/hooks";
import {
  trackPremiumFeatureClicked,
  trackPremiumPaywallViewed,
  trackPremiumTrialUpgradeClicked,
  trackProPlanSelected,
  trackProUpgradeInterest,
} from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import {
  FOUNDING_OFFER_DISPLAY,
  PLAN_PRESENTATIONS,
  proPriceSummary,
  resolveBillingOption,
  type PlanBillingPeriod,
} from "@/lib/plans-display";
import {
  CORE_PRO_TRIGGERS,
  PRO_EARLY_ACCESS_CTA,
  PRO_PAYWALL_COPY,
  PRO_SUBSCRIBE_CTA,
  PRO_TRIAL_CTA,
  type ProPaywallTrigger,
} from "@/lib/pro-paywall-copy";
import { PRO_TRIAL_DAYS } from "@shared/billing/types";
import { cn } from "@/lib/utils";

const SHEET_CLASS = "max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg";

interface PaywallRequest {
  trigger: ProPaywallTrigger;
  /** Where the lock was tapped — sent as `paywall_source` and to the server paywall-view counter. */
  source: string;
}

interface ProPaywallContextValue {
  openProPaywall: (trigger: ProPaywallTrigger, source: string) => void;
}

const ProPaywallContext = createContext<ProPaywallContextValue | null>(null);

/** Opens the one personal Pro paywall. Must be rendered under <ProPaywallProvider>. */
export function useProPaywall(): ProPaywallContextValue {
  const ctx = useContext(ProPaywallContext);
  if (!ctx) throw new Error("useProPaywall must be used inside <ProPaywallProvider>");
  return ctx;
}

export function ProPaywallProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  const [request, setRequest] = useState<PaywallRequest | null>(null);

  const openProPaywall = useCallback(
    (trigger: ProPaywallTrigger, source: string) => {
      trackPremiumFeatureClicked({
        feature: PRO_PAYWALL_COPY[trigger].feature,
        trigger,
        paywall_source: source,
        logged_in: authenticated,
      });
      setRequest({ trigger, source });
    },
    [authenticated],
  );

  const value = useMemo(() => ({ openProPaywall }), [openProPaywall]);

  return (
    <ProPaywallContext.Provider value={value}>
      {children}
      <ProPaywallSheet request={request} onClose={() => setRequest(null)} />
    </ProPaywallContext.Provider>
  );
}

function useBillingConfig() {
  return useQuery({
    queryKey: ["/api/billing/config"],
    queryFn: async () => {
      const res = await fetch("/api/billing/config", { credentials: "include" });
      if (!res.ok) throw new Error("billing config unavailable");
      return (await res.json()) as {
        monetization_enabled: boolean;
        payments_enabled: boolean;
        founding_offer_enabled: boolean;
      };
    },
    staleTime: 5 * 60_000,
  });
}

function ProPaywallSheet({ request, onClose }: { request: PaywallRequest | null; onClose: () => void }) {
  const open = request != null;
  // Keep the last request while the close animation runs so copy doesn't blank out.
  const lastRequest = useRef<PaywallRequest | null>(null);
  if (request) lastRequest.current = request;
  const shown = request ?? lastRequest.current;

  const { authenticated, openSignIn } = useAuth();
  const { toast } = useToast();
  const recordPaywall = useRecordPaywallView();
  const startCheckout = useStartProCheckout();
  const config = useBillingConfig();
  const paymentsEnabled = Boolean(config.data?.monetization_enabled && config.data?.payments_enabled);
  const [period, setPeriod] = useState<PlanBillingPeriod>("annual");
  const [starting, setStarting] = useState(false);

  const startTrial = useStartProTrial();
  const billing = useBilling();
  const trial = billing.pro_trial;
  const mode: "sign_in" | "trial" | "subscribe" | "early_access" = !authenticated
    ? "sign_in"
    : billing.pro_trial_eligible
      ? "trial"
      : paymentsEnabled
        ? "subscribe"
        : "early_access";

  const copy = shown ? PRO_PAYWALL_COPY[shown.trigger] : null;
  const alreadyUnlocked = useFeature(copy?.feature ?? "plan_ahead");

  useEffect(() => {
    if (!request) return;
    const { trigger, source } = request;
    const feature = PRO_PAYWALL_COPY[trigger].feature;
    trackPremiumPaywallViewed({ feature, trigger, paywall_source: source, logged_in: authenticated });
    void recordPaywall(feature, source);
    // One view per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  // Entitlement can land while the sheet is open (e.g. after sign-in) — never
  // keep selling something the user already has.
  useEffect(() => {
    if (open && alreadyUnlocked) onClose();
  }, [open, alreadyUnlocked, onClose]);

  if (!shown || !copy) return null;

  const founding = billing.founding_offer_eligible;
  const billingOptions = (PLAN_PRESENTATIONS.firefighter_plus.billingOptions ?? []).map((o) =>
    resolveBillingOption(o, founding),
  );
  const activeOption = billingOptions.find((o) => o.id === period) ?? billingOptions[0];
  const foundingActive = founding && activeOption?.id === "annual";
  const alsoInPro = CORE_PRO_TRIGGERS.filter((t) => t !== shown.trigger).map((t) => PRO_PAYWALL_COPY[t].shortLabel);
  const comparePlansHref = `/me/subscription?feature=${encodeURIComponent(copy.feature)}`;

  const handlePrimary = async () => {
    if (mode === "sign_in") {
      onClose();
      openSignIn();
      return;
    }
    if (mode === "trial") {
      setStarting(true);
      try {
        const result = await startTrial(shown.source);
        if (result.ok) {
          toast({
            title: `Your ${PRO_TRIAL_DAYS}-day Pro trial has started`,
            description: "Plan Ahead, Run It Back, Nutrition Goals and your full meal history are unlocked. No card needed.",
          });
          onClose();
        } else if (result.reason === "trial_used" || result.reason === "already_pro") {
          toast({
            title: result.reason === "already_pro" ? "You already have Pro" : "Your Pro trial was already used",
            description: result.reason === "already_pro" ? undefined : "Each account gets one free trial.",
          });
        } else if (result.reason !== "sign_in_required") {
          toast({ title: "Could not start your trial", description: "Please try again in a moment.", variant: "destructive" });
        }
      } finally {
        setStarting(false);
      }
      return;
    }
    if (trial) {
      trackPremiumTrialUpgradeClicked({ surface: "paywall", trial_status: trial.status, days_left: trial.days_left });
    }
    if (mode === "early_access") {
      trackProUpgradeInterest({
        plan: "annual",
        page: shown.source,
        logged_in: true,
        feature: copy.feature,
      });
      toast({
        title: "You're on the Pro early-access list",
        description: "We'll let you know as soon as Pro subscriptions open.",
      });
      onClose();
      return;
    }
    trackProPlanSelected({ plan: period, page: shown.source, logged_in: true, feature: copy.feature });
    setStarting(true);
    try {
      const result = await startCheckout(period, copy.feature);
      if (!result.ok && result.reason !== "sign_in_required") {
        toast({ title: "Could not start checkout", description: "Please try again in a moment.", variant: "destructive" });
      }
      // On success the browser is already navigating to Stripe Checkout.
    } finally {
      setStarting(false);
    }
  };

  const primaryLabel =
    mode === "sign_in"
      ? "Sign in to continue"
      : mode === "trial"
        ? PRO_TRIAL_CTA
        : mode === "subscribe"
          ? PRO_SUBSCRIBE_CTA
          : PRO_EARLY_ACCESS_CTA;

  const termsLine =
    mode === "sign_in"
      ? `Sign in to start your free ${PRO_TRIAL_DAYS}-day Pro trial — no card needed.`
      : mode === "trial"
        ? `Free for ${PRO_TRIAL_DAYS} days, no card needed. When it ends you go back to Free automatically — nothing is charged and nothing is deleted. Keeping Pro afterwards is ${proPriceSummary(founding)}.`
        : mode === "subscribe"
          ? foundingActive
            ? `${FOUNDING_OFFER_DISPLAY.renewalNote} Billed today, renews automatically — cancel anytime.`
            : `${activeOption?.price ?? ""}${activeOption?.period ?? ""}, billed today. Renews automatically — cancel anytime.`
          : `Pro subscriptions aren't open yet. Join early access and we'll let you know — nothing is charged. Pro will be ${proPriceSummary(founding)}.`;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="bottom" className={SHEET_CLASS} data-testid={`pro-paywall-${shown.trigger}`}>
        <SheetHeader className="text-left">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Firehall Meals Pro
          </span>
          <SheetTitle className="text-xl sm:text-2xl" data-testid="pro-paywall-headline">
            {copy.headline}
          </SheetTitle>
          <SheetDescription className="text-sm sm:text-base" data-testid="pro-paywall-body">
            {copy.body}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Also in Pro</p>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {alsoInPro.map((label) => (
              <li key={label} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {mode === "subscribe" ? (
          <div className="mt-4" role="radiogroup" aria-label="Billing period">
            <div className="grid grid-cols-2 gap-2">
              {billingOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={option.id === period}
                  onClick={() => setPeriod(option.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    option.id === period ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                  )}
                  data-testid={`pro-paywall-period-${option.id}`}
                >
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-muted-foreground">
                    {option.price}
                    {option.period}
                    {option.savingsLabel ? ` · ${option.savingsLabel}` : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-3 text-xs text-muted-foreground" data-testid="pro-paywall-terms">
          {termsLine}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={starting}
            onClick={() => void handlePrimary()}
            data-testid="pro-paywall-primary"
          >
            {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {primaryLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={onClose}
            data-testid="pro-paywall-secondary"
          >
            {copy.secondary}
          </Button>
          <Link
            href={comparePlansHref}
            onClick={onClose}
            className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            data-testid="pro-paywall-compare"
          >
            Compare Free and Pro
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
