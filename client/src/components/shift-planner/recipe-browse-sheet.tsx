import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Search } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/loading-state";
import { approvedCatalogGridQueryKey, fetchApprovedCatalogGrid } from "@/lib/approved-catalog-api";
import { DEFAULT_APPROVED_CATALOG_FILTERS, filterApprovedCatalogEntries } from "@/lib/approved-catalog-filters";
import { cacheSafeImageUrl } from "@shared/editorial-image-delivery";
import { slotSelectionProfile } from "@shared/shift-plan/plan";
import type { ApprovedCatalogGridEntry } from "@shared/approved-catalog";
import type { DietaryFilterKey } from "@shared/dietary/schema";
import type { PlannedMealSlot } from "@shared/shift-plan/types";

const SHEET_CLASS = "h-[88dvh] flex flex-col rounded-t-2xl sm:mx-auto sm:max-w-lg";
const MAX_RESULTS = 40;

/**
 * Manual recipe pick for one meal. Only recipes that pass the user's
 * dietary restrictions / allergens / foods to avoid are listed — the same
 * filter Explore uses. Breakfast slots list breakfasts first.
 */
export function RecipeBrowseSheet({
  slot,
  dietary,
  avoidIngredients,
  onClose,
  onSelect,
}: {
  slot: PlannedMealSlot | null;
  dietary: DietaryFilterKey[];
  avoidIngredients: string[];
  onClose: () => void;
  onSelect: (slot: PlannedMealSlot, entry: ApprovedCatalogGridEntry) => void;
}) {
  const [query, setQuery] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: approvedCatalogGridQueryKey,
    queryFn: fetchApprovedCatalogGrid,
    enabled: slot != null,
    staleTime: 10 * 60_000,
  });

  const eligible = useMemo(
    () =>
      filterApprovedCatalogEntries(data?.recipes ?? [], {
        ...DEFAULT_APPROVED_CATALOG_FILTERS,
        dietary,
        avoidIngredients,
      }),
    [data, dietary, avoidIngredients],
  );

  const results = useMemo(() => {
    if (!slot) return [];
    const wantsBreakfast = slotSelectionProfile(slot).mealType === "breakfast";
    const q = query.trim().toLowerCase();
    const matches = q
      ? eligible.filter((e) => e.searchText.toLowerCase().includes(q) || e.title.toLowerCase().includes(q))
      : eligible.filter((e) => !e.isSmoothie);
    const fits = (e: ApprovedCatalogGridEntry) => (e.mealFormat === "breakfast") === wantsBreakfast;
    return [...matches.filter(fits), ...matches.filter((e) => !fits(e))].slice(0, MAX_RESULTS);
  }, [eligible, query, slot]);

  return (
    <Sheet
      open={slot != null}
      onOpenChange={(open) => {
        if (!open) {
          setQuery("");
          onClose();
        }
      }}
    >
      <SheetContent side="bottom" className={SHEET_CLASS} data-testid="sheet-recipe-browse">
        <SheetHeader className="text-left">
          <SheetTitle>Choose {slot?.label.toLowerCase()}</SheetTitle>
          <SheetDescription>Your pick stays locked when you auto-fill.</SheetDescription>
        </SheetHeader>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes"
            className="min-h-11 pl-9"
            aria-label="Search recipes"
            data-testid="input-recipe-search"
          />
        </div>
        <div className="-mx-2 mt-3 flex-1 overflow-y-auto px-2">
          {isLoading ? (
            <LoadingState variant="compact" />
          ) : isError ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Couldn't load recipes. Try again.</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No recipes match.</p>
          ) : (
            <ul className="space-y-1" data-testid="list-browse-results">
              {results.map((entry) => (
                <li key={entry.slug}>
                  <button
                    type="button"
                    onClick={() => slot && onSelect(slot, entry)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
                    data-testid={`browse-recipe-${entry.slug}`}
                  >
                    <img
                      src={entry.thumbImage ? cacheSafeImageUrl(entry.thumbImage, entry.thumbCacheVersion) : undefined}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-12 w-12 shrink-0 rounded-lg bg-muted/40 object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{entry.title}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden />
                        {entry.cookTime} min · {entry.categoryLabel}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
