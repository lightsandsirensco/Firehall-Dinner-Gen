import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecipeCard } from "@/components/recipe-card";
import { getSavedMeals, removeMeal, type SavedMeal } from "@/lib/saved-meals";
import { Flame, Heart, Trash2, Eye, Clock, Beef, ChevronLeft } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border/40">
        <div className="max-w-[1000px] mx-auto px-4">
          <nav className="flex items-center justify-between py-2" data-testid="nav-links">
            <div className="flex items-center gap-2">
              <Flame className="w-7 h-7" style={{ color: "#C62828" }} />
              <span className="font-heading text-lg leading-none tracking-wide text-foreground">FIREHALL MEALS</span>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-1.5" data-testid="nav-link-meals">
                Meal Generator
              </Link>
              <span className="text-muted-foreground/30 text-xs">|</span>
              <Link href="/pizza" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-1.5" data-testid="nav-link-pizza">
                Pizza Night
              </Link>
              <span className="text-muted-foreground/30 text-xs">|</span>
              <Link href="/explore" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-1.5" data-testid="nav-link-explore">
                Explore
              </Link>
              <span className="text-muted-foreground/30 text-xs">|</span>
              <span className="text-xs uppercase tracking-wider text-foreground font-medium px-3 py-1.5 flex items-center gap-1" data-testid="nav-link-favorites-active">
                <Heart className="w-3 h-3" />
                Favorites
              </span>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl sm:text-5xl tracking-wide text-foreground" data-testid="text-favorites-title">
            HALL FAVORITES
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {meals.length === 0
              ? "No saved meals yet. Generate a meal and save it to see it here."
              : `${meals.length} saved ${meals.length === 1 ? "meal" : "meals"}`}
          </p>
        </div>

        {meals.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground text-sm mb-4">Your favorites are empty.</p>
            <Link href="/">
              <Button variant="outline" className="font-heading tracking-wider" data-testid="button-go-generate">
                <ChevronLeft className="w-4 h-4 mr-1" />
                GENERATE A MEAL
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meals.map((meal) => (
              <Card key={meal.id} className="bg-card border-border/50 hover:border-border transition-colors" data-testid={`card-favorite-${meal.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-heading text-xl tracking-wide text-foreground leading-tight line-clamp-2" data-testid={`text-favorite-title-${meal.id}`}>
                      {meal.recipe.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {meal.recipe.why_it_fits_tonight}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {meal.recipe.chosen_protein && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Beef className="w-3 h-3" />
                        {meal.recipe.chosen_protein}
                      </Badge>
                    )}
                    {meal.recipe.budget_level && (
                      <Badge variant="outline" className="text-[10px]">
                        {meal.recipe.budget_level === "low" ? "$" : meal.recipe.budget_level === "splurge" ? "$$$" : "$$"}
                      </Badge>
                    )}
                    {meal.recipe.timing && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Clock className="w-3 h-3" />
                        {meal.recipe.timing.total_min}m
                      </Badge>
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground/60">
                    Saved {formatDate(meal.savedAt)}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setViewingMeal(meal)}
                      data-testid={`button-view-${meal.id}`}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive"
                      onClick={() => handleRemove(meal.id)}
                      data-testid={`button-remove-${meal.id}`}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!viewingMeal} onOpenChange={(open) => !open && setViewingMeal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-wide flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              SAVED MEAL
            </DialogTitle>
          </DialogHeader>
          {viewingMeal && (
            <div className="space-y-4">
              <RecipeCard
                recipe={viewingMeal.recipe}
                crewSize={6}
                hideSave
              />
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => handleRemove(viewingMeal.id)}
                data-testid="button-remove-from-view"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove from Favorites
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <footer className="text-center py-4 mt-6">
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
