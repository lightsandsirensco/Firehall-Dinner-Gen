import { useId, useRef, type KeyboardEvent } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CREW_BUCKET_LABELS,
  SIMPLIFIED_ALLERGEN_LABELS,
  SIMPLIFIED_DIET_LABELS,
  SIMPLIFIED_PROTEIN_LABELS,
  TONIGHT_MEAL_STYLE_LABELS,
  TONIGHT_TIME_WINDOW_LABELS,
  normalizeMealStyle,
  normalizeTimeWindow,
  type SimplifiedGeneratorFilters,
} from "@shared/generator-simplified";
import { SimplifiedGeneratorForm } from "@/components/generator/simplified-generator-form";

export function summarizeFilters(filters: SimplifiedGeneratorFilters): string[] {
  const time = TONIGHT_TIME_WINDOW_LABELS[normalizeTimeWindow(filters.time_window)];
  const style = normalizeMealStyle(filters.meal_style);
  const parts = [
    `Crew of ${CREW_BUCKET_LABELS[filters.crew_bucket]}`,
    /min|time/i.test(time) ? time : `${time} min`,
    filters.protein === "surprise" ? "Any protein" : SIMPLIFIED_PROTEIN_LABELS[filters.protein],
  ];
  if (style !== "any") parts.push(TONIGHT_MEAL_STYLE_LABELS[style]);
  parts.push(
    filters.allergens.length
      ? `No ${filters.allergens.map((a) => SIMPLIFIED_ALLERGEN_LABELS[a].toLowerCase()).join(", ")}`
      : "No allergies set",
  );
  if (filters.diets.length) parts.push(filters.diets.map((d) => SIMPLIFIED_DIET_LABELS[d]).join(", "));
  if (filters.foodsToAvoid.length) {
    parts.push(`Avoiding ${filters.foodsToAvoid.length} food${filters.foodsToAvoid.length === 1 ? "" : "s"}`);
  }
  return parts;
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

export type FilterChange = { restrictive: boolean };

/**
 * Compares the filters a meal was picked with against the current ones. `restrictive` means
 * the shown meal was never checked against something now required (new allergy, diet, avoided
 * food, or a removed appliance).
 */
export function compareFiltersToMeal(
  mealFilters: SimplifiedGeneratorFilters | null,
  current: SimplifiedGeneratorFilters,
): FilterChange | null {
  if (!mealFilters) return null;
  const changed =
    mealFilters.crew_bucket !== current.crew_bucket ||
    mealFilters.time_window !== current.time_window ||
    mealFilters.protein !== current.protein ||
    mealFilters.meal_style !== current.meal_style ||
    mealFilters.healthiness !== current.healthiness ||
    mealFilters.personalizeWithHistory !== current.personalizeWithHistory ||
    !sameSet(mealFilters.appliances, current.appliances) ||
    !sameSet(mealFilters.allergens, current.allergens) ||
    !sameSet(mealFilters.diets, current.diets) ||
    !sameSet(mealFilters.foodsToAvoid, current.foodsToAvoid);
  if (!changed) return null;
  const added = (before: readonly string[], after: readonly string[]) => after.some((x) => !before.includes(x));
  return {
    restrictive:
      added(mealFilters.allergens, current.allergens) ||
      added(mealFilters.diets, current.diets) ||
      added(mealFilters.foodsToAvoid, current.foodsToAvoid) ||
      added(current.appliances, mealFilters.appliances),
  };
}

type Props = {
  filters: SimplifiedGeneratorFilters;
  onChange: (filters: SimplifiedGeneratorFilters) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  hallName?: string | null;
  hallLinked: boolean;
  hasRecipe: boolean;
  isLoading: boolean;
  /** Set when the meal on screen was picked with different filters. */
  pendingChange: FilterChange | null;
  onApply: () => void;
};

export function GeneratorFiltersPanel({
  filters,
  onChange,
  expanded,
  onExpandedChange,
  hallName,
  hallLinked,
  hasRecipe,
  isLoading,
  pendingChange,
  onApply,
}: Props) {
  const regionId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const summary = summarizeFilters(filters);

  const collapse = () => {
    onExpandedChange(false);
    toggleRef.current?.focus();
  };

  const onRegionKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      collapse();
    }
  };

  return (
    <section
      id="filters-panel"
      aria-label="Meal filters"
      className="scroll-mt-20 rounded-xl border border-border/40 bg-card/50"
      data-testid="generator-filters-panel"
    >
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={() => onExpandedChange(!expanded)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 sm:px-4 text-left touch-manipulation hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="generator-filters-toggle"
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            Filters
            {hallName && <span className="truncate text-xs font-normal text-primary/90">· {hallName}</span>}
            {pendingChange && hasRecipe && (
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Not applied
              </span>
            )}
          </span>
          {!expanded && (
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground" data-testid="generator-filters-summary">
              {summary.join(" · ")}
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">{expanded ? "Done" : "Edit"}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
      </button>

      <div
        id={regionId}
        role="region"
        aria-label="All filter options"
        hidden={!expanded}
        onKeyDown={onRegionKeyDown}
        className="border-t border-border/30 px-3 pb-3 pt-3 sm:px-4 sm:pb-4"
      >
        {expanded && (
          <>
            <SimplifiedGeneratorForm
              filters={filters}
              onChange={onChange}
              onGenerate={onApply}
              onGenerateAnother={onApply}
              isLoading={isLoading}
              hasRecipe={hasRecipe}
              hallLinked={hallLinked}
              optionsOnly
            />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" className="min-h-11" onClick={collapse} data-testid="generator-filters-done">
                Done
              </Button>
              {hasRecipe && pendingChange && (
                <Button
                  type="button"
                  className="min-h-11"
                  onClick={() => {
                    onExpandedChange(false);
                    onApply();
                  }}
                  disabled={isLoading}
                  data-testid="generator-filters-apply"
                >
                  Pick with new filters
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function FilterChangeNotice({
  change,
  onApply,
  isLoading,
}: {
  change: FilterChange;
  onApply: () => void;
  isLoading: boolean;
}) {
  return (
    <div
      role={change.restrictive ? "alert" : "status"}
      className={cn(
        "mb-3 flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between",
        change.restrictive
          ? "border-amber-500/50 bg-amber-500/10 text-foreground"
          : "border-border/40 bg-muted/30 text-muted-foreground",
      )}
      data-testid={change.restrictive ? "filter-change-warning" : "filter-change-note"}
    >
      <p className="leading-snug">
        {change.restrictive
          ? "This meal was picked before your new allergy, diet or equipment settings and may not fit them. Pick again before cooking."
          : "Filters changed. This meal is from your earlier settings."}
      </p>
      <Button
        type="button"
        size="sm"
        variant={change.restrictive ? "default" : "outline"}
        className="min-h-10 shrink-0"
        onClick={onApply}
        disabled={isLoading}
        data-testid="filter-change-apply"
      >
        Pick with new filters
      </Button>
    </div>
  );
}
