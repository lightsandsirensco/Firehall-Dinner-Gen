import { Clock, Flame } from "lucide-react";
import type { ExploreRecipeCard } from "@/lib/explore-recipe";
import {
  computeCardPresentation,
  type ExploreCardPresentation,
} from "@/lib/explore-recipe";
import { ExploreRecipeImage } from "@/components/explore-recipe-image";
import { cn } from "@/lib/utils";

export interface ExploreGridCardProps {
  recipe: ExploreRecipeCard;
  crewSize?: number;
  presentation?: ExploreCardPresentation;
  isCurated?: boolean;
  isFirehallFallback?: boolean;
  onClick: () => void;
  className?: string;
}

export function ExploreGridCard({
  recipe,
  crewSize,
  presentation: presentationProp,
  isCurated,
  isFirehallFallback,
  onClick,
  className,
}: ExploreGridCardProps) {
  const presentation =
    presentationProp ??
    computeCardPresentation(recipe, {
      crewSize,
      macros: recipe.macros,
      isCurated,
    });

  return (
    <article
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl",
        "transition-transform duration-300 ease-out",
        "hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/40",
        "active:scale-[0.98] touch-manipulation motion-reduce:transition-none motion-reduce:hover:scale-100",
        className,
      )}
      onClick={onClick}
      data-testid={`card-explore-result-${recipe.id}`}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100">
          <ExploreRecipeImage recipe={recipe} variant="card" cinematic />
        </div>

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2 z-10">
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {isCurated && (
              <span className="inline-flex items-center gap-1 bg-primary/95 text-primary-foreground text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm">
                <Flame className="w-3 h-3 shrink-0" />
                Hall classic
              </span>
            )}
            {isFirehallFallback && (
              <span className="inline-flex items-center gap-1 bg-primary/95 text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-lg">
                <Flame className="w-3 h-3" />
                Firehall AI
              </span>
            )}
            {presentation.displayBadges.map((label) => (
              <span
                key={label}
                className="inline-flex items-center bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border border-white/10"
              >
                {label}
              </span>
            ))}
          </div>

          {recipe.readyInMinutes > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded-full border border-white/10">
              <Clock className="w-3 h-3" />
              {recipe.readyInMinutes} min
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 z-10">
          <h3
            className="font-heading text-xl sm:text-2xl leading-tight text-white line-clamp-2 drop-shadow-lg"
            data-testid={`text-result-title-${recipe.id}`}
          >
            {recipe.title}
          </h3>
          {presentation.hookLine && (
            <p className="mt-1.5 text-sm font-medium text-white/90 line-clamp-1 drop-shadow-md">
              {presentation.hookLine}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function ExploreGridCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl sm:rounded-2xl overflow-hidden animate-pulse bg-zinc-900/80",
        className,
      )}
      data-testid="skeleton-card"
    >
      <div className="aspect-[4/5] relative overflow-hidden bg-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          <div className="h-6 bg-white/10 rounded-md w-4/5" />
          <div className="h-3 bg-white/10 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}
