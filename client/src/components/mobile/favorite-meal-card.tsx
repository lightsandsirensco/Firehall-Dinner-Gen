import { Clock, Beef, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FoodImage } from "@/components/mobile/food-image";
import { resolveEditorialFallbackHero } from "@shared/meal-hero-fallback";
import type { SavedMeal } from "@/lib/saved-meals";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface FavoriteMealCardProps {
  meal: SavedMeal;
  onView: () => void;
  onRemove: () => void;
  formatDate: (iso: string) => string;
}

export function FavoriteMealCard({ meal, onView, onRemove, formatDate }: FavoriteMealCardProps) {
  const { recipe } = meal;
  const heroSrc =
    recipe.hero_image && recipe.hero_image_status === "ready"
      ? recipe.hero_image
      : resolveEditorialFallbackHero(recipe.title, {
          mealFormat: recipe.meal_style,
          protein: recipe.chosen_protein,
        });

  return (
    <article
      className={cn(app.cardCinematic, "flex flex-col bg-zinc-950")}
      data-testid={`card-favorite-${meal.id}`}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        {heroSrc ? (
          <FoodImage
            src={heroSrc}
            alt={recipe.hero_image_alt || recipe.title}
            layout="card-fill"
            focal="food-plate"
            overlay="card-cinematic"
            cinematicGrade
            rounded="none"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950 skeleton-shimmer" />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3.5 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          <h3
            className="font-heading text-lg sm:text-xl leading-tight text-white line-clamp-2 drop-shadow-md"
            data-testid={`text-favorite-title-${meal.id}`}
          >
            {recipe.title}
          </h3>
        </div>
      </div>

      <div className="p-3.5 space-y-3 bg-card/80 border-t border-border/20">
        <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
          {recipe.why_it_fits_tonight}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {recipe.chosen_protein && (
            <Badge variant="outline" className="text-[10px] gap-1 rounded-full">
              <Beef className="w-3 h-3" />
              {recipe.chosen_protein}
            </Badge>
          )}
          {recipe.timing?.total_min ? (
            <Badge variant="outline" className="text-[10px] gap-1 rounded-full">
              <Clock className="w-3 h-3" />
              {recipe.timing.total_min}m
            </Badge>
          ) : null}
        </div>
        <p className="text-[10px] text-muted-foreground/60">Saved {formatDate(meal.savedAt)}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs min-h-11 touch-manipulation rounded-xl"
            onClick={onView}
            data-testid={`button-view-${meal.id}`}
          >
            <Eye className="w-3 h-3 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs min-h-11 touch-manipulation rounded-xl text-destructive hover:text-destructive"
            onClick={onRemove}
            data-testid={`button-remove-${meal.id}`}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Remove
          </Button>
        </div>
      </div>
    </article>
  );
}
