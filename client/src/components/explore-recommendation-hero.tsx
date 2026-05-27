import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { Sparkles } from "lucide-react";
import type { ExploreHeroCopy, ExploreShiftMode } from "@/lib/explore-recommendation-ux";

export interface ExploreRecommendationHeroProps {
  copy: ExploreHeroCopy;
  activeMode: ExploreShiftMode;
  onModeChange: (mode: ExploreShiftMode) => void;
  intelligenceLabel?: string;
  className?: string;
}

export function ExploreRecommendationHero({
  copy,
  activeMode,
  onModeChange,
  intelligenceLabel,
  className,
}: ExploreRecommendationHeroProps) {
  return (
    <div className={cn("space-y-4", className)} data-testid="explore-recommendation-hero">
      {intelligenceLabel && (
        <p className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400/90">
          <Sparkles className="w-3 h-3 shrink-0" aria-hidden />
          {intelligenceLabel}
        </p>
      )}
      <div className="flex flex-wrap gap-2 -mx-0.5">
        {copy.chips.map((chip) => {
          const active = chip.mode === activeMode;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onModeChange(chip.mode)}
              className={cn(
                "snap-start shrink-0 rounded-full px-3.5 py-2 text-[11px] font-semibold tracking-wide min-h-10",
                "border transition-all duration-200 touch-manipulation active:scale-[0.97]",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
                  : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/70 hover:text-foreground",
              )}
              data-testid={`hero-chip-${chip.id}`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
