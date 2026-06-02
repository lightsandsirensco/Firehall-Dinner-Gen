import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import {
  APPROVED_CATALOG_COOK_TIME_LABELS,
  APPROVED_CATALOG_PRIMARY_LABELS,
  approvedCatalogRecipePath,
  type ApprovedCatalogCookTimeBucket,
  type ApprovedCatalogGridEntry,
  type ApprovedCatalogPrimaryFilter,
} from "@shared/approved-catalog";
import { MissingRecipeImagePlaceholder } from "@/components/missing-recipe-image-placeholder";
import { cn } from "@/lib/utils";
import { FilterChip, FilterChipScroller } from "@/components/mobile/filter-chips";
import { Button } from "@/components/ui/button";
import {
  approvedCatalogGridQueryKey,
  fetchApprovedCatalogGrid,
} from "@/lib/approved-catalog-api";
import { ExploreCatalogCardBoundary } from "@/components/explore-catalog-card-boundary";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchRecipeRatingSortMap } from "@/lib/recipe-crew-ratings-api";
import { ExploreRatingCollections } from "@/components/explore-rating-collections";
import {
  buildApprovedCatalogFacetOptions,
  DEFAULT_APPROVED_CATALOG_FILTERS,
  filterApprovedCatalogEntries,
  hasActiveApprovedCatalogFilters,
  type ApprovedCatalogFilterState,
} from "@/lib/approved-catalog-filters";
import { RecipeGridSkeleton } from "@/components/mobile/loading-skeletons";
import { trackExploreFilter, trackExploreRecipeClick, trackSearch } from "@/lib/analytics";
import { exploreCardImageCandidates, exploreCatalogPageSize } from "@/lib/explore-card-image";
import { EXPLORE_CATALOG_PAGE_SIZE_MOBILE } from "@/lib/explore-mobile-page-size";
import type { RecipeRatingSortMap } from "@/lib/recipe-crew-ratings-api";

export { EXPLORE_CATALOG_PAGE_SIZE_MOBILE as EXPLORE_CATALOG_PAGE_SIZE };

const PRIMARY_FILTERS: ApprovedCatalogPrimaryFilter[] = [
  "all",
  "healthy",
  "bbq_grill",
  "smoothies",
];

const COOK_TIME_FILTERS: ApprovedCatalogCookTimeBucket[] = ["under_30", "30_to_60", "over_60"];

export type CatalogSortMode =
  | "curated"
  | "most_popular"
  | "highest_rated"
  | "most_votes"
  | "trending";

const SORT_LABELS: Record<CatalogSortMode, string> = {
  curated: "Curated",
  most_popular: "Most Popular",
  highest_rated: "Highest Rated",
  most_votes: "Most Votes",
  trending: "Trending",
};

function sortCatalogEntries(
  rows: ApprovedCatalogGridEntry[],
  sort: CatalogSortMode,
  sortMap: RecipeRatingSortMap | undefined,
): ApprovedCatalogGridEntry[] {
  if (sort === "curated" || !sortMap) {
    return [...rows].sort((a, b) => a.title.localeCompare(b.title));
  }
  const score = (slug: string) => sortMap[slug];
  if (sort === "most_popular" || sort === "most_votes") {
    return [...rows].sort(
      (a, b) => (score(b.slug)?.totalVotes ?? 0) - (score(a.slug)?.totalVotes ?? 0),
    );
  }
  if (sort === "highest_rated") {
    return [...rows].sort(
      (a, b) => (score(b.slug)?.approvalScore ?? 0) - (score(a.slug)?.approvalScore ?? 0),
    );
  }
  if (sort === "trending") {
    return [...rows].sort(
      (a, b) => (score(b.slug)?.trendingScore ?? 0) - (score(a.slug)?.trendingScore ?? 0),
    );
  }
  return rows;
}

const EXPLORE_CARD_IMG_WIDTH = 320;
const EXPLORE_CARD_IMG_HEIGHT = 400;

