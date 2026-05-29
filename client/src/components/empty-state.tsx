import { Button } from "@/components/ui/button";
import { hapticLight } from "@/lib/haptics";
import { ONE_TAP_MEAL_LABEL } from "@/lib/meal-outcome-copy";
import { GENERATOR } from "@/lib/brand-copy";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface EmptyStateProps {
  onGenerate?: () => void;
  generateDisabled?: boolean;
  ctaLabel?: string;
  summaryLine?: string;
}

export function EmptyState({
  onGenerate,
  generateDisabled,
  ctaLabel = ONE_TAP_MEAL_LABEL,
  summaryLine,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        app.panel,
        "relative flex flex-col items-center justify-center text-center px-6 py-12 sm:py-16 lg:min-h-[280px] overflow-hidden",
      )}
      data-testid="empty-state"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(198,40,40,0.16), transparent 55%)",
        }}
      />
      <div className="relative">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Flame className="h-6 w-6 text-primary/90" aria-hidden />
        </div>
      <h2
        className={cn(app.titleMeal, "max-w-[14ch] sm:max-w-none mx-auto")}
        data-testid="text-empty-title"
      >
        {GENERATOR.emptyTitle}
      </h2>

      <p
        className={cn(app.lead, "mt-3 max-w-sm mx-auto")}
        data-testid="text-empty-description"
      >
        {GENERATOR.emptyBody}
      </p>

      {summaryLine && (
        <p
          className={cn(app.caption, "mt-4 tabular-nums")}
          data-testid="text-empty-defaults-summary"
        >
          {summaryLine}
        </p>
      )}

      {onGenerate && (
        <Button
          size="lg"
          className={cn(
            "btn-tonight btn-generate w-full max-w-md mt-8 active:scale-[0.98] transition-transform touch-manipulation",
          )}
          onClick={() => {
            hapticLight();
            onGenerate();
          }}
          disabled={generateDisabled}
          data-testid="button-empty-generate"
        >
          {ctaLabel}
        </Button>
      )}

      <p className={cn(app.caption, "mt-6 max-w-xs")} data-testid="text-empty-hint">
        {GENERATOR.emptyHint}
      </p>
      </div>
    </div>
  );
}
