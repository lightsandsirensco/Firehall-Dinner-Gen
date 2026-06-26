import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecipeCard } from "@/components/recipe-card";
import { FavoriteMealCard } from "@/components/mobile/favorite-meal-card";
import { HallVoteFlow } from "@/components/hall-vote-flow";
import { OurHallClassicsSection } from "@/components/hall-favorites/our-hall-classics-section";
import { MostCookedMeals } from "@/components/hall-favorites/most-cooked-meals";
import { RecentlyCookedStrip } from "@/components/hall-history/recently-cooked-strip";
import { getSavedMeals, removeMeal, downloadSavedMealsExport, type SavedMeal } from "@/lib/saved-meals";
import {
  getHallFavoritesCount,
  migrateCatalogSavedMealsToHallFavorites,
} from "@/lib/hall-favorites-store";
import { useHallFavorites } from "@/hooks/use-hall-favorites";
import { ChevronLeft, Download, Heart, Smartphone } from "lucide-react";
import { Link } from "wouter";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { HALL_FAVORITES, HALL_HISTORY } from "@/lib/brand-copy";
import { trackHallFavoritesViewed } from "@/lib/analytics";

export default function FavoritesPage() {
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [viewingMeal, setViewingMeal] = useState<SavedMeal | null>(null);
  const { count: hallClassicCount, mostCooked } = useHallFavorites();

  const loadMeals = useCallback(() => {
    setMeals(getSavedMeals().filter((m) => !m.id.startsWith("catalog:")));
  }, []);

  useEffect(() => {
    migrateCatalogSavedMealsToHallFavorites();
    loadMeals();
    trackHallFavoritesViewed({ favorite_count: getHallFavoritesCount() });
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

  const voteRecipes = useMemo(
    () => meals.slice(0, 5).map((m) => m.recipe),
    [meals],
  );

  return (
    <MeSubpageShell
      title={HALL_FAVORITES.title}
      subtitle={HALL_FAVORITES.subtitle}
      testId="favorites-page"
    >
      <div
        className="rounded-xl border border-border/40 bg-muted/25 px-4 py-3.5 flex gap-3"
        data-testid="hall-favorites-device-note"
      >
        <Smartphone className="w-5 h-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
        <p className="text-sm text-muted-foreground leading-relaxed">{HALL_FAVORITES.deviceNote}</p>
      </div>

      <p className="text-sm font-medium text-foreground" data-testid="hall-favorites-count">
        {HALL_FAVORITES.favoriteCount(hallClassicCount)}
      </p>

      <OurHallClassicsSection source="hall_favorites_page" />

      <MostCookedMeals meals={mostCooked} />

      <RecentlyCookedStrip source="hall_favorites" showSeeAll />

      {meals.length >= 2 && (
        <div>
          <HallVoteFlow recipes={voteRecipes} source="saved_recipes" variant="banner" />
        </div>
      )}

      {meals.length > 0 && (
        <section aria-labelledby="saved-dinners-heading">
          <h2 id="saved-dinners-heading" className="font-heading text-lg mb-1">
            {HALL_FAVORITES.savedDinners}
          </h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{HALL_FAVORITES.savedDinnersHint}</p>
          <div
            className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            data-testid="favorites-device-banner"
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              Export a backup before switching phones or clearing data.
            </p>
            <Button
              variant="outline"
              className="min-h-11 shrink-0 touch-manipulation"
              onClick={() => downloadSavedMealsExport()}
              data-testid="button-export-favorites"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export JSON
            </Button>
          </div>
          <div className={cn("grid gap-4 sm:grid-cols-2", app.stagger)}>
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
        </section>
      )}

      {hallClassicCount === 0 && meals.length === 0 && (
        <div className="text-center py-12 px-4">
          <Heart className="w-10 h-10 mx-auto text-muted-foreground/25 mb-4" />
          <p className={app.subtitle}>No crew traditions pinned yet.</p>
          <Link href="/explore">
            <Button variant="outline" className="mt-6 min-h-11 touch-manipulation rounded-xl">
              Browse recipes
            </Button>
          </Link>
          <Link href="/generator">
            <Button variant="ghost" className="mt-3 min-h-11 touch-manipulation">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Find a Meal
            </Button>
          </Link>
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center">
        <Link href="/hall-history" className="text-primary hover:underline font-medium min-h-11 inline-flex items-center">
          {HALL_HISTORY.seeAll}
        </Link>
      </p>

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
    </MeSubpageShell>
  );
}
