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
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="rounded-2xl overflow-hidden bg-card/40 ring-1 ring-border/20 animate-pulse">
          <div className="aspect-[4/5] bg-zinc-900 skeleton-shimmer" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-full rounded bg-muted/40" />
            <div className="h-3 w-2/3 rounded bg-muted/30" />
          </div>
        </li>
      ))}
    </ul>
  );
}
