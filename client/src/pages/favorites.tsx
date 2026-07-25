import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecipeCard } from "@/components/recipe-card";
import { FavoriteMealCard } from "@/components/mobile/favorite-meal-card";
import { OurHallClassicsSection } from "@/components/hall-favorites/our-hall-classics-section";
import { getSavedMeals, removeMeal, type SavedMeal } from "@/lib/saved-meals";
import {
  getHallFavoritesCount,
  migrateCatalogSavedMealsToHallFavorites,
} from "@/lib/hall-favorites-store";
import { useHallFavorites } from "@/hooks/use-hall-favorites";
import { Heart } from "lucide-react";
import { Link } from "wouter";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { CTA, HALL_FAVORITES } from "@/lib/brand-copy";
import { trackHallFavoritesViewed } from "@/lib/analytics";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";

function cookHrefForSaved(meal: SavedMeal): string | null {
  const slug = (meal.recipe as { _slug?: string })._slug;
  if (slug) return `${approvedCatalogRecipePath(slug)}?cook=1`;
  return null;
}

export default function FavoritesPage() {
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [viewingMeal, setViewingMeal] = useState<SavedMeal | null>(null);
  const { count: hallClassicCount } = useHallFavorites();

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

  return (
    <MeSubpageShell
      title={HALL_FAVORITES.title}
      subtitle={HALL_FAVORITES.subtitle}
      testId="favorites-page"
    >
      {meals.length > 0 ? (
        <section aria-labelledby="saved-dinners-heading" className="space-y-3">
          <div>
            <h2 id="saved-dinners-heading" className="font-heading text-lg">
              {HALL_FAVORITES.savedDinners}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {HALL_FAVORITES.savedDinnersHint}
            </p>
          </div>
          <div className={cn("grid gap-4 sm:grid-cols-2", app.stagger)}>
            {meals.map((meal) => {
              const cookHref = cookHrefForSaved(meal);
              return (
                <FavoriteMealCard
                  key={meal.id}
                  meal={meal}
                  formatDate={formatDate}
                  onView={() => {
                    if (cookHref) {
                      window.location.href = cookHref;
                      return;
                    }
                    setViewingMeal(meal);
                  }}
                  onRemove={() => handleRemove(meal.id)}
                  viewLabel="Cook again"
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {hallClassicCount > 0 ? (
        <section className="space-y-2 pt-2">
          <h2 className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {HALL_FAVORITES.ourClassics}
          </h2>
          <OurHallClassicsSection source="hall_favorites_page" />
        </section>
      ) : null}

      {hallClassicCount === 0 && meals.length === 0 ? (
        <div className="text-center py-12 px-4 space-y-4" data-testid="saved-empty-state">
          <Heart className="w-10 h-10 mx-auto text-muted-foreground/25" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Nothing saved yet</p>
            <p className={app.subtitle}>Pick a meal you like — tap Save to find it here next shift.</p>
          </div>
          <Button asChild className="min-h-11 touch-manipulation rounded-xl">
            <Link href="/generator">{CTA.pickTonight}</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            <Link href="/explore" className="hover:underline">
              Or browse recipes
            </Link>
          </p>
        </div>
      ) : null}

      <p className="text-center text-[11px] text-muted-foreground px-2">
        {HALL_FAVORITES.deviceNote}
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
