import { useMemo } from "react";
import { Link } from "wouter";
import { ChevronRight, Heart } from "lucide-react";
import { getSavedMeals } from "@/lib/saved-meals";
import { importLegacyHallFavorites } from "@/lib/hall-favorites-store";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export function YourFoodCard() {
  const favorites = useMemo(() => {
    importLegacyHallFavorites();
    return getSavedMeals();
  }, []);
  const recent = useMemo(
    () => [...favorites].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)).slice(0, 3),
    [favorites],
  );

  return (
    <Link
      href="/me/saved"
      className={cn(app.cardSurface, "block p-5 hover-elevate active-elevate-2 touch-manipulation")}
      data-testid="link-saved-meals-entry"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className={app.titleCard}>Your Food</h2>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      </div>

      {favorites.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground mb-3">
            {favorites.length} saved meal{favorites.length === 1 ? "" : "s"}
          </p>
          <ul className="space-y-1.5">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm text-foreground/90 truncate">
                <Heart className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
                <span className="truncate">{r.recipe.title}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Save meals you want to make again.</p>
      )}
    </Link>
  );
}
