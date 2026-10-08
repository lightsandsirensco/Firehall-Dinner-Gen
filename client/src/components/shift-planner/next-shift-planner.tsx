import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle2, ShoppingCart, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { trackShiftPlanEvent } from "@/lib/analytics";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { formatLocalDay, formatShiftTimes } from "@/lib/schedule-format";
import { scheduleErrorMessage } from "@/lib/schedule-api";
import { fillShiftPlan, patchShiftPlanSlot, shiftPlanQueryKey } from "@/lib/shift-plan-api";
import { ShiftMealCard, type ShiftMealCardActions } from "@/components/shift-planner/shift-meal-card";
import { MealCrewSheet } from "@/components/shift-planner/meal-crew-sheet";
import { RecipeBrowseSheet } from "@/components/shift-planner/recipe-browse-sheet";
import { formatHours } from "@shared/schedule/setup";
import { autofillTargets, isSlotResolved, type ShiftPlanSlotPatch } from "@shared/shift-plan/plan";
import { shiftShoppingTargets } from "@shared/shift-plan/shopping";
import {
  simplifiedFiltersToGenerateRequest,
  type SimplifiedGeneratorFilters,
} from "@shared/generator-simplified";
import type { PlannedMealSlot, ShiftPlanView } from "@shared/shift-plan/types";
import type { ShiftInstance } from "@shared/schedule/types";

function ShiftHeader({
  shift,
  inProgress,
  planned,
  total,
  complete,
}: {
  shift: ShiftInstance;
  inProgress: boolean;
  planned: number;
  total: number;
  complete: boolean;
}) {
  return (
    <header className="space-y-1" data-testid="shift-plan-header">
      <p className={app.eyebrowAccent}>{inProgress ? "On shift now" : "Next shift"}</p>
      <h1 className="font-heading text-2xl tracking-tight sm:text-3xl" data-testid="text-shift-date">
        {formatLocalDay(shift.startLocal)}
      </h1>
      <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground tabular-nums" data-testid="text-shift-meta">
        <span>{formatShiftTimes(shift.startLocal, shift.endLocal)}</span>
        <span aria-hidden>·</span>
        <span>{formatHours(shift.scheduledMinutes)}</span>
        <span aria-hidden>·</span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden />
          Crew of {shift.crewSize}
        </span>
      </p>
      {total > 0 ? (
        <p
          className={cn("flex items-center gap-1 pt-1 text-xs", complete ? "text-emerald-400" : "text-muted-foreground")}
          data-testid="text-plan-progress"
        >
          {complete ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : null}
          {complete ? "Shift planned" : `${planned} of ${total} meals planned`}
        </p>
      ) : null}
    </header>
  );
}

