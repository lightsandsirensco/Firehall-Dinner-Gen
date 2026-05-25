import type { ExploreEditorialSection, ExploreSectionTheme } from "@shared/explore-editorial";
import type { ExploreRecipeCard } from "@/lib/explore-recipe";
import { ExploreCinematicCard } from "@/components/explore-cinematic-card";
import { ExploreCinematicCardSkeleton } from "@/components/explore-cinematic-card";
import { cn } from "@/lib/utils";

const THEME_STYLES: Record<
  ExploreSectionTheme,
  { accent: string; glow: string }
> = {
  ember: {
    accent: "from-primary via-orange-500 to-amber-600",
    glow: "shadow-[0_0_40px_-8px_rgba(234,88,12,0.35)]",
  },
  smoke: {
    accent: "from-zinc-400 via-zinc-600 to-zinc-800",
    glow: "shadow-[0_0_32px_-10px_rgba(120,120,120,0.25)]",
  },
  gold: {
    accent: "from-amber-400 via-amber-500 to-yellow-700",
    glow: "shadow-[0_0_36px_-8px_rgba(245,158,11,0.3)]",
  },
  steel: {
    accent: "from-slate-300 via-slate-500 to-slate-700",
    glow: "",
  },
  copper: {
    accent: "from-orange-600 via-amber-700 to-amber-900",
    glow: "",
  },
  ocean: {
    accent: "from-cyan-400 via-teal-500 to-blue-800",
    glow: "shadow-[0_0_36px_-10px_rgba(34,211,238,0.2)]",
  },
};

export interface ExploreDiscoverySectionProps {
  section: ExploreEditorialSection;
  crewSize: number;
  priorityImageCount?: number;
  onRecipeClick: (recipe: ExploreRecipeCard) => void;
}

export function ExploreDiscoverySection({
  section,
  crewSize,
  priorityImageCount = 0,
  onRecipeClick,
}: ExploreDiscoverySectionProps) {
  if (section.recipes.length === 0) return null;

  const theme = section.theme ?? "ember";
  const themeStyle = THEME_STYLES[theme] ?? THEME_STYLES.ember;
  const isGrid = section.layout === "grid";
  const isHeroRail = section.id === "firehouse_staples" || section.id === "trending_tonight";

  return (
    <section
      id={`explore-section-${section.id}`}
      className={cn(
        "mb-11 sm:mb-14 scroll-mt-20",
        "[content-visibility:auto] [contain-intrinsic-size:auto_420px]",
      )}
      data-testid={`section-discovery-${section.id}`}
    >
      <div className={cn("mb-4 sm:mb-5 px-0.5", isHeroRail && "mb-5 sm:mb-6")}>
        <div
          className={cn(
            "h-1 rounded-full bg-gradient-to-r mb-3",
            themeStyle.accent,
            isHeroRail && "h-1.5 w-20",
          )}
          aria-hidden
        />
        <h2
          className={cn(
            "font-heading tracking-wide text-foreground",
            isHeroRail ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
          )}
        >
          {section.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-lg leading-relaxed">
          {section.subtitle}
        </p>
      </div>

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
            isHeroRail && themeStyle.glow,
          )}
        >
          {section.recipes.map((recipe, index) => (
            <div
              key={`${section.id}-${recipe.id}-${recipe._curatedSlug ?? ""}`}
              className={cn(
                "snap-start shrink-0",
                isHeroRail
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
