import { Link } from "wouter";
import { Flame, X } from "lucide-react";
import type { HallFavorite } from "@shared/hall-favorites/types";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { Button } from "@/components/ui/button";
import { HALL_FAVORITES } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

interface HallClassicCardProps {
  favorite: HallFavorite;
  onRemove?: () => void;
  className?: string;
}

export function HallClassicCard({ favorite, onRemove, className }: HallClassicCardProps) {
  const href = favorite.recipePath ?? approvedCatalogRecipePath(favorite.slug);

  return (
    <article
      className={cn(
        "group relative rounded-xl border border-primary/25 bg-primary/5 px-4 py-3.5 hover:border-primary/40 transition-colors",
        className,
      )}
      data-testid={`hall-classic-${favorite.slug}`}
    >
      <div className="flex items-start gap-3">
        <Flame className="w-4 h-4 shrink-0 text-primary mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <Link href={href} className="font-medium text-foreground hover:text-primary line-clamp-2">
            {favorite.title}
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Hall Classic</p>
        </div>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label={HALL_FAVORITES.removeFromHall}
            data-testid={`remove-hall-classic-${favorite.slug}`}
          >
            <X className="w-4 h-4" />
          </Button>
        ) : null}
      </div>
    </article>
  );
}
