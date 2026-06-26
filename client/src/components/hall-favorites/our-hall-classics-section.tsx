import { HALL_FAVORITES } from "@/lib/brand-copy";
import { MAX_HALL_CLASSICS } from "@shared/hall-favorites/types";
import { HallClassicCard } from "@/components/hall-favorites/hall-classic-card";
import { useHallFavorites } from "@/hooks/use-hall-favorites";
import {
  removeHallFavorite,
  getHallFavoritesCount,
} from "@/lib/hall-favorites-store";
import { trackHallFavoriteRemoved } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface OurHallClassicsSectionProps {
  className?: string;
  source?: string;
}

export function OurHallClassicsSection({
  className,
  source = "hall_favorites_page",
}: OurHallClassicsSectionProps) {
  const { favorites, count } = useHallFavorites();

  const handleRemove = (slug: string, title: string) => {
    if (removeHallFavorite(slug)) {
      trackHallFavoriteRemoved({
        recipe_slug: slug,
        recipe_title: title,
        source,
        favorite_count: getHallFavoritesCount(),
      });
    }
  };

  return (
    <section
      className={cn("mb-8", className)}
      aria-labelledby="our-hall-classics-heading"
      data-testid="our-hall-classics"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-primary shrink-0" aria-hidden />
          <h2 id="our-hall-classics-heading" className="font-heading text-xl sm:text-2xl">
            {HALL_FAVORITES.ourClassics}
          </h2>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">{count}/{MAX_HALL_CLASSICS}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4 max-w-prose">{HALL_FAVORITES.classicsHint}</p>

      {favorites.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/50 px-4 py-8 text-center">
          {HALL_FAVORITES.emptyClassics}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {favorites.map((favorite) => (
            <HallClassicCard
              key={favorite.slug}
              favorite={favorite}
              onRemove={() => handleRemove(favorite.slug, favorite.title)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
