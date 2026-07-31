import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Clock, Flame, SlidersHorizontal, AlertTriangle } from "lucide-react";
import {
  approvedCatalogRecipePath,
  type ApprovedCatalogGridEntry,
} from "@shared/approved-catalog";
import { MissingRecipeImagePlaceholder } from "@/components/missing-recipe-image-placeholder";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  approvedCatalogGridQueryKey,
  fetchApprovedCatalogGrid,
} from "@/lib/approved-catalog-api";
import { ExploreCatalogCardBoundary } from "@/components/explore-catalog-card-boundary";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchRecipeRatingSortMap } from "@/lib/recipe-crew-ratings-api";
import { ExploreRatingCollections } from "@/components/explore-rating-collections";
import {
  DEFAULT_APPROVED_CATALOG_FILTERS,
  buildApprovedCatalogFacetOptions,
  filterApprovedCatalogEntries,
  type ApprovedCatalogFilterState,
} from "@/lib/approved-catalog-filters";
import { RecipeGridSkeleton } from "@/components/mobile/loading-skeletons";
import { trackExploreRecipeClick, trackSearch } from "@/lib/analytics";
import { exploreCardImageCandidates, exploreCatalogPageSize } from "@/lib/explore-card-image";
import { EXPLORE_CATALOG_PAGE_SIZE_MOBILE } from "@/lib/explore-mobile-page-size";
import type { RecipeRatingSortMap } from "@/lib/recipe-crew-ratings-api";
import {
  ExploreCatalogFilters,
  countActiveCatalogFilters,
  type CatalogSortMode,
} from "@/components/explore-catalog-filters";
import {
  buildExploreBrowseSearch,
  parseExploreBrowseSearch,
} from "@shared/browse-canonical";

export { EXPLORE_CATALOG_PAGE_SIZE_MOBILE as EXPLORE_CATALOG_PAGE_SIZE };
export type { CatalogSortMode };

function applyBrowsePatch(
  base: ApprovedCatalogFilterState,
  patch: ReturnType<typeof parseExploreBrowseSearch>,
): ApprovedCatalogFilterState {
  return {
    primary: patch.primary ?? base.primary,
    category: patch.category ?? base.category,
    protein: patch.protein ?? base.protein,
    cookTime: patch.cookTime ?? base.cookTime,
    highProtein: patch.highProtein ?? base.highProtein,
    lowCarb: patch.lowCarb ?? base.lowCarb,
    lowCleanup: patch.lowCleanup ?? base.lowCleanup,
    dietary: patch.dietary ?? base.dietary,
  };
}

function sortMetricForMode(
  sort: CatalogSortMode,
  entry: RecipeRatingSortMap[string] | undefined,
): number {
  if (sort === "most_popular" || sort === "most_votes") return entry?.totalVotes ?? 0;
  if (sort === "highest_rated") return entry?.approvalScore ?? 0;
  if (sort === "trending") return entry?.trendingScore ?? 0;
  return 0;
}

/** True once at least one visible recipe has real signal for this sort mode. */
function sortModeHasSignal(
  rows: ApprovedCatalogGridEntry[],
  sort: CatalogSortMode,
  sortMap: RecipeRatingSortMap | undefined,
): boolean {
  if (sort === "curated" || !sortMap) return true;
  return rows.some((row) => sortMetricForMode(sort, sortMap[row.slug]) > 0);
}

function sortCatalogEntries(
  rows: ApprovedCatalogGridEntry[],
  sort: CatalogSortMode,
  sortMap: RecipeRatingSortMap | undefined,
): ApprovedCatalogGridEntry[] {
  if (sort === "curated" || !sortMap || !sortModeHasSignal(rows, sort, sortMap)) {
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

/** Thumb grid — explicit dimensions for Safari decode budget */
const EXPLORE_CARD_IMG_WIDTH = 200;
const EXPLORE_CARD_IMG_HEIGHT = 200;

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
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl bg-card/30 ring-1 ring-border/15",
        "transition-transform duration-150 ease-out touch-manipulation active:scale-[0.98]",
        "md:rounded-2xl md:hover:ring-primary/25",
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
        className="relative aspect-square overflow-hidden bg-zinc-950 md:aspect-[4/5]"
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
            sizes="(max-width: 768px) 44vw, 240px"
            className="absolute inset-0 h-full w-full object-cover object-center [transform:translateZ(0)]"
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

      <div className="flex flex-1 flex-col gap-0.5 p-2 md:gap-1.5 md:p-3">
        <h3 className="line-clamp-2 font-heading text-xs font-medium leading-snug md:text-sm md:group-hover:text-primary">
          {entry.title}
        </h3>
        <p className="mt-auto flex items-center gap-1 text-[10px] capitalize text-muted-foreground md:gap-1.5 md:text-xs">
          <span className="truncate">{entry.categoryLabel}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums md:gap-1">
            <Clock className="h-2.5 w-2.5 opacity-70 md:h-3 md:w-3" aria-hidden />
            {entry.cookTime}m
          </span>
        </p>
      </div>
    </article>
  );
});

