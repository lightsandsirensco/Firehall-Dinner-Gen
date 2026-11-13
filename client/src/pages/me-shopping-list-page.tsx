import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Undo2,
  Users,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { AisleShoppingList } from "@/components/shopping/aisle-shopping-list";
import { ListExportActions } from "@/components/shopping/list-export-actions";
import { Button } from "@/components/ui/button";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useMeasurementSystem } from "@/lib/measurement-preference";
import { shoppingItemsToAisleRows } from "@/lib/shopping/aisle-rows";
import { useShoppingSession } from "@/hooks/use-shopping-session";
import { aisleSectionsFromItems, formatShoppingItemQuantity, type AisleExportDocument } from "@shared/shopping";

export default function MeShoppingListPage() {
  const [measurementSystem] = useMeasurementSystem();
  const {
    session,
    activeItems,
    pantrySkippedItems,
    canUndo,
    removeRecipe,
    setRecipeCrewSize,
    addManualItem,
    removeItem,
    toggleItemChecked,
    moveItem,
    clearCheckedItems,
    undo,
    startNewSession,
    setPersonalStockLevel,
  } = useShoppingSession();

  const [showSkipped, setShowSkipped] = useState(false);

  const totalItems = activeItems.length;
  const checkedCount = activeItems.filter((i) => i.checked).length;
  const hasContent = session.recipes.length > 0 || session.list.items.length > 0;
  const rows = useMemo(() => shoppingItemsToAisleRows(activeItems, measurementSystem), [activeItems, measurementSystem]);

  const exportDocument = (): AisleExportDocument => ({
    title: "Shopping List",
    subtitle: session.recipes.length > 0 ? `For ${session.recipes.map((r) => `${r.title} (serves ${r.crewSize})`).join(", ")}` : undefined,
    sections: aisleSectionsFromItems(activeItems, measurementSystem),
    extras: pantrySkippedItems.length > 0
      ? [{ title: "Already in the pantry — quick check", lines: pantrySkippedItems.map((i) => i.displayName) }]
      : undefined,
    footer: "Firehall Meals — firehallmeals.com",
  });

  const handleStartNew = () => {
    if (hasContent && !window.confirm("Start a new shopping list? This clears your current list from this device.")) {
      return;
    }
    startNewSession();
  };

  return (
    <MeSubpageShell
      title="Shopping List"
      subtitle="Add any recipe and we'll build the list — grouped by aisle, combined, scaled to your crew, and quietly skip what your pantry already covers."
      testId="me-shopping-list-page"
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-xs text-muted-foreground">
          {totalItems > 0 ? `${totalItems} item${totalItems === 1 ? "" : "s"} to buy` : "Nothing to buy yet"}
        </p>
        <div className="flex gap-2">
          {canUndo && (
            <Button variant="ghost" size="sm" onClick={undo} className="gap-1.5" data-testid="button-shopping-undo">
              <Undo2 className="w-3.5 h-3.5" />
              Undo
            </Button>
          )}
          {hasContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartNew}
              className="gap-1.5 text-muted-foreground/70 hover:text-destructive"
              data-testid="button-shopping-new-list"
            >
              Start new list
            </Button>
          )}
        </div>
      </div>

      {session.recipes.length > 0 && (
        <section className="space-y-2" aria-labelledby="shopping-recipes-heading">
          <h2 id="shopping-recipes-heading" className={cn(app.eyebrowMuted, "px-0.5")}>
            Recipes in this list ({session.recipes.length})
          </h2>
          <ul className={cn("space-y-2", app.stagger)}>
            {session.recipes.map((recipe) => (
              <li
                key={recipe.slug}
                className={cn(app.cardSurface, "flex items-center justify-between gap-2 px-3 py-2.5")}
                data-testid={`shopping-recipe-${recipe.slug}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{recipe.title}</p>
                  <p className="text-xs text-muted-foreground">Base recipe serves {recipe.baseServings}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setRecipeCrewSize(recipe.slug, recipe.crewSize - 1)}
                    disabled={recipe.crewSize <= 1}
                    className="grid h-10 w-10 place-items-center rounded-full border border-border hover-elevate active-elevate-2 tap-scale disabled:opacity-40 touch-manipulation"
                    aria-label="Decrease crew size"
                    data-testid={`button-shopping-crew-minus-${recipe.slug}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-14 text-center text-xs font-semibold" data-testid={`shopping-crew-size-${recipe.slug}`}>
                    <Users className="w-3 h-3 inline mr-1 opacity-60" />
                    {recipe.crewSize}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRecipeCrewSize(recipe.slug, recipe.crewSize + 1)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-border hover-elevate active-elevate-2 tap-scale touch-manipulation"
                    aria-label="Increase crew size"
                    data-testid={`button-shopping-crew-plus-${recipe.slug}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRecipe(recipe.slug)}
                    className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover-elevate active-elevate-2 tap-scale hover:text-destructive touch-manipulation"
                    aria-label={`Remove ${recipe.title} from shopping list`}
                    data-testid={`button-shopping-remove-recipe-${recipe.slug}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeItems.length > 0 ? (
        <ListExportActions getDocument={exportDocument} testIdPrefix="shopping-export" />
      ) : null}

      <AisleShoppingList
        listId={`me:${session.id}`}
        rows={rows}
        onToggle={(row) => toggleItemChecked(row.id)}
        onMove={(row, department) => moveItem(row.id, department)}
        onHave={(row) => {
          const item = activeItems.find((i) => i.id === row.id);
          if (item) setPersonalStockLevel(item.canonicalKey, "always");
        }}
        onRemove={(row) => removeItem(row.id)}
        onAdd={(name) => addManualItem({ name })}
        addPlaceholder="Add an item (e.g. paper towels)"
        testIdPrefix="shopping"
      />

      {activeItems.length > 0 ? (
        checkedCount > 0 && (
          <Button variant="outline" onClick={clearCheckedItems} className="w-full gap-1.5" data-testid="button-shopping-clear-checked">
            <Trash2 className="w-4 h-4" />
            Clear {checkedCount} checked item{checkedCount === 1 ? "" : "s"}
          </Button>
        )
      ) : (
        <div
          className={cn(app.panel, "fade-up text-center py-12 px-6 space-y-4")}
          data-testid="shopping-empty-state"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <ShoppingCart className="w-6 h-6 text-primary/90" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className={app.titleCard}>
              {pantrySkippedItems.length > 0 ? "You're all set — nothing left to buy" : "Your shopping list is empty"}
            </p>
            <p className={cn(app.subtitle, "max-w-xs mx-auto")}>
              {pantrySkippedItems.length > 0
                ? "Your pantry already covers this recipe's ingredients."
                : "Open any recipe and tap \"Add to my list\" — we'll normalize, group, and combine everything here."}
            </p>
          </div>
          <Button asChild className="min-h-11 touch-manipulation rounded-xl">
            <Link href="/explore">Browse recipes</Link>
          </Button>
        </div>
      )}

      {pantrySkippedItems.length > 0 && (
        <section className="space-y-2" aria-labelledby="shopping-pantry-skipped-heading">
          <button
            type="button"
            onClick={() => setShowSkipped((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 -mx-2 text-left hover-elevate touch-manipulation"
            data-testid="button-shopping-toggle-skipped"
          >
            <h2 id="shopping-pantry-skipped-heading" className={app.eyebrowMuted}>
              Already in your pantry ({pantrySkippedItems.length})
            </h2>
            {showSkipped ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {showSkipped && (
            <ul className={cn("space-y-1", app.stagger)}>
              {pantrySkippedItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2"
                  data-testid={`shopping-pantry-item-${item.id}`}
                >
                  <PackageCheck className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">
                      {item.displayName}
                      {item.quantityLabel && (
                        <span className="ml-1.5">— {formatShoppingItemQuantity(item, measurementSystem)}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70">
                      {item.pantryStockLevel === "usually" ? "Usually stocked" : "Always stocked"}
                      {item.pantrySource === "hall" ? " · Firehouse Pantry" : " · Your pantry"} — worth a quick check
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPersonalStockLevel(item.canonicalKey, "never")}
                    className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-primary hover-elevate active-elevate-2 touch-manipulation"
                    data-testid={`button-shopping-need-this-${item.id}`}
                  >
                    I need this
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className={cn(app.caption, "text-center px-2")}>
        Saved on this device only.{" "}
        <Link href="/me/pantry" className="font-medium text-primary hover:underline">
          Edit your pantry
        </Link>
      </p>
    </MeSubpageShell>
  );
}
