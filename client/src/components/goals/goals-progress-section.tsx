/**
 * Firehall Meals Goals + Progress (V2) — the full "premium, restrained"
 * Progress experience (lives on /me/progress; a compact preview of this
 * same data also shows on Profile via progress-preview-card.tsx).
 *
 * Every number here comes from real "Made This" / cooked-meal history
 * (user_meal_history) plus the user's saved nutrition goal — never app-open
 * counts, never a fabricated health score, never backfilled/inferred data.
 * Gated behind the same `meal_memory` (Pro) entitlement as Meal History,
 * since there is no cooked-meal history to show progress against without it.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Lock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth/context";
import { useFeature, useRecordPaywallView } from "@/lib/billing/hooks";
import { fetchGoals, removeGoal, setGoal } from "@/lib/goals-api";
import { trackGoalCompleted, trackGoalCreated, trackGoalRemoved, trackProFeatureClicked, trackProgressPageViewed } from "@/lib/analytics";
import { GOAL_DEFINITIONS, type GoalProgress, type GoalType } from "@shared/goals/types";
import { NUTRITION_GOAL_LABELS, type NutritionGoal } from "@shared/nutrition/goal-scoring";

function valueLabel(p: GoalProgress): string {
  if (p.unit === "dollars") {
    const hasData = (p.data_coverage?.counted ?? 0) > 0;
    return hasData ? `$${p.current.toFixed(2)} / $${p.target} target` : `no cost data yet`;
  }
  return `${p.current} of ${p.target}`;
}

function contributionLine(p: GoalProgress): string {
  if (p.unit === "dollars") {
    const counted = p.data_coverage?.counted ?? 0;
    if (counted === 0) return "Log a meal with a cost estimate to start tracking this.";
    return p.completed
      ? `Averaging $${p.current.toFixed(2)}/person — under your $${p.target} target.`
      : `Averaging $${p.current.toFixed(2)}/person — above your $${p.target} target.`;
  }
  if (p.completed) return "Goal reached this month.";
  const remaining = Math.max(0, p.target - p.current);
  return `${remaining} to go this month.`;
}

function completedKey(monthKey: string, goalType: GoalType): string {
  return `fh_goal_completed_seen:${monthKey}:${goalType}`;
}

function GoalCard({ progress, onRemove, removing }: { progress: GoalProgress; onRemove: () => void; removing: boolean }) {
  const def = GOAL_DEFINITIONS[progress.goal_type];
  const snapshotLabel =
    progress.goal_type === "nutrition_goal_match" && progress.nutrition_goal_snapshot
      ? NUTRITION_GOAL_LABELS[progress.nutrition_goal_snapshot as NutritionGoal]
      : null;
  return (
    <li
      className="rounded-xl border border-border/30 bg-background/40 px-4 py-3 space-y-2"
      data-testid={`goal-card-${progress.goal_type}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            {progress.completed && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />}
            {snapshotLabel ? `Match your ${snapshotLabel} goal` : def.label}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm font-semibold tabular-nums" data-testid={`goal-value-${progress.goal_type}`}>
            {valueLabel(progress)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            disabled={removing}
            onClick={onRemove}
            aria-label={`Remove ${def.label} goal`}
            data-testid={`goal-remove-${progress.goal_type}`}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>
      <Progress value={progress.percent} className="h-2" data-testid={`goal-bar-${progress.goal_type}`} />
      <p className="text-xs text-muted-foreground">{contributionLine(progress)}</p>
    </li>
  );
}

export function GoalsProgressSection() {
  const { authenticated } = useAuth();
  const hasMealMemory = useFeature("meal_memory");
  const [, setLocation] = useLocation();
  const recordPaywall = useRecordPaywallView();
  const queryClient = useQueryClient();
  const [removingType, setRemovingType] = useState<GoalType | null>(null);
  const [addingType, setAddingType] = useState<GoalType | "">("");
  const [addingTarget, setAddingTarget] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const goalsQuery = useQuery({
    queryKey: ["/api/goals"],
    queryFn: fetchGoals,
    enabled: authenticated && hasMealMemory,
    staleTime: 30_000,
  });

  const data = goalsQuery.data;

  // progress_page_viewed — fires once real data has loaded, not on every render.
  useEffect(() => {
    if (data) trackProgressPageViewed({ active_goal_count: data.active.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data]);

  // goal_completed — client-side, deduped per (month, goal_type) via localStorage,
  // since completion is derived live rather than event-sourced server-side.
  useEffect(() => {
    if (!data) return;
    for (const p of data.completed) {
      const key = completedKey(data.month_key, p.goal_type);
      if (typeof window !== "undefined" && !window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, "1");
        trackGoalCompleted({ goal_type: p.goal_type, target: p.target, period: data.month_key });
      }
    }
  }, [data]);

  if (!authenticated) return null;

  if (!hasMealMemory) {
    return (
      <section className="rounded-2xl border border-border/40 bg-card/25 p-4 space-y-2" data-testid="goals-locked-section">
        <div className="flex items-center gap-1.5">
          <h2 className="font-heading text-sm tracking-wide">Goals + Progress</h2>
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
            <Lock className="h-2.5 w-2.5" aria-hidden />
            Pro
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Firehall Meals Pro tracks real shift-meal progress — new meals tried, High Protein shifts, budget, and more.
        </p>
        <button
          type="button"
          onClick={() => {
            trackProFeatureClicked({ feature: "meal_memory", page: "/me/progress", logged_in: authenticated });
            void recordPaywall("meal_memory", "me_progress");
            setLocation("/me/subscription?feature=meal_memory");
          }}
          className="w-full rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-left text-xs text-muted-foreground"
          data-testid="goals-locked"
        >
          Upgrade to Firehall Meals Pro to unlock Goals + Progress.
        </button>
      </section>
    );
  }

  const active = data?.active ?? [];
  const completed = data?.completed ?? [];
  const takenTypes = new Set([...active, ...completed].map((p) => p.goal_type));
  const addableTypes = (data?.available_goal_types ?? []).filter((t) => !takenTypes.has(t));
  const summary = data?.summary;
  const hasHistory = (summary?.meals_logged ?? 0) > 0;

  const selectedDef = addingType ? GOAL_DEFINITIONS[addingType] : null;

  const handleAdd = async () => {
    if (!addingType || !selectedDef) return;
    const target =
      addingTarget === "" ? selectedDef.defaultTarget : Math.max(selectedDef.minTarget, Math.min(selectedDef.maxTarget, addingTarget));
    setSubmitting(true);
    try {
      await setGoal(addingType, target);
      trackGoalCreated({ goal_type: addingType, target, period: data?.month_key });
      await queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setAddingType("");
      setAddingTarget("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (progress: GoalProgress) => {
    setRemovingType(progress.goal_type);
    try {
      await removeGoal(progress.goal_type);
      trackGoalRemoved({ goal_type: progress.goal_type, target: progress.target, period: data?.month_key });
      await queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    } finally {
      setRemovingType(null);
    }
  };

  const savedGoalLabel = summary?.saved_nutrition_goal
    ? NUTRITION_GOAL_LABELS[summary.saved_nutrition_goal as NutritionGoal]
    : null;

  return (
    <section className="rounded-2xl border border-border/40 bg-card/25 p-4 space-y-4" data-testid="goals-progress-section">
      <div>
        <h2 className="font-heading text-sm tracking-wide">Goals + Progress</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Real shift-meal progress this month — not app opens.</p>
      </div>

      {goalsQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : !hasHistory ? (
        <div className="text-center py-4 space-y-2" data-testid="goals-sparse-history-empty">
          <p className="text-sm font-medium text-foreground">Log a few meals and your progress will start appearing here.</p>
          <Button asChild size="sm" variant="outline" className="min-h-10 touch-manipulation">
            <Link href="/generator">Find a meal</Link>
          </Button>
        </div>
      ) : (
        <>
          {summary && (
            <div className="rounded-xl border border-border/30 bg-background/40 p-3" data-testid="goals-monthly-summary">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">This month</p>
              <ul className="text-sm text-foreground/90 space-y-1">
                <li>{summary.meals_logged} meal{summary.meals_logged === 1 ? "" : "s"} logged</li>
                {summary.nutrition_goal_matches != null && savedGoalLabel && (
                  <li>
                    {summary.nutrition_goal_matches} matched your {savedGoalLabel} goal
                  </li>
                )}
                {summary.new_meals_tried > 0 && (
                  <li>{summary.new_meals_tried} new recipe{summary.new_meals_tried === 1 ? "" : "s"} tried</li>
                )}
                {summary.avg_cost_per_person != null && (
                  <li>
                    Average cost/person: ${summary.avg_cost_per_person.toFixed(2)}
                    {summary.cost_data_meal_count < summary.meals_logged
                      ? ` (based on ${summary.cost_data_meal_count} of ${summary.meals_logged} meals with cost data)`
                      : ""}
                  </li>
                )}
                {summary.rated_4_plus_count > 0 && (
                  <li>{summary.rated_4_plus_count} meal{summary.rated_4_plus_count === 1 ? "" : "s"} rated 4★ or higher</li>
                )}
              </ul>
            </div>
          )}

          {active.length === 0 && completed.length === 0 ? (
            <p className="text-xs text-muted-foreground" data-testid="goals-empty">
              No goals yet. Add one below to start tracking real shift-meal progress.
            </p>
          ) : (
            <>
              {active.length > 0 && (
                <ul className="space-y-2" data-testid="goals-active-list">
                  {active.map((p) => (
                    <GoalCard key={p.goal_type} progress={p} onRemove={() => void handleRemove(p)} removing={removingType === p.goal_type} />
                  ))}
                </ul>
              )}
              {completed.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">Completed</p>
                  <ul className="space-y-2" data-testid="goals-completed-list">
                    {completed.map((p) => (
                      <GoalCard key={p.goal_type} progress={p} onRemove={() => void handleRemove(p)} removing={removingType === p.goal_type} />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </>
      )}

      {addableTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1" data-testid="goals-add-row">
          <Select
            value={addingType}
            onValueChange={(v) => {
              setAddingType(v as GoalType);
              setAddingTarget("");
            }}
          >
            <SelectTrigger className="h-10 text-sm flex-1 min-w-[10rem]" data-testid="goals-add-select">
              <SelectValue placeholder="Add a goal…" />
            </SelectTrigger>
            <SelectContent>
              {addableTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {GOAL_DEFINITIONS[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDef && (
            <Input
              type="number"
              inputMode="numeric"
              min={selectedDef.minTarget}
              max={selectedDef.maxTarget}
              placeholder={String(selectedDef.defaultTarget)}
              value={addingTarget}
              onChange={(e) => setAddingTarget(e.target.value === "" ? "" : Number(e.target.value))}
              className="h-10 w-20 text-sm"
              aria-label="Target"
              data-testid="goals-add-target"
            />
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-10 touch-manipulation"
            disabled={!addingType || submitting}
            onClick={() => void handleAdd()}
            data-testid="goals-add-button"
          >
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden />
            Set goal
          </Button>
        </div>
      )}
    </section>
  );
}
