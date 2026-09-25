import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronDown, Lock } from "lucide-react";
import {
  APPROVED_CATALOG_COOK_TIME_LABELS,
  APPROVED_CATALOG_PRIMARY_LABELS,
  type ApprovedCatalogCookTimeBucket,
  type ApprovedCatalogPrimaryFilter,
} from "@shared/approved-catalog";
import { DIETARY_FILTER_KEYS, DIETARY_FILTER_LABELS } from "@shared/dietary/schema";
import { FOOD_PREFERENCE_DEFINITIONS } from "@shared/ingredient-preferences/definitions";
import { FilterChip, FilterChipScroller } from "@/components/mobile/filter-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  hasActiveApprovedCatalogFilters,
  hasActiveNumericNutritionFilter,
  buildApprovedCatalogFacetOptions,
  type ApprovedCatalogFilterState,
} from "@/lib/approved-catalog-filters";
import { trackExploreFilter, trackProFeatureClicked } from "@/lib/analytics";
import { useFeature, useRecordPaywallView } from "@/lib/billing/hooks";
import { useAuth } from "@/lib/auth/context";

/**
 * Only Pro-gated Explore discovery filters (monetization validation).
 * Basic dietary filtering (Gluten-Free, Dairy-Free, etc.) is free — it's
 * baseline recipe discovery, not the "advanced meal matching" Pro sells.
 * Gated behind the existing `advanced_search` PLUS_FEATURES flag:
 *   - "High protein" preset (unchanged — canonical >=35g/serving threshold)
 *   - "Nutrition targets" numeric controls (min protein / max calories /
 *     max carbs / max fat) — Firehall Meals Pro V1's advanced meal matching.
 * Free users can see both controls exist but cannot apply them — clicking
 * either routes to the existing Pro upgrade flow instead.
 */

type NumericNutritionField = "minProtein" | "maxCalories" | "maxCarbs" | "maxFat";

