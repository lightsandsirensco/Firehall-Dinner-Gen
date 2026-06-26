import { Check, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export function PlanCard({
  plan,
  currentPlanId,
  onSelect,
  selecting,
  disabled,
}: PlanCardProps) {
  const presentation = PLAN_PRESENTATIONS[plan.plan_id];
  const isPlus = plan.plan_id === "personal";
  const isHallPro = plan.plan_id === "hall_pro";
  const isCurrent = !isHallPro && currentPlanId === plan.plan_id;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border p-6 transition-all duration-300 sm:p-7",
        "hover:-translate-y-0.5 hover:shadow-lg",
        isPlus &&
          "z-[1] border-primary/50 bg-gradient-to-b from-primary/[0.07] to-card/80 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.45)] hover:border-primary/60 hover:shadow-[0_16px_40px_-14px_hsl(var(--primary)/0.5)]",
        isHallPro &&
          "border-border/60 bg-muted/20 hover:border-border/80 hover:bg-muted/25 hover:shadow-md",
        !isPlus && !isHallPro && "border-border/50 bg-card/50 hover:border-border/70 hover:bg-card/70",
      )}
      data-testid={`plan-card-${plan.plan_id}`}
    >
      {presentation.badge ? (
        <Badge
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] shadow-sm",
            presentation.recommended
              ? "border-primary/20 bg-primary text-primary-foreground"
              : "border-border/60 bg-muted text-muted-foreground",
          )}
        >
          {presentation.badge}
        </Badge>
      ) : null}

      <header className="space-y-4 border-b border-border/30 pb-6">
        <h3 className="font-heading text-xl tracking-wide text-foreground sm:text-2xl">
          {presentation.title}
        </h3>

        <div className="space-y-2">
          <p
            className={cn(
              "font-heading leading-none tracking-wide text-foreground",
              presentation.price === "Contact Us"
                ? "text-3xl sm:text-4xl"
                : "text-4xl sm:text-[2.85rem]",
            )}
          >
            {presentation.price}
            {presentation.pricePeriod ? (
              <span className="ml-1 font-sans text-base font-normal text-muted-foreground sm:text-lg">
                {presentation.pricePeriod}
              </span>
            ) : null}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
            {presentation.tagline}
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col pt-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Features
        </p>

        <ul className="min-h-[12rem] flex-1 space-y-3 sm:min-h-[14rem]">
          {presentation.features.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="grid grid-cols-[1rem_1.125rem_1fr] items-start gap-x-2.5 text-sm leading-snug"
            >
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500"
                aria-hidden
              />
              <Icon
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/80"
                aria-hidden
              />
              <span className="text-foreground/90">{label}</span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="mt-8 space-y-4 border-t border-border/30 pt-6">
        <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {presentation.footer}
        </p>

        {presentation.ctaKind === "link" && presentation.ctaHref ? (
          <Button
            asChild
            variant="outline"
            className="min-h-11 w-full touch-manipulation transition-transform group-hover:translate-y-0"
          >
            <Link href={presentation.ctaHref}>{presentation.ctaLabel}</Link>
          </Button>
        ) : presentation.ctaKind === "disabled" ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full touch-manipulation border-border/60 bg-muted/30 text-muted-foreground"
            disabled
            data-testid="plan-hall-pro-coming-soon"
          >
            {presentation.ctaLabel}
          </Button>
        ) : (
          <Button
            type="button"
            variant={isCurrent ? "secondary" : "default"}
            className={cn(
              "min-h-11 w-full touch-manipulation font-semibold",
              isPlus && !isCurrent && "shadow-sm",
            )}
            disabled={disabled || !plan.enabled || isCurrent || selecting != null}
            onClick={() => onSelect(plan.plan_id)}
          >
            {selecting === plan.plan_id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCurrent ? (
              "Current plan"
            ) : (
              presentation.ctaLabel
            )}
          </Button>
        )}
      </footer>
    </article>
  );
}
