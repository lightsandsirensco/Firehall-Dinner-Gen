import { useEffect } from "react";
import { Link } from "wouter";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BillingFeature } from "@shared/billing/types";
import {
  isHallProFeature,
  requiredPlanForFeature,
  resolveBillingFeature,
} from "@shared/billing/types";
import { HALL_PRO_FEATURE_LABELS } from "@shared/billing/hall-pro";
import { useBilling, useHallFeature, useRecordPaywallView } from "@/lib/billing/hooks";
import { useAuth } from "@/lib/auth/context";
import { useHallMembership } from "@/lib/hall-membership/context";
import { cn } from "@/lib/utils";

const PLAN_LABELS = {
  guest: "Free",
  personal: "Firefighter Plus",
  hall_pro: "Hall Pro",
} as const;

interface PaywallGateProps {
  feature: BillingFeature;
  hallId?: string | null;
  surface?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function PaywallGate({
  feature,
  hallId,
  surface,
  children,
  className,
  compact,
}: PaywallGateProps) {
  const { activeHallId } = useHallMembership();
  const targetHallId = hallId ?? activeHallId;
  const allowed = useHallFeature(feature, targetHallId);
  const billing = useBilling();
  const { authenticated, openSignIn } = useAuth();
  const recordPaywall = useRecordPaywallView();

  useEffect(() => {
    if (!allowed) {
      void recordPaywall(feature, surface);
    }
  }, [allowed, feature, surface, recordPaywall]);

  if (allowed) {
    return <>{children}</>;
  }

  const resolved = resolveBillingFeature(feature);
  const required = requiredPlanForFeature(feature);
  const current = billing.effective_plan_id;
  const hallScoped = isHallProFeature(resolved);
  const headline =
    hallScoped && resolved in HALL_PRO_FEATURE_LABELS
      ? HALL_PRO_FEATURE_LABELS[resolved as keyof typeof HALL_PRO_FEATURE_LABELS]
      : (PLAN_LABELS[required] ?? "Upgrade");

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 sm:p-6 text-center",
        className,
      )}
      data-testid={`paywall-${feature}`}
    >
      <Lock className="w-8 h-8 mx-auto text-muted-foreground mb-3" aria-hidden />
      <p className="font-medium text-sm sm:text-base">{headline}</p>

      <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        {hallScoped
          ? compact
            ? "Hall Pro unlocks crew collaboration — ask your captain."
            : "Hall Pro benefits the whole crew: shared list, meal history, staples, advanced vote, and grocery planning. Billed per hall."
          : compact
            ? `Upgrade from ${PLAN_LABELS[current]} to unlock this.`
            : `You're on ${PLAN_LABELS[current]}. Firefighter Plus unlocks personal tools.`}
      </p>

      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {!authenticated ? (
          <Button type="button" size="sm" onClick={openSignIn}>
            Sign in
          </Button>
        ) : hallScoped && targetHallId ? (
          <Button asChild size="sm">
            <Link href={`/halls/${targetHallId}`}>Manage linked hall</Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link href="/plans">View plans</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
