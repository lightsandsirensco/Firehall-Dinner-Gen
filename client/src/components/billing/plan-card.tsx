import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { PlanCatalogEntry, PlanId } from "@shared/billing/types";
import { PLAN_PRESENTATIONS, type PlanBillingPeriod } from "@/lib/plans-display";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  plan: PlanCatalogEntry;
  currentPlanId: PlanId;
  /** billingPeriod is only meaningful for plans with `billingOptions` (Firehall Meals Pro). */
  onSelect: (planId: PlanId, billingPeriod?: PlanBillingPeriod) => void;
  /**
   * Fired when the user explicitly picks Monthly/Annual — NOT on render/mount.
   * Lets the caller record `pro_plan_selected` at the moment of real user intent.
   */
  onBillingPeriodChange?: (planId: PlanId, billingPeriod: PlanBillingPeriod) => void;
  selecting?: PlanId | null;
  disabled?: boolean;
  /**
   * Whether real Stripe checkout is live (billing_global_flags.payments_enabled).
   * PLAN_PRESENTATIONS.firefighter_plus is authored as a static "Coming Soon"
   * pre-launch pitch — once real checkout is live that badge/copy would be
   * actively misleading to someone who just paid, so this swaps in
   * launched-state copy for that one plan instead. All other plans are
   * unaffected by this prop.
   */
  paymentsEnabled?: boolean;
}

export function PlanCard({
  plan,
  currentPlanId,
  onSelect,
  onBillingPeriodChange,
  selecting,
  disabled,
  paymentsEnabled,
}: PlanCardProps) {
  const presentation = PLAN_PRESENTATIONS[plan.plan_id as keyof typeof PLAN_PRESENTATIONS];
  // Visually recommend Annual (best value) without ever recording a
  // selection until the user actually taps one of the two options.
  const [billingPeriod, setBillingPeriod] = useState<PlanBillingPeriod>("annual");
  if (!presentation) return null;

  const isRecommended = Boolean(presentation.recommended);
  const isCurrent = currentPlanId === plan.plan_id;
  const isBusy = selecting === plan.plan_id;
  const billingOptions = presentation.billingOptions;
  const activeOption = billingOptions?.find((o) => o.id === billingPeriod) ?? billingOptions?.[0];
  const isLive = plan.plan_id === "firefighter_plus" && Boolean(paymentsEnabled);
  // No free trial — Firehall Meals Pro bills immediately on checkout (see
  // PAID LAUNCH LEGAL & COMMERCIAL SURFACES).
  const ctaLabel = isLive && !isCurrent ? "Subscribe now" : presentation.ctaLabel;
  // Once real checkout is live, every "not purchasable yet" signal (ribbon +
  // disclosure copy) must disappear from the Pro card — never show "Coming
  // Soon" next to a real, working Subscribe button.
  const showComingSoonRibbon = Boolean(presentation.badge) && !isLive;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border p-6 sm:p-8 lg:p-10",
        isRecommended
          ? "border-primary/50 bg-primary/[0.04] shadow-sm shadow-primary/10"
          : "border-border/50 bg-card/40",
      )}
      data-testid={`plan-card-${plan.plan_id}`}
    >
      {showComingSoonRibbon ? (
        <span className="absolute -top-3 left-6 sm:left-8 inline-flex items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground">
          {presentation.badge}
        </span>
      ) : null}

      {/* 1. Plan name + short value proposition */}
      <div className="space-y-2">
        <h3 className="font-heading text-2xl tracking-wide text-foreground">{presentation.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{presentation.tagline}</p>
      </div>

      {/* 2. Price + billing interval + optional savings/monthly-equivalent line */}
      {billingOptions && activeOption ? (
        <div className="mt-8">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-heading text-5xl leading-none tracking-wide text-foreground">
              {activeOption.price}
            </span>
            <span className="text-base font-sans font-normal text-muted-foreground">
              {activeOption.period}
            </span>
          </div>

          {activeOption.equivalentLabel || activeOption.savingsLabel ? (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {activeOption.equivalentLabel ? <span>{activeOption.equivalentLabel}</span> : null}
              {activeOption.savingsLabel ? (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {activeOption.savingsLabel}
                </span>
              ) : null}
            </p>
          ) : null}

          {/* 3. Monthly / Annual toggle — every option renders its own price
              and (reserved-height) savings note in normal flow, so nothing
              is ever absolutely positioned on top of adjacent text. */}
          <div
            className="mt-5 grid grid-cols-2 gap-2 sm:gap-3"
            role="radiogroup"
            aria-label="Billing period"
            data-testid="plan-billing-period-toggle"
          >
            {billingOptions.map((option) => {
              const selected = option.id === billingPeriod;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setBillingPeriod(option.id);
                    onBillingPeriodChange?.(plan.plan_id, option.id);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors min-h-11",
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 text-muted-foreground hover:border-border",
                  )}
                  data-testid={`plan-billing-period-${option.id}`}
                >
                  <span className="block">{option.label}</span>
                  <span className="block text-xs text-muted-foreground/80">
                    {option.price}
                    {option.period}
                  </span>
                  {/* Reserve the same height on both buttons whether or not
                      this option has a savings note, so Monthly/Annual stay
                      visually aligned instead of one button being shorter. */}
                  <span
                    aria-hidden={!option.savingsLabel}
                    className={cn(
                      "mt-1 block text-[11px] font-semibold text-primary",
                      !option.savingsLabel && "invisible",
                    )}
                  >
                    {option.savingsLabel || "—"}
                  </span>
                </button>
              );
            })}
          </div>

          {isLive ? (
            <p className="mt-4 text-xs text-muted-foreground/90">
              Billed immediately, renews automatically. Cancel anytime from Manage Billing.
            </p>
          ) : presentation.comingSoonNote ? (
            <p className="mt-4 text-xs text-muted-foreground/90">{presentation.comingSoonNote}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-8">
          <p className="font-heading text-5xl leading-none tracking-wide text-foreground">
            {/* Price label is server/DB-driven so it always reflects real billing state
                (e.g. "Free" during preview, real pricing once Stripe is live) —
                never hardcode a price the backend isn't actually charging. */}
            {plan.price_label || presentation.price}
          </p>
          {presentation.secondaryPrice ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{presentation.secondaryPrice}</p>
          ) : null}
        </div>
      )}

      {/* 4. Features */}
      {presentation.featuresHeading ? (
        <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {presentation.featuresHeading}
        </p>
      ) : null}
      <ul className={cn("flex-1 space-y-4", presentation.featuresHeading ? "mt-3" : "mt-8")}>
        {presentation.features.map((feature) => (
          <li key={feature.label} className="flex items-start gap-3 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="leading-relaxed">
              <span className="block font-medium text-foreground">{feature.label}</span>
              {feature.description ? (
                <span className="block text-muted-foreground">{feature.description}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {/* 5. CTA */}
      <div className="mt-8">
        {presentation.ctaKind === "link" && presentation.ctaHref ? (
          <Button asChild variant="outline" className="min-h-12 w-full touch-manipulation font-semibold">
            <Link href={presentation.ctaHref}>{presentation.ctaLabel}</Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant={isRecommended ? "default" : "outline"}
            className="min-h-12 w-full touch-manipulation font-semibold"
            disabled={disabled || !plan.enabled || isCurrent || selecting != null}
            onClick={() => onSelect(plan.plan_id, billingOptions ? billingPeriod : undefined)}
            data-testid={`plan-select-${plan.plan_id}`}
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : isCurrent ? (
              "Current plan"
            ) : (
              ctaLabel
            )}
          </Button>
        )}
      </div>
    </article>
  );
}
