/**
 * Shift Planner — consolidated grocery list + estimated cost.
 *
 * Turns every "ready" meal slot into ONE combined shopping list by reusing
 * the existing Smart Shopping engine (shared/shopping) exactly as the rest
 * of the app does — same duplicate-combining, unit-aware merging, and
 * department grouping. No new grocery/combining logic here.
 *
 * Cost uses the existing deterministic pricing engine (shared/pricing)
 * per-recipe, then sums those already-rounded ranges — never re-derives or
 * invents a price. Pantry subtraction is intentionally NOT wired in (no
 * `pantry` argument passed to the shopping engine) — every item is shown as
 * "still need to buy."
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addRecipeToSession,
  clientRecipeToShoppingInput,
  createShoppingSession,
  formatShoppingItemQuantity,
  groupByDepartment,
  removeRecipeFromSession,
  toggleItemChecked,
  type ShoppingSession,
} from "@shared/shopping";
import {
  estimateRecipeCost,
  aggregateRecipeCostEstimates,
  formatAggregatedTotalRange,
  formatAggregatedPerPersonRange,
  type LocationQuery,
} from "@shared/pricing";
import type { ClientRecipeResponse } from "@shared/schema";
import type { MealOccasion } from "@shared/shift-planner/occasions";
import { app } from "@/lib/design-tokens";
import { useMeasurementSystem } from "@/lib/measurement-preference";
import { cn } from "@/lib/utils";

interface ShiftGroceryListProps {
  /** Only "ready" (fully loaded) slots — occasion doubles as a stable per-slot id so "Replace this meal" updates in place instead of duplicating. */
  recipes: { occasion: MealOccasion; recipe: ClientRecipeResponse }[];
  crewSize: number;
  location: LocationQuery;
}

export function ShiftGroceryList({ recipes, crewSize, location }: ShiftGroceryListProps) {
  const [measurementSystem] = useMeasurementSystem();
  const [session, setSession] = useState<ShoppingSession>(() => createShoppingSession());
  const presentSlugs = useRef<Set<string>>(new Set());

  // Incrementally sync the session to whatever occasions are currently ready
  // — add/update each ready recipe, drop any that are no longer selected.
  // Using the same occasion-derived slug across a "Replace this meal" keeps
  // every OTHER item's checked state untouched (see addRecipeToSession).
  useEffect(() => {
    setSession((prev) => {
      let next = prev;
      const nextSlugs = new Set(recipes.map((r) => `shift-${r.occasion}`));
      for (const slug of presentSlugs.current) {
        if (!nextSlugs.has(slug)) next = removeRecipeFromSession(next, slug);
      }
      for (const { occasion, recipe } of recipes) {
        next = addRecipeToSession(
          next,
          clientRecipeToShoppingInput(`shift-${occasion}`, recipe, crewSize),
          recipe.servings || crewSize,
        );
      }
      presentSlugs.current = nextSlugs;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, crewSize]);

  const grouped = useMemo(() => groupByDepartment(session.list.items), [session.list.items]);

  const costEstimate = useMemo(() => {
    const estimates = recipes.map(({ recipe }) =>
      estimateRecipeCost(
        recipe.ingredients.map((ing) => ({ name: ing.name, quantity: ing.qty, unit: ing.unit })),
        recipe.servings || crewSize,
        location,
      ),
    );
    if (estimates.length === 0) return null;
    return aggregateRecipeCostEstimates(estimates, crewSize);
  }, [recipes, crewSize, location]);

  const checkedCount = session.list.items.filter((i) => i.checked).length;

  if (recipes.length === 0) return null;

  return (
    <section className={cn(app.cardSurface, "p-4 sm:p-5 mt-6")} data-testid="shift-grocery-list">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
        <h2 className="font-heading text-lg tracking-tight">Grocery list for this shift</h2>
      </div>

      {costEstimate && (
        <div className="mb-4 rounded-xl border border-border/40 bg-background/40 p-3" data-testid="shift-grocery-cost">
          {costEstimate.coverageTrustworthy ? (
            <>
              <p className="text-sm">
                <span className="text-muted-foreground">Estimated total: </span>
                <span className="font-semibold" data-testid="shift-grocery-total">
                  {formatAggregatedTotalRange(costEstimate)}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">About </span>
                <span className="font-semibold" data-testid="shift-grocery-per-person">
                  {formatAggregatedPerPersonRange(costEstimate)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Baseline prices — a typical range, not a live retailer quote.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground" data-testid="shift-grocery-cost-incomplete">
              Not enough priced ingredients yet for a reliable estimate ({costEstimate.pricedRecipeCount} of{" "}
              {costEstimate.recipeCount} meal{costEstimate.recipeCount === 1 ? "" : "s"} fully priced
              {costEstimate.unpricedIngredients.length > 0
                ? ` — missing: ${costEstimate.unpricedIngredients.slice(0, 4).join(", ")}${
                    costEstimate.unpricedIngredients.length > 4 ? "…" : ""
                  }`
                : ""}
              ).
            </p>
          )}
        </div>
      )}

      {session.list.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ingredients yet — plan a meal above to build your list.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3" data-testid="shift-grocery-progress">
            {checkedCount} / {session.list.items.length} checked
          </p>
          <div className="space-y-4">
            {grouped.map(({ department, items }) => (
              <div key={department}>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                  {department}
                </h3>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const quantity = formatShoppingItemQuantity(item, measurementSystem);
                    return (
                      <li key={item.id} className="flex items-start gap-2.5 py-1">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => setSession((prev) => toggleItemChecked(prev, item.id))}
                          className="mt-0.5 min-h-5 min-w-5 touch-manipulation"
                          data-testid={`shift-grocery-item-${item.id}`}
                          aria-label={`${item.displayName}, ${quantity}`}
                        />
                        <span
                          className={cn(
                            "text-sm leading-snug",
                            item.checked && "line-through text-muted-foreground/70",
                          )}
                        >
                          {item.displayName}
                          {quantity ? <span className="text-muted-foreground"> — {quantity}</span> : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
