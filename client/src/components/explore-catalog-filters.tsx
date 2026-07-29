import {
  APPROVED_CATALOG_COOK_TIME_LABELS,
  APPROVED_CATALOG_PRIMARY_LABELS,
  type ApprovedCatalogCookTimeBucket,
  type ApprovedCatalogPrimaryFilter,
} from "@shared/approved-catalog";
import { DIETARY_FILTER_KEYS, DIETARY_FILTER_LABELS } from "@shared/dietary/schema";
import { FilterChip, FilterChipScroller } from "@/components/mobile/filter-chips";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  hasActiveApprovedCatalogFilters,
  buildApprovedCatalogFacetOptions,
  type ApprovedCatalogFilterState,
} from "@/lib/approved-catalog-filters";
import { trackExploreFilter } from "@/lib/analytics";

export type CatalogSortMode =
  | "curated"
  | "most_popular"
  | "highest_rated"
  | "most_votes"
  | "trending";

type ApprovedCatalogFacetOptions = ReturnType<typeof buildApprovedCatalogFacetOptions>;

const PRIMARY_FILTERS: ApprovedCatalogPrimaryFilter[] = [
  "all",
  "healthy",
  "bbq_grill",
  "smoothies",
];

const COOK_TIME_FILTERS: ApprovedCatalogCookTimeBucket[] = ["under_30", "30_to_60", "over_60"];

const SORT_LABELS: Record<CatalogSortMode, string> = {
  curated: "Curated",
  most_popular: "Most Popular",
  highest_rated: "Highest Rated",
  most_votes: "Most Votes",
  trending: "Trending",
};

export interface ExploreCatalogFiltersProps {
  filters: ApprovedCatalogFilterState;
  sort: CatalogSortMode;
  facets: ApprovedCatalogFacetOptions;
  onFiltersChange: (next: ApprovedCatalogFilterState) => void;
  onSortChange: (sort: CatalogSortMode) => void;
  onReset: () => void;
  layout?: "inline" | "sheet";
  /** False once the selected sort has no real crew data yet — shows a fallback note. */
  sortHasSignal?: boolean;
}

export function ExploreCatalogFilters({
  filters,
  sort,
  facets,
  onFiltersChange,
  onSortChange,
  onReset,
  layout = "inline",
  sortHasSignal = true,
}: ExploreCatalogFiltersProps) {
  const setFilters = onFiltersChange;
  const stackClass = layout === "sheet" ? "space-y-5" : "space-y-4";

  return (
    <div className={stackClass} data-testid="explore-catalog-filters">
      <label className="block space-y-1 text-xs font-medium text-muted-foreground max-w-xs">
        Sort by
        <Select value={sort} onValueChange={(value) => onSortChange(value as CatalogSortMode)}>
          <SelectTrigger
            className="min-h-11 w-full rounded-xl border-border/30 bg-background"
            data-testid="explore-catalog-sort"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as CatalogSortMode[]).map((mode) => (
              <SelectItem key={mode} value={mode}>
                {SORT_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sort !== "curated" && !sortHasSignal ? (
          <span className="block font-normal normal-case text-muted-foreground/80">
            Not enough crew votes yet — showing our curated order.
          </span>
        ) : null}
      </label>

      <FilterChipScroller>
        {PRIMARY_FILTERS.map((primary) => (
          <FilterChip
            key={primary}
            active={filters.primary === primary}
            onClick={() => {
              setFilters({ ...filters, primary });
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
          <Select
            value={filters.category}
            onValueChange={(category) => {
              setFilters({ ...filters, category });
              if (category !== "all") {
                trackExploreFilter({
                  filter_key: `category:${category}`,
                  filter_label: category,
                  category,
                });
              }
            }}
          >
            <SelectTrigger
              className="min-h-11 w-full rounded-xl border-border/30 bg-background"
              data-testid="explore-catalog-filter-category"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {facets.categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Protein
          <Select
            value={filters.protein}
            onValueChange={(protein) => {
              setFilters({ ...filters, protein });
              if (protein !== "all") {
                trackExploreFilter({
                  filter_key: `protein:${protein}`,
                  filter_label: protein,
                });
              }
            }}
          >
            <SelectTrigger
              className="min-h-11 w-full rounded-xl border-border/30 bg-background"
              data-testid="explore-catalog-filter-protein"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All proteins</SelectItem>
              {facets.proteins.map((protein) => (
                <SelectItem key={protein.id} value={protein.id}>
                  {protein.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Cook time
          <Select
            value={filters.cookTime}
            onValueChange={(cookTime) => {
              setFilters({
                ...filters,
                cookTime: cookTime as ApprovedCatalogFilterState["cookTime"],
              });
              if (cookTime !== "all") {
                trackExploreFilter({
                  filter_key: `cook_time:${cookTime}`,
                  filter_label:
                    APPROVED_CATALOG_COOK_TIME_LABELS[
                      cookTime as ApprovedCatalogCookTimeBucket
                    ],
                });
              }
            }}
          >
            <SelectTrigger
              className="min-h-11 w-full rounded-xl border-border/30 bg-background"
              data-testid="explore-catalog-filter-cook-time"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any cook time</SelectItem>
              {COOK_TIME_FILTERS.map((bucket) => (
                <SelectItem key={bucket} value={bucket}>
                  {APPROVED_CATALOG_COOK_TIME_LABELS[bucket]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <FilterChipScroller>
        <FilterChip
          active={filters.highProtein}
          onClick={() => {
            setFilters({ ...filters, highProtein: !filters.highProtein });
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
            setFilters({ ...filters, lowCleanup: !filters.lowCleanup });
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

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Dietary
          <span className="ml-1.5 font-normal normal-case text-muted-foreground/70">
            (only verified recipes shown — see recipe page for adaptable swaps)
          </span>
        </p>
        <FilterChipScroller>
          {DIETARY_FILTER_KEYS.map((key) => {
            const active = filters.dietary.includes(key);
            return (
              <FilterChip
                key={key}
                active={active}
                onClick={() => {
                  const next = active
                    ? filters.dietary.filter((k) => k !== key)
                    : [...filters.dietary, key];
                  setFilters({ ...filters, dietary: next });
                  trackExploreFilter({
                    filter_key: `dietary:${key}`,
                    filter_label: DIETARY_FILTER_LABELS[key],
                  });
                }}
                testId={`explore-catalog-dietary-${key}`}
              >
                {DIETARY_FILTER_LABELS[key]}
              </FilterChip>
            );
          })}
        </FilterChipScroller>
      </div>

      {hasActiveApprovedCatalogFilters(filters) && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-9 text-xs"
            onClick={onReset}
            data-testid="explore-catalog-clear-filters"
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}

export function countActiveCatalogFilters(filters: ApprovedCatalogFilterState): number {
  let n = 0;
  if (filters.primary !== "all") n++;
  if (filters.category !== "all") n++;
  if (filters.protein !== "all") n++;
  if (filters.cookTime !== "all") n++;
  if (filters.highProtein) n++;
  if (filters.lowCleanup) n++;
  n += filters.dietary.length;
  return n;
}
