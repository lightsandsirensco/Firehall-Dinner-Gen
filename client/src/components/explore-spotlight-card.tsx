import { Clock, Flame, Users } from "lucide-react";
import type { ExploreRecipeCard } from "@/lib/explore-recipe";
import { ExploreRecipeImage } from "@/components/explore-recipe-image";
import { buildExploreTrustLine } from "@/lib/explore-trust-line";
import { HERO_LAYOUT_FRAME } from "@/lib/hero-image";
import { cn } from "@/lib/utils";

export interface ExploreSpotlightCardProps {
  recipe: ExploreRecipeCard;
  crewSize?: number;
  isCurated?: boolean;
  onClick: () => void;
  className?: string;
}

/** Hero spotlight — NYT/Tasty-style featured pick above the rails */
export function ExploreSpotlightCard({
  recipe,
  crewSize = 6,
  isCurated,
  onClick,
  className,
}: ExploreSpotlightCardProps) {
  const trust = buildExploreTrustLine(recipe);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left overflow-hidden rounded-3xl",
        "ring-1 ring-white/15 shadow-2xl shadow-black/40",
        "transition-transform duration-300 active:scale-[0.99] motion-reduce:transition-none",
        className,
      )}
      data-testid="explore-spotlight-card"
    >
      <div className={cn("relative overflow-hidden", HERO_LAYOUT_FRAME.cinematic)}>
        <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100">
          <ExploreRecipeImage recipe={recipe} variant="card" cinematic sizesHint="spotlight" priority />
        </div>
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5" />
            Tonight&apos;s pick
          </span>
          {isCurated && (
            <span className="inline-flex bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border border-white/15">
              Hall classic
            </span>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 z-10">
          <h2 className="font-heading text-2xl sm:text-4xl tracking-wide text-white leading-tight max-w-2xl drop-shadow-lg">
            {recipe.title}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-white/90 font-medium max-w-xl">{trust}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-white/80">
            {recipe.readyInMinutes > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {recipe.readyInMinutes} min
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Crew of {crewSize}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
