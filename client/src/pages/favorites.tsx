import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecipeCard } from "@/components/recipe-card";
import { FavoriteMealCard } from "@/components/mobile/favorite-meal-card";
import { getSavedMeals, removeMeal, downloadSavedMealsExport, type SavedMeal } from "@/lib/saved-meals";
import { Heart, ChevronLeft, Download, Smartphone } from "lucide-react";
import { Link } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { AppPageHeader } from "@/components/mobile/app-page-header";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function FavoritesPage() {
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [viewingMeal, setViewingMeal] = useState<SavedMeal | null>(null);

  const loadMeals = useCallback(() => {
    setMeals(getSavedMeals());
  }, []);

  useEffect(() => {
    loadMeals();
    const handler = () => loadMeals();
    window.addEventListener("favorites-changed", handler);
    return () => window.removeEventListener("favorites-changed", handler);
  }, [loadMeals]);

  const handleRemove = (id: string) => {
    removeMeal(id);
    if (viewingMeal?.id === id) setViewingMeal(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className={app.page}>
      <SiteHeader activePage="favorites" favCount={meals.length} />

      <AppPageHeader
        variant="minimal"
        title="Saved meals"
        subtitle={
          meals.length === 0
            ? "Hall favorites land here after you save a dinner."
            : `${meals.length} ${meals.length === 1 ? "meal" : "meals"} ready to cook again`
        }
      />

      <main className={cn(app.main, "py-6 sm:py-8 pb-safe-nav max-w-[1000px]")}>
        {meals.length > 0 && (
          <div
            className="mb-6 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            data-testid="favorites-device-banner"
          >
            <div className="flex gap-3">
              <Smartphone className="w-5 h-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
              <div>
                <p className="text-sm font-medium">Saved on this device only</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Favorites stay in this browser. Export a backup before switching phones or clearing data.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-10 shrink-0 touch-manipulation"
              onClick={() => downloadSavedMealsExport()}
              data-testid="button-export-favorites"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export JSON
            </Button>
          </div>
        )}

        {meals.length === 0 ? (
          <div className="text-center py-20 px-4">
            <Heart className="w-10 h-10 mx-auto text-muted-foreground/25 mb-4" />
            <p className={app.subtitle}>Nothing saved yet.</p>
            <Link href="/generator">
              <Button variant="outline" className="mt-6 min-h-11 touch-manipulation rounded-xl" data-testid="button-go-generate">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Set tonight&apos;s meal
              </Button>
            </Link>
          </div>
        ) : (
          <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", app.stagger)}>
            {meals.map((meal) => (
              <FavoriteMealCard
                key={meal.id}
                meal={meal}
                formatDate={formatDate}
                onView={() => setViewingMeal(meal)}
                onRemove={() => handleRemove(meal.id)}
              />
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!viewingMeal} onOpenChange={(open) => !open && setViewingMeal(null)}>
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto scroll-momentum">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-wide">
              {viewingMeal?.recipe.title}
            </DialogTitle>
          </DialogHeader>
          {viewingMeal && (
            <RecipeCard
              recipe={viewingMeal.recipe}
              crewSize={viewingMeal.recipe.servings || 6}
              hideSave
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
