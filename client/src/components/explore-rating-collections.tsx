import { useQuery } from "@tanstack/react-query";
import {
  crewRatingCollectionsKey,
  fetchRecipeCrewRatingCollections,
} from "@/lib/recipe-crew-ratings-api";
import { approvedCatalogQueryKey, fetchApprovedCatalog } from "@/lib/approved-catalog-api";
import {
  RECIPE_CREW_RATING_BADGE_EMOJI,
  RECIPE_CREW_RATING_COLLECTION_KEYS,
  normalizeRecipeCrewRatingCollections,
  type RecipeCrewRatingBadgeId,
  type RecipeCrewRatingCollectionKey,
} from "@shared/recipe-crew-ratings/types";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const SECTIONS: Array<{
  key: RecipeCrewRatingCollectionKey;
  title: string;
  badge: RecipeCrewRatingBadgeId;
}> = [
  { key: "crewFavourites", title: "Crew Favourites", badge: "crew_favourite" },
  { key: "topRated", title: "Top Rated Recipes", badge: "top_rated" },
  { key: "trending", title: "Trending Recipes", badge: "trending" },
  { key: "rookieApproved", title: "Rookie Approved", badge: "rookie_approved" },
  { key: "firehallClassics", title: "Firehall Classics", badge: "firehall_classic" },
];

export function ExploreRatingCollections({
  onRecipeClick,
  className,
}: {
  onRecipeClick: (slug: string) => void;
  className?: string;
}) {
  const { data: rawData, isError } = useQuery({
    queryKey: crewRatingCollectionsKey,
    queryFn: fetchRecipeCrewRatingCollections,
    staleTime: 60_000,
  });

  const data = useMemo(
    () => (rawData ? normalizeRecipeCrewRatingCollections(rawData) : null),
    [rawData],
  );

  const { data: catalog } = useQuery({
    queryKey: approvedCatalogQueryKey,
    queryFn: fetchApprovedCatalog,
    staleTime: 10 * 60 * 1000,
  });

  const titleBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of catalog?.recipes ?? []) map.set(r.slug, r.title);
    return map;
  }, [catalog?.recipes]);

  if (isError || !data) return null;

  const sectionItems = (key: RecipeCrewRatingCollectionKey) => data[key] ?? [];

  const hasAny = RECIPE_CREW_RATING_COLLECTION_KEYS.some((key) => sectionItems(key).length > 0);
  if (!hasAny) return null;

  return (
    <div className={cn("space-y-8", className)} data-testid="explore-rating-collections">
      {SECTIONS.map(({ key, title, badge }) => {
        const items = sectionItems(key);
        if (!items.length) return null;
        return (
          <section key={key} aria-labelledby={`rating-section-${key}`}>
            <h2
              id={`rating-section-${key}`}
              className="mb-3 flex items-center gap-2 font-heading text-lg tracking-wide"
            >
              <span aria-hidden>{RECIPE_CREW_RATING_BADGE_EMOJI[badge]}</span>
              {title}
            </h2>
            <ul className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
              {items.map((item) => (
                <li key={item.recipeSlug} className="snap-start shrink-0 w-[200px] sm:w-[220px]">
                  <button
                    type="button"
                    onClick={() => onRecipeClick(item.recipeSlug)}
                    className="w-full rounded-2xl border border-border/25 bg-card/30 p-4 text-left hover:border-primary/30 transition-colors touch-manipulation min-h-11"
                  >
                    <p className="text-sm font-semibold line-clamp-2">
                      {titleBySlug.get(item.recipeSlug) ??
                        item.recipeSlug.replace(/-/g, " ")}
                    </p>
                    <p className="mt-2 text-xs text-primary font-medium">{item.approvalLabel}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
