import { cn } from "@/lib/utils";
import type { HeroImageLayout } from "@/lib/hero-image";
import { HERO_LAYOUT_FRAME } from "@/lib/hero-image";

export function FoodImageSkeleton({
  layout = "cinematic",
  className,
}: {
  layout?: HeroImageLayout;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-zinc-900/90 skeleton-shimmer",
        HERO_LAYOUT_FRAME[layout],
        className,
      )}
      aria-hidden
    />
  );
}

export function MealCardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden>
      <FoodImageSkeleton />
      <div className="h-8 w-3/4 rounded-lg bg-muted/40" />
      <div className="h-4 w-full rounded bg-muted/30" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-14 rounded-xl bg-muted/25" />
        <div className="h-14 rounded-xl bg-muted/25" />
        <div className="h-14 rounded-xl bg-muted/25" />
      </div>
    </div>
  );
}

export function RecipeGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="overflow-hidden rounded-xl bg-card/40 ring-1 ring-border/20 animate-pulse md:rounded-2xl">
          <div className="aspect-square bg-zinc-900 skeleton-shimmer md:aspect-[4/5]" />
          <div className="space-y-1.5 p-2 md:p-3">
            <div className="h-3 w-full rounded bg-muted/40 md:h-4" />
            <div className="h-2.5 w-2/3 rounded bg-muted/30 md:h-3" />
          </div>
        </li>
      ))}
    </ul>
  );
}