function NutritionNumberField({
  label,
  value,
  onChange,
  placeholder,
  testId,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  placeholder: string;
  testId: string;
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-muted-foreground">
      {label}
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw.trim() === "") {
            onChange(null);
            return;
          }
          const n = Number(raw);
          onChange(Number.isFinite(n) && n >= 0 ? Math.round(n) : null);
        }}
        placeholder={placeholder}
        className="min-h-11 rounded-xl border-border/30 bg-background"
        data-testid={testId}
      />
    </label>
  );
}

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
  const hasProFilters = useFeature("advanced_search");
  const hasFoodPreferences = useFeature("ingredient_preferences");
  const { authenticated } = useAuth();
  const recordPaywall = useRecordPaywallView();
  const [, setLocation] = useLocation();
  const [nutritionOpen, setNutritionOpen] = useState(() => hasActiveNumericNutritionFilter(filters));
  const [avoidOpen, setAvoidOpen] = useState(() => filters.avoidIngredients.length > 0);

  const setNumericFilter = (field: NumericNutritionField, next: number | null) => {
    setFilters({ ...filters, [field]: next });
    if (next != null) {
      trackExploreFilter({
        filter_key: `nutrition:${field}`,
        filter_label: `${field}=${next}`,
      });
    }
  };

  const activeNumericCount = (
    ["minProtein", "maxCalories", "maxCarbs", "maxFat"] as NumericNutritionField[]
  ).filter((key) => filters[key] != null).length;

  const requestProFilter = (filterKey: string, billingFeature: "advanced_search" | "ingredient_preferences" = "advanced_search") => {
    trackProFeatureClicked({ feature: filterKey, page: "/explore", logged_in: authenticated });
    void recordPaywall(billingFeature, "explore_filter");
    // Carry the source feature through to the plans page via a plain query
    // param — the simplest existing mechanism (no new attribution infra) — so
    // the Pro offer and any resulting plan-selection/upgrade-interest events
    // can attribute back to "High Protein" instead of losing that context.
    // Navigates straight to /me/subscription (not /plans) because /plans is a
    // <Redirect> shim that drops query strings on the hop.
    setLocation(`/me/subscription?feature=${encodeURIComponent(filterKey)}`);
  };

  const toggleAvoidIngredient = (key: string) => {
    const active = filters.avoidIngredients.includes(key);
    const next = active
      ? filters.avoidIngredients.filter((k) => k !== key)
      : [...filters.avoidIngredients, key];
    setFilters({ ...filters, avoidIngredients: next });
    trackExploreFilter({
      filter_key: `avoid:${key}`,
      filter_label: `avoid=${key}`,
    });
  };

  const activeAvoidCount = filters.avoidIngredients.length;

  const proBadge = (
    <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
      <Lock className="h-2.5 w-2.5" aria-hidden />
      Pro
    </span>
  );

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
            if (!hasProFilters) {
              requestProFilter("high_protein");
              return;
            }
            setFilters({ ...filters, highProtein: !filters.highProtein });
            trackExploreFilter({
              filter_key: "trait:high_protein",
              filter_label: "High protein",
            });
          }}
          testId="explore-catalog-trait-high-protein"
        >
          High protein
          {!hasProFilters ? proBadge : null}
        </FilterChip>
        <FilterChip
          active={filters.lowCarb}
          onClick={() => {
            setFilters({ ...filters, lowCarb: !filters.lowCarb });
            trackExploreFilter({
              filter_key: "trait:low_carb",
              filter_label: "Low carb",
            });
          }}
          testId="explore-catalog-trait-low-carb"
        >
          Low carb
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

      {hasProFilters ? (
        <Collapsible open={nutritionOpen} onOpenChange={setNutritionOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border/30 bg-background px-3.5 text-sm font-medium touch-manipulation"
              data-testid="explore-catalog-nutrition-toggle"
            >
              <span>
                Nutrition targets
                {activeNumericCount > 0 ? ` (${activeNumericCount})` : ""}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${nutritionOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent
            className="grid grid-cols-2 gap-3 pt-3"
            data-testid="explore-catalog-nutrition-fields"
          >
            <NutritionNumberField
              label="Min protein (g)"
              value={filters.minProtein}
              onChange={(v) => setNumericFilter("minProtein", v)}
              placeholder="e.g. 40"
              testId="explore-catalog-filter-min-protein"
            />
            <NutritionNumberField
              label="Max calories"
              value={filters.maxCalories}
              onChange={(v) => setNumericFilter("maxCalories", v)}
              placeholder="e.g. 700"
              testId="explore-catalog-filter-max-calories"
            />
            <NutritionNumberField
              label="Max carbs (g)"
              value={filters.maxCarbs}
              onChange={(v) => setNumericFilter("maxCarbs", v)}
              placeholder="e.g. 60"
              testId="explore-catalog-filter-max-carbs"
            />
            <NutritionNumberField
              label="Max fat (g)"
              value={filters.maxFat}
              onChange={(v) => setNumericFilter("maxFat", v)}
              placeholder="e.g. 25"
              testId="explore-catalog-filter-max-fat"
            />
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <button
          type="button"
          onClick={() => requestProFilter("nutrition_targets")}
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border/30 bg-background px-3.5 text-sm font-medium text-muted-foreground touch-manipulation"
          data-testid="explore-catalog-nutrition-locked"
        >
          <span>Nutrition targets</span>
          {proBadge}
        </button>
      )}

      {hasFoodPreferences ? (
        <Collapsible open={avoidOpen} onOpenChange={setAvoidOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border/30 bg-background px-3.5 text-sm font-medium touch-manipulation"
              data-testid="explore-catalog-avoid-toggle"
            >
              <span>
                Foods to avoid
                {activeAvoidCount > 0 ? ` (${activeAvoidCount})` : ""}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${avoidOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1.5 pt-3" data-testid="explore-catalog-avoid-fields">
            <p className="text-xs text-muted-foreground/80">
              Tell us what you'd rather not see in your meals — a personal preference, not an
              allergen guarantee. For food-safety needs, use the Dietary filters below.
            </p>
            <FilterChipScroller>
              {FOOD_PREFERENCE_DEFINITIONS.map((def) => (
                <FilterChip
                  key={def.key}
                  active={filters.avoidIngredients.includes(def.key)}
                  onClick={() => toggleAvoidIngredient(def.key)}
                  testId={`explore-catalog-avoid-${def.key}`}
                >
                  {def.label}
                </FilterChip>
              ))}
            </FilterChipScroller>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <button
          type="button"
          onClick={() => requestProFilter("foods_to_avoid", "ingredient_preferences")}
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border/30 bg-background px-3.5 text-sm font-medium text-muted-foreground touch-manipulation"
          data-testid="explore-catalog-avoid-locked"
        >
          <span>Foods to avoid</span>
          {proBadge}
        </button>
      )}

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
  if (filters.lowCarb) n++;
  if (filters.lowCleanup) n++;
  n += filters.dietary.length;
  if (filters.minProtein != null) n++;
  if (filters.maxCalories != null) n++;
  if (filters.maxCarbs != null) n++;
  if (filters.maxFat != null) n++;
  n += filters.avoidIngredients.length;
  return n;
}
