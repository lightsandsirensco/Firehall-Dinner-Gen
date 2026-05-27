import type { ExploreEditorialSection } from "@shared/explore-editorial";
import type { ExploreRecipeCard } from "@/lib/explore-recipe";
import { ExploreCinematicCard } from "@/components/explore-cinematic-card";
import { ExploreCinematicCardSkeleton } from "@/components/explore-cinematic-card";
import { ExploreRailHeader } from "@/components/explore-rail-header";
import {
  buildRailPresentation,
  buildWhyThisMeal,
  buildRecommendationChip,
  type ExploreFeedContext,
} from "@/lib/explore-recommendation-ux";
import { cn } from "@/lib/utils";

export interface ExploreDiscoverySectionProps {
  section: ExploreEditorialSection;
  crewSize: number;
  feedContext: ExploreFeedContext;
  sectionIndex: number;
  priorityImageCount?: number;
  onRecipeClick: (recipe: ExploreRecipeCard) => void;
}

export function ExploreDiscoverySection({
  section,
  crewSize,
  feedContext,
  sectionIndex,
  priorityImageCount = 0,
  onRecipeClick,
}: ExploreDiscoverySectionProps) {
  if (section.recipes.length === 0) return null;

  const theme = section.theme ?? "ember";
  const rail = buildRailPresentation(section, feedContext, sectionIndex);
  const isGrid = section.layout === "grid";

  return (
    <section
      id={`explore-section-${section.id}`}
      className={cn(
        "mb-11 sm:mb-14 scroll-mt-20",
        "[content-visibility:auto] [contain-intrinsic-size:auto_420px]",
        rail.isHeroRail && "explore-rail-hero",
      )}
      data-testid={`section-discovery-${section.id}`}
    >
      <ExploreRailHeader presentation={rail} theme={theme} />

      {isGrid ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3">
          {section.recipes.map((recipe, index) => (
            <ExploreCinematicCard
              key={`${section.id}-${recipe.id}-${recipe._curatedSlug ?? ""}`}
              recipe={recipe}
              crewSize={crewSize}
              isCurated={Boolean(recipe._curatedSlug)}
              layout="grid"
              priority={index < priorityImageCount}
              whyThisMeal={buildWhyThisMeal(recipe, section, feedContext)}
              recommendationChip={buildRecommendationChip(recipe, section, feedContext)}
              onClick={() => onRecipeClick(recipe)}
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-nowrap gap-3 sm:gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6",
            "snap-x snap-mandatory scroll-smooth overscroll-x-contain",
            "[-webkit-overflow-scrolling:touch]",
            "scrollbar-hide sm:scrollbar-thin",
            rail.isHeroRail && "explore-rail-glow",
          )}
        >
          {section.recipes.map((recipe, index) => (
            <div
              key={`${section.id}-${recipe.id}-${recipe._curatedSlug ?? ""}`}
              className={cn(
                "snap-start shrink-0",
                rail.isHeroRail
                  ? "w-[min(86vw,340px)] sm:w-[360px]"
                  : "w-[min(82vw,300px)] sm:w-[300px] md:w-[320px]",
              )}
            >
              <ExploreCinematicCard
                recipe={recipe}
                crewSize={crewSize}
                isCurated={Boolean(recipe._curatedSlug)}
                layout="rail"
                priority={index < priorityImageCount}
                whyThisMeal={buildWhyThisMeal(recipe, section, feedContext)}
                recommendationChip={buildRecommendationChip(recipe, section, feedContext)}
                onClick={() => onRecipeClick(recipe)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ExploreDiscoverySectionSkeleton({ layout = "rail" }: { layout?: "rail" | "grid" }) {
  if (layout === "grid") {
    return (
      <div className="mb-14 space-y-5" data-testid="section-discovery-skeleton">
        <div className="h-9 w-56 bg-muted/80 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ExploreCinematicCardSkeleton key={i} layout="grid" />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="mb-14 space-y-5" data-testid="section-discovery-skeleton">
      <div className="h-9 w-56 bg-muted/80 rounded-lg animate-pulse" />
      <div className="flex gap-3.5 overflow-hidden -mx-4 px-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[min(88vw,300px)]">
            <ExploreCinematicCardSkeleton layout="rail" />
          </div>
        ))}
      </div>
    </div>
  );
}
