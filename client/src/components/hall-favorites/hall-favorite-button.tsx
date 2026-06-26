import { useState, useEffect } from "react";
import { Flame, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HALL_FAVORITES } from "@/lib/brand-copy";
import {
  addHallFavorite,
  removeHallFavorite,
  isHallFavorite,
  canAddHallFavorite,
  HALL_FAVORITES_CHANGED_EVENT,
} from "@/lib/hall-favorites-store";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { trackHallFavoriteAdded, trackHallFavoriteRemoved } from "@/lib/analytics";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getHallFavoritesCount } from "@/lib/hall-favorites-store";

interface HallFavoriteButtonProps {
  slug: string;
  title: string;
  recipePath?: string;
  source?: string;
  className?: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

export function HallFavoriteButton({
  slug,
  title,
  recipePath,
  source = "recipe_page",
  className,
  variant = "outline",
  size = "default",
}: HallFavoriteButtonProps) {
  const [pinned, setPinned] = useState(() => isHallFavorite(slug));
  const { toast } = useToast();

  useEffect(() => {
    const sync = () => setPinned(isHallFavorite(slug));
    sync();
    window.addEventListener(HALL_FAVORITES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(HALL_FAVORITES_CHANGED_EVENT, sync);
  }, [slug]);

  const toggle = () => {
    hapticLight();
    if (pinned) {
      if (removeHallFavorite(slug)) {
        setPinned(false);
        hapticSuccess();
        trackHallFavoriteRemoved({
          recipe_slug: slug,
          recipe_title: title,
          source,
          favorite_count: getHallFavoritesCount(),
        });
      }
      return;
    }

    if (!canAddHallFavorite()) {
      toast({
        title: HALL_FAVORITES.classicsFull,
        variant: "destructive",
      });
      return;
    }

    const result = addHallFavorite({
      slug,
      title,
      recipePath: recipePath ?? approvedCatalogRecipePath(slug),
      source,
    });

    if (result.ok) {
      setPinned(true);
      hapticSuccess();
      trackHallFavoriteAdded({
        recipe_slug: slug,
        recipe_title: title,
        source,
        favorite_count: getHallFavoritesCount(),
      });
    } else if (result.reason === "duplicate") {
      setPinned(true);
    } else if (result.reason === "full") {
      toast({
        title: HALL_FAVORITES.classicsFull,
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      type="button"
      variant={pinned ? "default" : variant}
      size={size}
      className={cn(
        "min-h-11 gap-2 touch-manipulation",
        pinned && "bg-primary/90",
        className,
      )}
      onClick={toggle}
      data-testid="button-hall-favorite"
      aria-pressed={pinned}
    >
      {pinned ? (
        <Flame className="w-4 h-4 shrink-0 fill-current" aria-hidden />
      ) : (
        <Star className="w-4 h-4 shrink-0" aria-hidden />
      )}
      {pinned ? HALL_FAVORITES.addedToHall : HALL_FAVORITES.addToHall}
    </Button>
  );
}