function CatalogRecipeGrid({
  visibleRecipes,
  filteredCount,
  hasMore,
  pageSize,
  onLoadMore,
  onRecipeClick,
  compactCount,
}: {
  visibleRecipes: ApprovedCatalogGridEntry[];
  filteredCount: number;
  hasMore: boolean;
  pageSize: number;
  onLoadMore: () => void;
  onRecipeClick: (entry: ApprovedCatalogGridEntry) => void;
  compactCount?: boolean;
}) {
  return (
    <>
      <p
        className={cn(
          "text-xs text-muted-foreground tabular-nums",
          compactCount && "sr-only md:not-sr-only",
        )}
        data-testid="explore-catalog-count"
      >
        Showing {visibleRecipes.length} of {filteredCount} recipes
      </p>
      <ul
        className="explore-mobile-grid grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4 stagger-fade motion-reduce:[&>*]:!animate-none"
        data-testid="explore-catalog-grid"
      >
        {visibleRecipes.map((entry) => (
          <li
            key={entry.slug}
            className="[content-visibility:auto] [contain-intrinsic-size:200px_260px]"
          >
            <ExploreCatalogCardBoundary entry={entry} onClick={() => onRecipeClick(entry)}>
              <ApprovedCatalogCard entry={entry} onClick={() => onRecipeClick(entry)} />
            </ExploreCatalogCardBoundary>
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 px-8 touch-manipulation"
            onClick={onLoadMore}
            data-testid="explore-catalog-load-more"
          >
            Load more ({Math.min(pageSize, filteredCount - visibleRecipes.length)} more)
          </Button>
        </div>
      )}
    </>
  );
}

export interface ExploreCatalogBrowserProps {
  onRecipeClick: (slug: string) => void;
  className?: string;
  totalRecipeCount?: number;
}

export function ExploreCatalogBrowser({
  onRecipeClick,
  className,
  totalRecipeCount,
}: ExploreCatalogBrowserProps) {
  const isMobile = useIsMobile();
  const pageSize = exploreCatalogPageSize(isMobile);
  const [location, setLocation] = useLocation();

  const initialPatch = useMemo(
    () => parseExploreBrowseSearch(typeof window !== "undefined" ? window.location.search : ""),
    [],
  );

  const [filters, setFilters] = useState<ApprovedCatalogFilterState>(() =>
    applyBrowsePatch(DEFAULT_APPROVED_CATALOG_FILTERS, initialPatch),
  );
  const [sort, setSort] = useState<CatalogSortMode>("curated");
  const [searchInput, setSearchInput] = useState(initialPatch.search ?? "");
  const [searchQuery, setSearchQuery] = useState((initialPatch.search ?? "").trim().toLowerCase());
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const skipUrlSync = useRef(true);

  useEffect(() => {
    const patch = parseExploreBrowseSearch(window.location.search);
    setFilters(applyBrowsePatch(DEFAULT_APPROVED_CATALOG_FILTERS, patch));
    const nextSearch = patch.search ?? "";
    setSearchInput(nextSearch);
    setSearchQuery(nextSearch.trim().toLowerCase());
    skipUrlSync.current = true;
  }, [location]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (skipUrlSync.current) {
      skipUrlSync.current = false;
      return;
    }
    const qs = buildExploreBrowseSearch({
      primary: filters.primary,
      category: filters.category,
      protein: filters.protein,
      cookTime: filters.cookTime,
      highProtein: filters.highProtein,
      lowCarb: filters.lowCarb,
      lowCleanup: filters.lowCleanup,
      searchQuery,
      dietary: filters.dietary,
    });
    const next = `/explore${qs}`;
    if (location !== next) {
      setLocation(next, { replace: true });
    }
  }, [filters, searchQuery, location, setLocation]);

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

  const facetOptions = useMemo(
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

  const sortHasSignal = useMemo(
    () => sortModeHasSignal(filterApprovedCatalogEntries(data?.recipes ?? [], filters), sort, sortMap),
    [data?.recipes, filters, sort, sortMap],
  );

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
  const activeFilterCount = countActiveCatalogFilters(filters);

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

  const filterPanel = (
    <ExploreCatalogFilters
      filters={filters}
      sort={sort}
      facets={facetOptions}
      onFiltersChange={setFilters}
      onSortChange={setSort}
      onReset={resetFilters}
      layout={isMobile ? "sheet" : "inline"}
      sortHasSignal={sortHasSignal}
    />
  );

  const gridBlock = (
    <>
      {isLoading && (
        <div aria-busy="true">
          <RecipeGridSkeleton count={isMobile ? 6 : 8} />
        </div>
      )}

      {error && !isLoading && (
        <div className="py-16 text-center fade-up" data-testid="explore-catalog-error">
          <div className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <div className="absolute inset-0 rounded-full bg-destructive/5 animate-ping motion-reduce:animate-none" style={{ animationDuration: "3s" }} />
            <AlertTriangle className="h-6 w-6 text-destructive/70" aria-hidden />
          </div>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          <Button variant="outline" className="mt-4 min-h-11" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          {filtered.length > 0 ? (
            <CatalogRecipeGrid
              visibleRecipes={visibleRecipes}
              filteredCount={filtered.length}
              hasMore={hasMore}
              pageSize={pageSize}
              onLoadMore={() => setVisibleCount((n) => n + pageSize)}
              onRecipeClick={handleRecipeClick}
              compactCount={isMobile}
            />
          ) : (
            <div className="py-16 text-center" data-testid="explore-catalog-empty">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
                <Flame className="h-6 w-6 text-muted-foreground/70" aria-hidden />
              </div>
              <p className="font-medium text-foreground">Nothing's matching that search</p>
              <p className="mt-1 text-sm text-muted-foreground">Try clearing a filter or two.</p>
              <Button variant="outline" className="mt-4 min-h-11" onClick={resetFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <section className={cn("space-y-3 md:space-y-6", className)} data-testid="explore-catalog-browser">
      {!isMobile && <ExploreRatingCollections onRecipeClick={onRecipeClick} />}

      <div
        className={cn(
          "sticky z-40 -mx-[var(--page-padding,1rem)] border-b border-border/20 bg-background/92 px-[var(--page-padding,1rem)] py-2 backdrop-blur-md md:hidden",
        )}
        style={{ top: "calc(3rem + env(safe-area-inset-top, 0px))" }}
        data-testid="explore-catalog-mobile-toolbar"
      >
        <div className="flex gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={
              totalRecipeCount != null
                ? `Search ${filtered.length} recipes…`
                : "Search recipes…"
            }
            className="min-h-11 flex-1 rounded-xl border border-border/30 bg-background px-3.5 text-[15px] text-foreground touch-manipulation"
            data-testid="explore-catalog-search"
            autoComplete="off"
            enterKeyHint="search"
            aria-label="Search recipes"
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11 min-w-11 shrink-0 gap-1.5 px-3 touch-manipulation"
            onClick={() => setFiltersOpen(true)}
            data-testid="explore-catalog-filter-open"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            <span className="sr-only sm:not-sr-only sm:text-xs">Filter</span>
            {activeFilterCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      <div className="hidden md:block space-y-4">
        <label className="block space-y-1 text-xs font-medium text-muted-foreground max-w-md">
          Search recipes
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, protein, tag…"
            className="min-h-11 w-full rounded-xl border border-border/30 bg-background px-3.5 text-sm text-foreground"
            data-testid="explore-catalog-search-desktop"
            autoComplete="off"
          />
        </label>
        {filterPanel}
      </div>

      {gridBlock}

      {isMobile && (
        <ExploreRatingCollections onRecipeClick={onRecipeClick} className="pt-6" />
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[min(88dvh,720px)] overflow-y-auto scroll-momentum rounded-t-2xl pb-safe"
          data-testid="explore-catalog-filter-sheet"
        >
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="font-heading tracking-wide">Filter recipes</SheetTitle>
          </SheetHeader>
          {filterPanel}
          <div className="sticky bottom-0 pt-4 pb-2 bg-background">
            <Button
              type="button"
              className="w-full min-h-11 touch-manipulation"
              onClick={() => setFiltersOpen(false)}
              data-testid="explore-catalog-filter-apply"
            >
              Show {filtered.length} recipes
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
