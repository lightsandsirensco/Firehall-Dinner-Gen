/**
 * Meal History preview for the Profile / "Your Food" area — reuses the
 * exact card treatment as YourFoodCard right above it. Shows nothing when
 * there's no useful content yet (not entitled, or entitled but empty) —
 * the full upsell/empty-state copy already lives on /me/history.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, Star } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { useFeature } from "@/lib/billing/hooks";
import { fetchMealHistory } from "@/lib/meal-history-api";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5 shrink-0" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          className={cn("h-3 w-3", v <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
        />
      ))}
    </span>
  );
}

export function MealHistoryPreviewCard() {
  const { authenticated } = useAuth();
  const hasMealMemory = useFeature("meal_memory");

  const historyQuery = useQuery({
    queryKey: ["/api/meal-history"],
    queryFn: fetchMealHistory,
    enabled: authenticated && hasMealMemory,
    staleTime: 30_000,
  });

  const entries = historyQuery.data?.entries ?? [];
  const recent = useMemo(() => entries.slice(0, 2), [entries]);

  if (!hasMealMemory || entries.length === 0) return null;

  return (
    <Link
      href="/me/history"
      className={cn(app.cardSurface, "block p-5 hover-elevate active-elevate-2 touch-manipulation")}
      data-testid="link-meal-history-entry"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className={app.titleCard}>Meal History</h2>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        {entries.length} meal{entries.length === 1 ? "" : "s"} logged
      </p>
      <ul className="space-y-1.5">
        {recent.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between gap-2 text-sm text-foreground/90">
            <span className="truncate">{entry.title ?? entry.recipe_slug}</span>
            {entry.rating ? <StarRow rating={entry.rating} /> : null}
          </li>
        ))}
      </ul>
    </Link>
  );
}
