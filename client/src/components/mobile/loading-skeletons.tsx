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