/** Shift Planner v2 — plan every meal of the user's next scheduled shift. */
export function NextShiftPlanner({
  plan,
  filters,
}: {
  plan: ShiftPlanView & { shift: ShiftInstance };
  filters: SimplifiedGeneratorFilters;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const shift = plan.shift;
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const [crewSlot, setCrewSlot] = useState<PlannedMealSlot | null>(null);
  const [browseSlot, setBrowseSlot] = useState<PlannedMealSlot | null>(null);
  /** Slugs already shown per slot this session — Swap never brings them back. */
  const seen = useRef(new Map<string, Set<string>>());
  const wasComplete = useRef(plan.complete);

  const inProgress = Date.parse(shift.start) <= Date.now();
  const showDay = new Set(plan.slots.map((s) => s.mealDate)).size > 1;
  const resolvedCount = plan.slots.filter(isSlotResolved).length;
  const anyBusy = busyKeys.size > 0;
  const dietary = useMemo(() => simplifiedFiltersToGenerateRequest(filters).dietary_restrictions ?? [], [filters]);

  const remember = (slotKey: string, ...slugs: Array<string | null | undefined>) => {
    const set = seen.current.get(slotKey) ?? new Set<string>();
    for (const s of slugs) if (s) set.add(s);
    seen.current.set(slotKey, set);
  };

  const accept = useCallback(
    (next: ShiftPlanView, created: boolean) => {
      queryClient.setQueryData(shiftPlanQueryKey, next);
      const params = { shift_key: shift.key, shift_hours: Math.round(shift.scheduledMinutes / 60) };
      if (created) trackShiftPlanEvent("shift_plan_started", params);
      if (next.complete && !wasComplete.current) {
        trackShiftPlanEvent("shift_plan_completed", { ...params, meal_count: next.slots.length });
        hapticSuccess();
      }
      wasComplete.current = next.complete;
    },
    [queryClient, shift.key, shift.scheduledMinutes],
  );

  const fail = useCallback(
    (err: unknown, fallback: string) => {
      const message = scheduleErrorMessage(err, fallback);
      toast({ title: message, variant: "destructive" });
      if (err instanceof Error && err.message.startsWith("409")) {
        void queryClient.invalidateQueries({ queryKey: shiftPlanQueryKey });
      }
    },
    [queryClient, toast],
  );

  const withBusy = async (keys: string[], fn: () => Promise<void>) => {
    setBusyKeys(new Set(keys));
    try {
      await fn();
    } finally {
      setBusyKeys(new Set());
    }
  };

  const autofill = () => {
    const targets = autofillTargets(plan.slots);
    if (targets.length === 0) {
      toast({ title: "Every meal is locked, skipped or BYO." });
      return;
    }
    hapticLight();
    void withBusy(
      targets.map((t) => t.key),
      async () => {
        try {
          const res = await fillShiftPlan({ shiftKey: shift.key, mode: "fill", filters });
          for (const r of res.results) remember(r.slotKey, r.recipeSlug, r.previousSlug);
          const filled = res.results.filter((r) => r.ok).length;
          trackShiftPlanEvent("shift_plan_autofilled", {
            shift_key: shift.key,
            shift_hours: Math.round(shift.scheduledMinutes / 60),
            filled_count: filled,
            failed_count: res.results.length - filled,
            meal_count: res.plan.slots.length,
          });
          accept(res.plan, res.created);
          if (filled < res.results.length) {
            toast({ title: "Some meals couldn't be filled with your filters — try Browse." });
          }
        } catch (err) {
          fail(err, "Couldn't auto-fill this shift");
        }
      },
    );
  };

  const actions: ShiftMealCardActions = {
    onPick: (slot) => {
      hapticLight();
      void withBusy([slot.key], async () => {
        try {
          const res = await fillShiftPlan({ shiftKey: shift.key, mode: "fill", slotKeys: [slot.key], filters });
          const result = res.results[0];
          remember(slot.key, result?.recipeSlug);
          if (result?.ok && result.recipeSlug) {
            trackShiftPlanEvent("shift_meal_selected", {
              shift_key: shift.key,
              meal_type: slot.type,
              recipe_slug: result.recipeSlug,
              source: "auto",
            });
          } else {
            toast({ title: "No meal fits this slot with your filters — try Browse." });
          }
          accept(res.plan, res.created);
        } catch (err) {
          fail(err, "Couldn't pick a meal");
        }
      });
    },
    onSwap: (slot) => {
      hapticLight();
      remember(slot.key, slot.recipe?.slug);
      void withBusy([slot.key], async () => {
        try {
          const res = await fillShiftPlan({
            shiftKey: shift.key,
            mode: "swap",
            slotKeys: [slot.key],
            filters,
            excludeSlugs: [...(seen.current.get(slot.key) ?? [])],
          });
          const result = res.results[0];
          remember(slot.key, result?.recipeSlug);
          if (result?.ok && result.recipeSlug) {
            trackShiftPlanEvent("shift_meal_swapped", {
              shift_key: shift.key,
              meal_type: slot.type,
              recipe_slug: result.recipeSlug,
              ...(result.previousSlug ? { previous_slug: result.previousSlug } : {}),
            });
          } else {
            toast({ title: "No other meal fits this slot — try Browse." });
          }
          accept(res.plan, res.created);
        } catch (err) {
          fail(err, "Couldn't swap this meal");
        }
      });
    },
    onBrowse: (slot) => setBrowseSlot(slot),
    onCrew: (slot) => setCrewSlot(slot),
    onPatch: (slot, patch) => {
      void savePatch(slot, patch);
    },
  };

  const savePatch = async (slot: PlannedMealSlot, patch: ShiftPlanSlotPatch): Promise<boolean> => {
    let saved = false;
    await withBusy([slot.key], async () => {
      try {
        const res = await patchShiftPlanSlot({ shiftKey: shift.key, slotKey: slot.key, ...patch });
        if (patch.skipped) {
          trackShiftPlanEvent("shift_meal_skipped", { shift_key: shift.key, meal_type: slot.type });
        }
        accept(res.plan, res.created);
        saved = true;
      } catch (err) {
        fail(err, "Couldn't save that change");
      }
    });
    return saved;
  };

  const unresolvedOpen = plan.slots.some((s) => !s.locked && !s.skipped && !s.byo);
  const shoppableMeals = shiftShoppingTargets(plan.slots).length;

  return (
    <div className="space-y-5" data-testid="next-shift-planner">
      <ShiftHeader
        shift={shift}
        inProgress={inProgress}
        planned={resolvedCount}
        total={plan.slots.length}
        complete={plan.complete}
      />

      {plan.slots.length === 0 ? (
        <section className={cn(app.cardSurface, "p-5 text-sm text-muted-foreground")} data-testid="shift-plan-no-meals">
          No meal times fall inside this shift. You can change meal times from My Schedule.
        </section>
      ) : (
        <>
          <div className="space-y-1.5">
            <Button
              size="lg"
              className="min-h-12 w-full touch-manipulation"
              onClick={autofill}
              disabled={anyBusy || !unresolvedOpen}
              data-testid="button-autofill-shift"
            >
              <Sparkles className={cn("mr-2 h-4 w-4", anyBusy && "animate-pulse")} aria-hidden />
              {anyBusy && busyKeys.size > 1 ? "Planning your shift…" : "Auto-fill shift"}
            </Button>
            {plan.slots.some((s) => s.locked) ? (
              <p className="text-center text-xs text-muted-foreground">Locked meals stay put.</p>
            ) : null}
          </div>

          <div className="space-y-3" data-testid="shift-meal-list">
            {plan.slots.map((slot) => (
              <ShiftMealCard
                key={slot.key}
                slot={slot}
                showDay={showDay}
                busy={busyKeys.has(slot.key)}
                disabled={anyBusy}
                actions={actions}
              />
            ))}
          </div>

          {shoppableMeals > 0 ? (
            <Button
              asChild
              size="lg"
              variant={plan.complete ? "default" : "outline"}
              className="min-h-12 w-full touch-manipulation"
              data-testid="button-shop-for-shift"
            >
              <Link href="/shift-planner/shop">
                <ShoppingCart className="mr-2 h-4 w-4" aria-hidden />
                Shop for this shift
                <span className="ml-1.5 font-normal opacity-80">
                  · {shoppableMeals} meal{shoppableMeals === 1 ? "" : "s"}
                </span>
              </Link>
            </Button>
          ) : null}
        </>
      )}

      <MealCrewSheet
        slot={crewSlot}
        onClose={() => setCrewSlot(null)}
        onSave={(slot, crewSizeOverride) => {
          setCrewSlot(null);
          void savePatch(slot, { crewSizeOverride });
        }}
      />
      <RecipeBrowseSheet
        slot={browseSlot}
        dietary={dietary}
        avoidIngredients={filters.foodsToAvoid}
        onClose={() => setBrowseSlot(null)}
        onSelect={(slot, entry) => {
          setBrowseSlot(null);
          remember(slot.key, entry.slug);
          void savePatch(slot, { recipeSlug: entry.slug }).then((saved) => {
            if (!saved) return;
            trackShiftPlanEvent("shift_meal_selected", {
              shift_key: shift.key,
              meal_type: slot.type,
              recipe_slug: entry.slug,
              source: "manual",
            });
          });
        }}
      />
    </div>
  );
}
