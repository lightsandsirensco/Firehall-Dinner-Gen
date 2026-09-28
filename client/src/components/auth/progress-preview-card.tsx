/**
 * "Your Progress" preview for the Profile page — reuses the same
 * card treatment as YourFoodCard/MealHistoryPreviewCard right above it.
 * Renders nothing when there's no real active goal to preview (not
 * entitled, no goal set, or no history yet) — no fake/empty metrics.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { useFeature } from "@/lib/billing/hooks";
import { fetchGoals } from "@/lib/goals-api";
import { GOAL_DEFINITIONS } from "@shared/goals/types";
import { NUTRITION_GOAL_LABELS, type NutritionGoal } from "@shared/nutrition/goal-scoring";
import { Progress } from "@/components/ui/progress";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export function ProgressPreviewCard() {
  const { authenticated } = useAuth();
  const hasMealMemory = useFeature("meal_memory");

  const goalsQuery = useQuery({
    queryKey: ["/api/goals"],
    queryFn: fetchGoals,
    enabled: authenticated && hasMealMemory,
    staleTime: 30_000,
  });

  const data = goalsQuery.data;
  const topGoal = data?.active[0] ?? data?.completed[0] ?? null;

  if (!hasMealMemory || !topGoal || !data?.summary) return null;

  const def = GOAL_DEFINITIONS[topGoal.goal_type];
  const snapshotLabel =
    topGoal.goal_type === "nutrition_goal_match" && topGoal.nutrition_goal_snapshot
      ? NUTRITION_GOAL_LABELS[topGoal.nutrition_goal_snapshot as NutritionGoal]
      : null;
  const goalLabel = snapshotLabel ? `Match your ${snapshotLabel} goal` : def.label;
  const valueLabel =
    topGoal.unit === "dollars"
      ? `$${topGoal.current.toFixed(2)} / $${topGoal.target}`
      : `${topGoal.current} of ${topGoal.target}`;

  return (
    <Link
      href="/me/progress"
      className={cn(app.cardSurface, "block p-5 hover-elevate active-elevate-2 touch-manipulation")}
      data-testid="link-progress-entry"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className={app.titleCard}>Your Progress</h2>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      </div>
      <div className="space-y-1.5 mb-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-foreground/90">{goalLabel}</span>
          <span className="font-medium tabular-nums">{valueLabel}</span>
        </div>
        <Progress value={topGoal.percent} className="h-1.5" />
      </div>
      <p className="text-sm text-muted-foreground">
        {data.summary.meals_logged} meal{data.summary.meals_logged === 1 ? "" : "s"} logged this month
        {data.summary.avg_cost_per_person != null ? ` · ~$${data.summary.avg_cost_per_person.toFixed(2)}/person` : ""}
      </p>
    </Link>
  );
}