const ApprovedCatalogCard = memo(function ApprovedCatalogCard({
  entry,
  onClick,
}: {
  entry: ApprovedCatalogGridEntry;
  onClick: () => void;
}) {
  const candidates = useMemo(() => exploreCardImageCandidates(entry), [entry]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const imageSrc = candidates[candidateIndex] ?? "";
  const showImage = Boolean(imageSrc) && !exhausted;

  useEffect(() => {
    setCandidateIndex(0);
    setExhausted(false);
  }, [entry.slug]);

  return (
    <article
      className={cn(
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-card/30 ring-1 ring-border/15",
        "md:hover:ring-primary/25",
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
      data-testid={`explore-catalog-card-${entry.slug}`}
      data-recipe-route={approvedCatalogRecipePath(entry.slug)}
    >
      <div
        className="relative aspect-[4/5] overflow-hidden bg-zinc-950"
        style={{ contain: "layout paint" }}
      >
        {showImage ? (
          <img
            src={imageSrc}
            alt={entry.title}
            width={EXPLORE_CARD_IMG_WIDTH}
            height={EXPLORE_CARD_IMG_HEIGHT}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="absolute inset-0 h-full w-full object-cover object-center"
            onError={() => {
              setCandidateIndex((prev) => {
                if (prev + 1 < candidates.length) return prev + 1;
                setExhausted(true);
                return prev;
              });
            }}
          />
        ) : (
          <MissingRecipeImagePlaceholder title={entry.title} />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug md:group-hover:text-primary">
          {entry.title}
        </h3>
        <p className="mt-auto flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
          <span>{entry.categoryLabel}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="h-3 w-3 opacity-70" aria-hidden />
            {entry.cookTime} min
          </span>
        </p>
      </div>
    </article>
  );
});

export interface ExploreCatalogBrowserProps {
  onRecipeClick: (slug: string) => void;
  className?: string;
}

export function ExploreCatalogBrowser({ onRecipeClick, className }: ExploreCatalogBrowserProps) {
  const isMobile = useIsMobile();
  const pageSize = exploreCatalogPageSize(isMobile);

  const [filters, setFilters] = useState<ApprovedCatalogFilterState>(
    DEFAULT_APPROVED_CATALOG_FILTERS,
  );
  const [sort, setSort] = useState<CatalogSortMode>("curated");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: approvedCatalogGridQueryKey,
    queryFn: fetchApprovedCatalogGrid,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: sortMap } = useQuery({
    queryKey: ["recipe-rating-sort-map"],
    queryFn: fetchRecipeRatingSortMap,
    staleTime: 60_000,
  });

  const facets = useMemo(
    () => buildApprovedCatalogFacetOptions(data?.recipes ?? []),
    [data?.recipes],
  );

  const filtered = useMemo(() => {
    let rows = filterApprovedCatalogEntries(data?.recipes ?? [], filters);
    if (searchQuery) {
      rows = rows.filter((entry) => entry.searchText.includes(searchQuery));
    }
    return sortCatalogEntries(rows, sort, sortMap);
  }, [data?.recipes, filters, sort, sortMap, searchQuery]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [filters, sort, searchQuery, pageSize]);

  const lastTrackedSearch = useRef("");
  useEffect(() => {
    if (!searchQuery) {
      lastTrackedSearch.current = "";
      return;
    }
    if (lastTrackedSearch.current === searchQuery) return;
    lastTrackedSearch.current = searchQuery;
    trackSearch(searchQuery, filtered.length, "explore");
  }, [searchQuery, filtered.length]);

  const visibleRecipes = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const hasMore = visibleCount < filtered.length;

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_APPROVED_CATALOG_FILTERS);
    setSearchInput("");
  }, []);

  const handleRecipeClick = useCallback(
    (entry: ApprovedCatalogGridEntry) => {
      trackExploreRecipeClick({ slug: entry.slug, title: entry.title });
      onRecipeClick(entry.slug);
    },
    [onRecipeClick],
  );

  return (
    <section className={cn("space-y-6", className)} data-testid="explore-catalog-browser">
      <ExploreRatingCollections onRecipeClick={onRecipeClick} />

      <div className="space-y-4">
        <label className="block space-y-1 text-xs font-medium text-muted-foreground max-w-md">
          Search recipes
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, protein, tag…"
            className="min-h-11 w-full rounded-xl border border-border/30 bg-background px-3 text-sm text-foreground"
            data-testid="explore-catalog-search"
            autoComplete="off"
          />
        </label>

        <label className="block space-y-1 text-xs font-medium text-muted-foreground max-w-xs">
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CatalogSortMode)}
            className="min-h-11 w-full rounded-xl border border-border/30 bg-background px-3 text-sm text-foreground"
            data-testid="explore-catalog-sort"
          >
            {(Object.keys(SORT_LABELS) as CatalogSortMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {SORT_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>

        <FilterChipScroller>
          {PRIMARY_FILTERS.map((primary) => (
            <FilterChip
              key={primary}
              active={filters.primary === primary}
              onClick={() => {
                setFilters((prev) => ({ ...prev, primary }));
                trackExploreFilter({
                  filter_key: `primary:${primary}`,
                  filter_label: APPROVED_CATALOG_PRIMARY_LABELS[primary],
                  category: primary,
                });
              }}
              testId={`explore-primary-filter-${primary}`}
            >
              {APPROVED_CATALOG_PRIMARY_LABELS[primary]}
            </FilterChip>
          ))}
        </FilterChipScroller>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Category
            <select
              value={filters.category}
              onChange={(e) => {
                const category = e.target.value;
                setFilters((prev) => ({ ...prev, category }));
                if (category !== "all") {
                  trackExploreFilter({
                    filter_key: `category:${category}`,
                    filter_label: category,
                    category,
                  });
                }
              }}
              className="min-h-11 w-full rounded-xl border border-border/30 bg-background px-3 text-sm text-foreground"
              data-testid="explore-catalog-filter-category"
            >
              <option value="all">All categories</option>
              {facets.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Protein
            <select
              value={filters.protein}
              onChange={(e) => {
                const protein = e.target.value;
                setFilters((prev) => ({ ...prev, protein }));
                if (protein !== "all") {
                  trackExploreFilter({
                    filter_key: `protein:${protein}`,
                    filter_label: protein,
                  });
                }
              }}
              className="min-h-11 w-full rounded-xl border border-border/30 bg-background px-3 text-sm text-foreground"
              data-testid="explore-catalog-filter-protein"
            >
              <option value="all">All proteins</option>
              {facets.proteins.map((protein) => (
                <option key={protein.id} value={protein.id}>
                  {protein.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Cook time
            <select
              value={filters.cookTime}
              onChange={(e) => {
                const cookTime = e.target.value as ApprovedCatalogFilterState["cookTime"];
                setFilters((prev) => ({ ...prev, cookTime }));
                if (cookTime !== "all") {
                  trackExploreFilter({
                    filter_key: `cook_time:${cookTime}`,
                    filter_label: APPROVED_CATALOG_COOK_TIME_LABELS[cookTime],
                  });
                }
              }}
              className="min-h-11 w-full rounded-xl border border-border/30 bg-background px-3 text-sm text-foreground"
              data-testid="explore-catalog-filter-cook-time"
            >
              <option value="all">Any cook time</option>
              {COOK_TIME_FILTERS.map((bucket) => (
                <option key={bucket} value={bucket}>
                  {APPROVED_CATALOG_COOK_TIME_LABELS[bucket]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <FilterChipScroller>
          <FilterChip
            active={filters.highProtein}
            onClick={() => {
              setFilters((prev) => ({ ...prev, highProtein: !prev.highProtein }));
              trackExploreFilter({
                filter_key: "trait:high_protein",
                filter_label: "High protein",
              });
            }}
            testId="explore-catalog-trait-high-protein"
          >
            High protein
          </FilterChip>
          <FilterChip
            active={filters.lowCleanup}
            onClick={() => {
              setFilters((prev) => ({ ...prev, lowCleanup: !prev.lowCleanup }));
              trackExploreFilter({
                filter_key: "trait:low_cleanup",
                filter_label: "Low cleanup",
              });
            }}
            testId="explore-catalog-trait-low-cleanup"
          >
            Low cleanup
          </FilterChip>
        </FilterChipScroller>

        {hasActiveApprovedCatalogFilters(filters) && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-9 text-xs"
              onClick={resetFilters}
              data-testid="explore-catalog-clear-filters"
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div aria-busy="true">
          <RecipeGridSkeleton count={8} />
        </div>
      )}

      {error && !isLoading && (
        <div className="py-16 text-center" data-testid="explore-catalog-error">
          <p className="text-sm text-destructive">{(error as Error).message}</p>
          <Button variant="outline" className="mt-4 min-h-11" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          {filtered.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground tabular-nums" data-testid="explore-catalog-count">
                Showing {visibleRecipes.length} of {filtered.length} recipes
              </p>
              <ul
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4"
                data-testid="explore-catalog-grid"
              >
                {visibleRecipes.map((entry) => (
                  <li key={entry.slug} className="[content-visibility:auto]">
                    <ExploreCatalogCardBoundary
                      entry={entry}
                      onClick={() => handleRecipeClick(entry)}
                    >
                      <ApprovedCatalogCard
                        entry={entry}
                        onClick={() => handleRecipeClick(entry)}
                      />
                    </ExploreCatalogCardBoundary>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 px-8"
                    onClick={() => setVisibleCount((n) => n + pageSize)}
                    data-testid="explore-catalog-load-more"
                  >
                    Load more ({Math.min(pageSize, filtered.length - visibleCount)} more)
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center" data-testid="explore-catalog-empty">
              <p className="font-medium text-foreground">No meals match these filters</p>
              <Button variant="outline" className="mt-4 min-h-11" onClick={resetFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
