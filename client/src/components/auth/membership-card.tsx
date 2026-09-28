import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useBilling, useOpenBillingPortal } from "@/lib/billing/hooks";
import { PLAN_DISPLAY } from "@shared/billing/types";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment issue",
  cancelled: "Cancelled",
};

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return null;
  }
}

export function MembershipCard() {
  const billing = useBilling();
  const openBillingPortal = useOpenBillingPortal();
  const [, navigate] = useLocation();
  const [openingPortal, setOpeningPortal] = useState(false);

  const isPro = billing.effective_plan_id === "firefighter_plus";
  const planLabel = PLAN_DISPLAY[billing.effective_plan_id]?.display_name ?? "Firehall Meals";
  const subscription = billing.subscription;
  const renewalDate = formatDate(subscription?.current_period_end ?? subscription?.expires_at ?? null);
  const statusLabel = subscription ? STATUS_LABELS[subscription.status] : null;

  return (
    <section className={cn(app.cardSurface, "p-5")}>
      <h2 className={cn(app.titleCard, "mb-3")}>Membership</h2>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{planLabel}</p>
          {isPro && subscription?.cancel_at_period_end && renewalDate ? (
            <p className="text-xs text-muted-foreground">Cancels {renewalDate}</p>
          ) : isPro && renewalDate ? (
            <p className="text-xs text-muted-foreground">Renews {renewalDate}</p>
          ) : statusLabel && statusLabel !== "Active" ? (
            <p className="text-xs text-muted-foreground">{statusLabel}</p>
          ) : null}
        </div>

        <div className="flex gap-2">
          {!isPro && (
            <Button type="button" size="sm" onClick={() => navigate("/plans")} data-testid="button-upgrade-pro">
              Upgrade to Pro
            </Button>
          )}
          {billing.manage_billing_available ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={openingPortal}
              onClick={async () => {
                setOpeningPortal(true);
                const result = await openBillingPortal();
                if (!result.ok) setOpeningPortal(false);
              }}
              data-testid="button-manage-billing"
            >
              {openingPortal ? "Opening…" : "Manage subscription"}
            </Button>
          ) : isPro ? (
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/plans")}>
              View plans
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
