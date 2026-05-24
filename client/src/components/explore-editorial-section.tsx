import type { ExploreEditorialSection } from "@shared/explore-editorial";
import type { ExploreRecipeCard } from "@/lib/explore-recipe";
import { ExploreRecipeCard as ExploreRecipeCardView } from "@/components/explore-recipe-card";

export interface ExploreEditorialSectionProps {
  section: ExploreEditorialSection;
  crewSize: number;
  onRecipeClick: (recipe: ExploreRecipeCard) => void;
}

export function ExploreEditorialSectionBlock({
  section,
  crewSize,
  onRecipeClick,
}: ExploreEditorialSectionProps) {
  if (section.recipes.length === 0) return null;

  const isRail = section.layout === "rail";

  return (
    <section className="mb-10" data-testid={`section-editorial-${section.id}`}>
      <div className="mb-4 pr-2">
        <h2 className="font-heading text-lg sm:text-xl tracking-wider uppercase text-foreground">
          {section.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">{section.subtitle}</p>
      </div>

      {isRail ? (
        <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin -mx-1 px-1">
          {section.recipes.map((recipe) => (
            <div
              key={`${section.id}-${recipe.id}-${recipe._curatedSlug || ""}`}
              className="snap-start shrink-0 w-[min(46vw,200px)] sm:w-[200px]"
            >
              <ExploreRecipeCardView
                recipe={recipe}
                displayServings={crewSize}
                isCurated={Boolean(recipe._curatedSlug)}
                onClick={() => onRecipeClick(recipe)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {section.recipes.map((recipe) => (
            <ExploreRecipeCardView
              key={`${section.id}-${recipe.id}`}
              recipe={recipe}
              displayServings={crewSize}
              isCurated={Boolean(recipe._curatedSlug)}
              onClick={() => onRecipeClick(recipe)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function ExploreEditorialSkeleton() {
  return (
    <div className="mb-10 space-y-4" data-testid="section-editorial-skeleton">
      <div className="h-6 w-48 bg-muted rounded animate-pulse" />
      <div className="h-4 w-64 bg-muted/60 rounded animate-pulse" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[200px] aspect-[4/5] rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
