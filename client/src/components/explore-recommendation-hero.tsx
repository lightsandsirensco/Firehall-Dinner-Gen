import { cn } from "@/lib/utils";
import type { ExploreHeroCopy, ExploreShiftMode } from "@/lib/explore-recommendation-ux";

export interface ExploreRecommendationHeroProps {
  copy: ExploreHeroCopy;
  activeMode: ExploreShiftMode;
  onModeChange: (mode: ExploreShiftMode) => void;
  className?: string;
}

export function ExploreRecommendationHero({
  copy,
  activeMode,
  onModeChange,
  className,
}: ExploreRecommendationHeroProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-2 -mx-0.5", className)}
      data-testid="explore-recommendation-hero"
      role="tablist"
      aria-label="Browse by shift mood"
    >
      {copy.chips.map((chip) => {
        const active = chip.mode === activeMode;
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onModeChange(chip.mode)}
            className={cn(
              "snap-start shrink-0 rounded-full px-4 py-2.5 text-xs font-medium min-h-11",
              "border transition-colors duration-200 touch-manipulation active:scale-[0.98]",
              active
                ? "bg-primary text-primary-foreground border-primary/80"
                : "bg-transparent text-muted-foreground border-border/40 hover:border-border/70 hover:text-foreground",
            )}
            data-testid={`hero-chip-${chip.id}`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
