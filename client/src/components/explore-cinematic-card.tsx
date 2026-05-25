import { memo, useMemo } from "react";
import { Clock, Flame } from "lucide-react";
import type { ExploreRecipeCard } from "@/lib/explore-recipe";
import { computeCardPresentation } from "@/lib/explore-recipe";
import { buildExploreTrustLine } from "@/lib/explore-trust-line";
import { ExploreRecipeImage } from "@/components/explore-recipe-image";
import { cn } from "@/lib/utils";

export interface ExploreCinematicCardProps {
  recipe: ExploreRecipeCard;
  crewSize?: number;
  isCurated?: boolean;
  layout?: "rail" | "grid";
  onClick: () => void;
  className?: string;
  priority?: boolean;
}

function ExploreCinematicCardInner({
  recipe,
  crewSize,
  isCurated,
  layout = "rail",
  onClick,
  className,
  priority = false,
}: ExploreCinematicCardProps) {
  const presentation = useMemo(() => {
    const computed = computeCardPresentation(recipe, { crewSize, isCurated });
    return {
      ...computed,
      quickPills: recipe.quickPills?.length ? recipe.quickPills : computed.quickPills,
    };
  }, [recipe, crewSize, isCurated]);

  const trustLine = useMemo(() => buildExploreTrustLine(recipe), [recipe]);
  const isGrid = layout === "grid";

  const traitPills = presentation.quickPills.filter(
    (p) => !/^\d+\s*m(?:in)?$/i.test(p.trim()),
  );
  const timePill =
    recipe.readyInMinutes > 0
      ? recipe.readyInMinutes <= 30
        ? `${recipe.readyInMinutes} Min`
        : `${recipe.readyInMinutes}m`
      : null;

  return (
    <article
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl sm:rounded-[1.35rem]",
        "ring-1 ring-white/[0.14] shadow-lg shadow-black/30",
        "transition-[transform,box-shadow,ring-color] duration-300 ease-out",
        "hover:ring-primary/50 hover:shadow-[0_24px_56px_-14px_rgba(0,0,0,0.85)]",
        "active:scale-[0.98] motion-reduce:transition-none",
        "touch-manipulation select-none",
        className,
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      data-testid={`card-discovery-${recipe.id}`}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden bg-zinc-950",
          isGrid ? "aspect-[3/4] sm:aspect-[4/5]" : "aspect-[4/5] sm:aspect-[4/5] min-h-[260px] sm:min-h-[280px]",
        )}
      >
        <div className="absolute inset-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] motion-reduce:group-hover:scale-100">
          <ExploreRecipeImage
            recipe={recipe}
            variant="card"
            cinematic
            priority={priority}
            sizesHint={isGrid ? "grid" : "rail"}
          />
        </div>

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/15 z-[1]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-60 z-[1]"
          aria-hidden
        />

        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start gap-1.5 z-10 max-w-[85%]">
          {isCurated && (
            <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg shadow-primary/20">
              <Flame className="w-3 h-3" />
              Hall Pick
            </span>
          )}
          {presentation.displayBadges.slice(0, 1).map((badge) => (
            <span
              key={badge}
              className="inline-flex bg-black/75 backdrop-blur-md text-white text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border border-white/12"
            >
              {badge}
            </span>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {timePill && (
              <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/20 tabular-nums">
                <Clock className="w-3 h-3 opacity-90" />
                {timePill}
              </span>
            )}
            {traitPills.slice(0, 2).map((pill) => (
              <span
                key={pill}
                className="inline-flex bg-black/70 backdrop-blur-md text-white/95 text-[10px] font-medium px-2.5 py-1 rounded-full border border-white/10"
              >
                {pill}
              </span>
            ))}
          </div>

          <div>
            <h3 className="font-heading text-xl sm:text-2xl leading-[1.12] text-white line-clamp-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              {recipe.title}
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-white/88 line-clamp-2 font-medium leading-snug">
              {trustLine}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export const ExploreCinematicCard = memo(ExploreCinematicCardInner);

export function ExploreCinematicCardSkeleton({ layout = "rail" }: { layout?: "rail" | "grid" }) {
  return (
    <div
      className={cn(
        "rounded-2xl sm:rounded-[1.35rem] overflow-hidden bg-zinc-900/90 ring-1 ring-white/5",
        layout === "grid" ? "aspect-[4/5]" : "aspect-[5/6] min-h-[280px]",
      )}
      data-testid="skeleton-cinematic-card"
    >
      <div className="h-full w-full skeleton-shimmer" />
    </div>
  );
}
