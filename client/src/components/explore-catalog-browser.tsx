import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Flame } from "lucide-react";
import {
  APPROVED_CATALOG_COOK_TIME_LABELS,
  APPROVED_CATALOG_PRIMARY_LABELS,
  type ApprovedCatalogEntry,
  type ApprovedCatalogCookTimeBucket,
  type ApprovedCatalogPrimaryFilter,
} from "@shared/approved-catalog";
import { cn } from "@/lib/utils";
import { FoodImage } from "@/components/mobile/food-image";
import { FilterChip, FilterChipScroller } from "@/components/mobile/filter-chips";
import { Button } from "@/components/ui/button";
import { approvedCatalogQueryKey, fetchApprovedCatalog } from "@/lib/approved-catalog-api";
import {
  buildApprovedCatalogFacetOptions,
  DEFAULT_APPROVED_CATALOG_FILTERS,
  filterApprovedCatalogEntries,
  hasActiveApprovedCatalogFilters,
  type ApprovedCatalogFilterState,
} from "@/lib/approved-catalog-filters";
import { RecipeGridSkeleton } from "@/components/mobile/loading-skeletons";

const PRIMARY_FILTERS: ApprovedCatalogPrimaryFilter[] = [
  "all",
  "healthy",
  "bbq_grill",
  "smoothies",
];

const COOK_TIME_FILTERS: ApprovedCatalogCookTimeBucket[] = ["under_30", "30_to_60", "over_60"];

function CatalogImagePlaceholder({ title }: { title: string }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Flame className="h-9 w-9 text-primary/30" aria-hidden />
      <p className="line-clamp-2 px-3 text-center text-[11px] font-medium text-white/50">{title}</p>
    </div>
  );
}

function ApprovedCatalogCard({
  entry,
  onClick,
}: {
  entry: ApprovedCatalogEntry;
  onClick: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const imageSrc = entry.thumbImage || entry.heroImage;
  const showImage = Boolean(imageSrc) && !imgFailed;

  return (
    <article
      className={cn(
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-card/30 ring-1 ring-border/15",
        "transition-all hover:ring-primary/25 hover:shadow-lg hover:shadow-black/10",
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
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
        {showImage ? (
          <FoodImage
            src={imageSrc}
            alt={entry.title}
            layout="card-fill"
            fit="cover"
            focal="center"
            overlay="none"
            cinematicGrade
            rounded="none"
            onError={() => {
              setImgFailed(true);
              return true;
            }}
          />
        ) : (
          <CatalogImagePlaceholder title={entry.title} />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
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
}

export interface ExploreCatalogBrowserProps {
  onRecipeClick: (slug: string) => void;
  className?: string;
}

export function ExploreCatalogBrowser({ onRecipeClick, className }: ExploreCatalogBrowserProps) {
  const [filters, setFilters] = useState<ApprovedCatalogFilterState>(
    DEFAULT_APPROVED_CATALOG_FILTERS,
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: approvedCatalogQueryKey,
    queryFn: fetchApprovedCatalog,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const facets = useMemo(
    () => buildApprovedCatalogFacetOptions(data?.recipes ?? []),
    [data?.recipes],
  );

  const filtered = useMemo(
    () => filterApprovedCatalogEntries(data?.recipes ?? [], filters),
    [data?.recipes, filters],
  );

  const resetFilters = () => setFilters(DEFAULT_APPROVED_CATALOG_FILTERS);

  return (
    <section className={cn("space-y-6", className)} data-testid="explore-catalog-browser">
      <div className="space-y-4">
        <FilterChipScroller>
          {PRIMARY_FILTERS.map((primary) => (
            <FilterChip
              key={primary}
              active={filters.primary === primary}
              onClick={() => setFilters((prev) => ({ ...prev, primary }))}
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
              onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
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
              onChange={(e) => setFilters((prev) => ({ ...prev, protein: e.target.value }))}
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
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  cookTime: e.target.value as ApprovedCatalogFilterState["cookTime"],
                }))
              }
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
            onClick={() => setFilters((prev) => ({ ...prev, highProtein: !prev.highProtein }))}
            testId="explore-catalog-trait-high-protein"
          >
            High protein
          </FilterChip>
          <FilterChip
            active={filters.lowCleanup}
            onClick={() => setFilters((prev) => ({ ...prev, lowCleanup: !prev.lowCleanup }))}
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
            <ul
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4"
              data-testid="explore-catalog-grid"
            >
              {filtered.map((entry) => (
                <li key={entry.slug}>
                  <ApprovedCatalogCard
                    entry={entry}
                    onClick={() => onRecipeClick(entry.slug)}
                  />
                </li>
              ))}
            </ul>
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
