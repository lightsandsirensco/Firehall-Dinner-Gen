import { useEffect, useState } from "react";
import { Flame, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hapticLight } from "@/lib/haptics";

const TONIGHT_IDEAS = [
  "Skillet night · hall portions",
  "One-pan crew spread",
  "Post-call comfort plate",
  "Full table — main + sides",
] as const;

interface EmptyStateProps {
  onGenerate?: () => void;
  generateDisabled?: boolean;
  ctaLabel?: string;
  summaryLine?: string;
}

export function EmptyState({
  onGenerate,
  generateDisabled,
  ctaLabel = "Feed the hall",
  summaryLine = "Dinner for 6 · ~35 min · Surprise Me",
}: EmptyStateProps) {
  const [ideaIndex, setIdeaIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIdeaIndex((i) => (i + 1) % TONIGHT_IDEAS.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center text-center fade-up px-2 py-6 sm:py-8 lg:min-h-[320px]"
      data-testid="empty-state"
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-5 relative">
        <div
          className="absolute inset-0 rounded-2xl bg-primary/5 animate-ping"
          style={{ animationDuration: "2.8s" }}
        />
        <Flame className="w-8 h-8 sm:w-10 sm:h-10 text-primary/70 relative z-[1]" />
      </div>

      <h2
        className="font-heading text-2xl sm:text-3xl tracking-wide text-foreground mb-2"
        data-testid="text-empty-title"
      >
        Pick tonight&apos;s dinner
      </h2>

      <p
        className="text-muted-foreground text-sm max-w-xs mb-1 leading-relaxed"
        data-testid="text-empty-description"
      >
        One tap — full crew meal with sides and steps.
      </p>

      <p
        className="text-xs text-muted-foreground/80 mb-5 tabular-nums"
        data-testid="text-empty-defaults-summary"
      >
        {summaryLine}
      </p>

      {onGenerate && (
        <Button
          size="lg"
          className="btn-generate font-heading text-lg sm:text-xl tracking-wider min-h-[3.25rem] px-10 w-full max-w-sm shadow-md shadow-primary/15 active:scale-[0.98] transition-transform touch-manipulation tap-scale"
          onClick={() => {
            hapticLight();
            onGenerate();
          }}
          disabled={generateDisabled}
          data-testid="button-empty-generate"
        >
          <Flame className="w-5 h-5 mr-2 shrink-0" />
          {ctaLabel}
        </Button>
      )}

      <div
        className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-muted-foreground/70 uppercase tracking-wider animate-in fade-in duration-500"
        data-testid="text-empty-idea-rotate"
        key={ideaIndex}
      >
        <UtensilsCrossed className="w-3 h-3 text-primary/50" aria-hidden />
        <span>{TONIGHT_IDEAS[ideaIndex]}</span>
      </div>

      <p className="text-muted-foreground/50 text-[10px] max-w-xs mt-4" data-testid="text-empty-hint">
        Tweak crew or time anytime — defaults are ready.
      </p>
    </div>
  );
}
