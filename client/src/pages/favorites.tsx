import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecipeCard } from "@/components/recipe-card";
import { FavoriteMealCard } from "@/components/mobile/favorite-meal-card";
import { getSavedMeals, removeMeal, type SavedMeal } from "@/lib/saved-meals";
import { Heart, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { HeroHeader } from "@/components/hero-header";
import { SiteHeader } from "@/components/site-header";
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
      <SiteHeader activePage="favorites" />

      <HeroHeader
        variant="compact"
        title="Hall Favorites"
        subtitle={
          meals.length === 0
            ? "Save your best crew meals here"
            : `${meals.length} saved ${meals.length === 1 ? "meal" : "meals"}`
        }
      />

      <main className={cn(app.main, "py-4 sm:py-6 pb-safe-nav max-w-[1000px]")}>
        {meals.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground text-sm mb-4">Your favorites are empty.</p>
            <Link href="/">
              <Button
                variant="outline"
                className="font-heading tracking-wide min-h-11 touch-manipulation rounded-xl"
                data-testid="button-go-generate"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Generate a meal
              </Button>
            </Link>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3",
              app.stagger,
            )}
          >
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
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-h-[92dvh] max-sm:rounded-t-2xl max-sm:w-full pb-safe scroll-momentum">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Saved meal
            </DialogTitle>
          </DialogHeader>
          {viewingMeal && (
            <div className="space-y-4">
              <RecipeCard recipe={viewingMeal.recipe} crewSize={6} hideSave />
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive min-h-11 rounded-xl"
                onClick={() => handleRemove(viewingMeal.id)}
                data-testid="button-remove-from-view"
              >
                Remove from favorites
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <footer className="text-center py-4 mt-4 pb-safe">
        <p className="text-xs text-muted-foreground/60">
          Powered by{" "}
          <a
            href="https://www.lightsandsirensco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            Lights &amp; Sirens Co.
          </a>
        </p>
      </footer>
    </div>
  );
}
