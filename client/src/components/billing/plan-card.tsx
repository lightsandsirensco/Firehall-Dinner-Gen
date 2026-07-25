import { Check, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { PlanCatalogEntry, PlanId } from "@shared/billing/types";
import { PLAN_PRESENTATIONS } from "@/lib/plans-display";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  plan: PlanCatalogEntry;
  currentPlanId: PlanId;
  onSelect: (planId: PlanId) => void;
  selecting?: PlanId | null;
  disabled?: boolean;
}

export function PlanCard({ plan, currentPlanId, onSelect, selecting, disabled }: PlanCardProps) {
  const presentation = PLAN_PRESENTATIONS[plan.plan_id as keyof typeof PLAN_PRESENTATIONS];
  if (!presentation) return null;

  const isRecommended = Boolean(presentation.recommended);
  const isCurrent = currentPlanId === plan.plan_id;
  const isBusy = selecting === plan.plan_id;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border p-8 sm:p-10",
        isRecommended ? "border-primary/40 bg-primary/[0.04]" : "border-border/50 bg-card/40",
      )}
      data-testid={`plan-card-${plan.plan_id}`}
    >
      {presentation.badge ? (
        <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground">
          {presentation.badge}
        </span>
      ) : null}

      <div className="space-y-2">
        <h3 className="font-heading text-xl tracking-wide text-foreground">{presentation.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{presentation.tagline}</p>
      </div>

      <p className="mt-8 font-heading text-5xl leading-none tracking-wide text-foreground">
        {presentation.price}
        {presentation.pricePeriod ? (
          <span className="ml-1 font-sans text-base font-normal text-muted-foreground">
            {presentation.pricePeriod}
          </span>
        ) : null}
      </p>

      <ul className="mt-8 flex-1 space-y-4">
        {presentation.features.map(({ label }) => (
          <li key={label} className="flex items-start gap-3 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="leading-relaxed text-foreground/90">{label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        {presentation.ctaKind === "link" && presentation.ctaHref ? (
          <Button asChild variant="outline" className="min-h-11 w-full touch-manipulation font-semibold">
            <Link href={presentation.ctaHref}>{presentation.ctaLabel}</Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant={isRecommended ? "default" : "outline"}
            className="min-h-11 w-full touch-manipulation font-semibold"
            disabled={disabled || !plan.enabled || isCurrent || selecting != null}
            onClick={() => onSelect(plan.plan_id)}
            data-testid={`plan-select-${plan.plan_id}`}
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : isCurrent ? (
              "Current plan"
            ) : (
              presentation.ctaLabel
            )}
          </Button>
        )}
      </div>
    </article>
  );
}
