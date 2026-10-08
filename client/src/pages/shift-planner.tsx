import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CalendarDays } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/loading-state";
import { useAuth } from "@/lib/auth/context";
import { useHallMembership } from "@/lib/hall-membership/context";
import {
  loadInitialGeneratorFilters,
  mergeAuthAndHallIntoFilters,
} from "@/lib/generator-personalization";
import type { SimplifiedGeneratorFilters } from "@shared/generator-simplified";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { profileToLocationQuery } from "@/lib/recipe-cost-estimate";
import { trackShiftPlanEvent } from "@/lib/analytics";
import { fetchShiftPlan, shiftPlanQueryKey } from "@/lib/shift-plan-api";
import { NextShiftPlanner } from "@/components/shift-planner/next-shift-planner";
import { QuickOccasionPlanner } from "@/components/shift-planner/quick-occasion-planner";
import type { ShiftInstance } from "@shared/schedule/types";

function NoShiftCard({ hasSchedule }: { hasSchedule: boolean }) {
  return (
    <section className={cn(app.cardSurface, "space-y-3 p-5")} data-testid="shift-plan-no-shift">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="font-heading text-lg tracking-tight">
          {hasSchedule ? "No upcoming shifts" : "Plan your next shift"}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {hasSchedule
          ? "Nothing is on your schedule right now. Add an extra shift or check your rotation."
          : "Set your rotation once and we'll line up breakfast, lunch, dinner and late night for every shift."}
      </p>
      <Button asChild className="min-h-11 w-full sm:w-auto" data-testid="link-setup-schedule">
        <Link href="/me/schedule">{hasSchedule ? "Open My Schedule" : "Set up my schedule"}</Link>
      </Button>
    </section>
  );
}

export default function ShiftPlannerPage() {
  const { authenticated, openSignIn, profile, preferences } = useAuth();
  const { detail, activeHall } = useHallMembership();
  const hallLinked = Boolean(activeHall && detail?.hall);

  const filters = useMemo<SimplifiedGeneratorFilters>(() => {
    const base = loadInitialGeneratorFilters();
    return mergeAuthAndHallIntoFilters(base, {
      preferences,
      hall: detail?.hall ?? null,
      hallLinked,
      profile,
    });
  }, [preferences, profile, detail?.hall, hallLinked]);
  const costLocation = useMemo(() => profileToLocationQuery(profile), [profile]);

  const planQuery = useQuery({
    queryKey: shiftPlanQueryKey,
    queryFn: fetchShiftPlan,
    enabled: authenticated,
    staleTime: 30_000,
  });
  const plan = planQuery.data;

  const viewedKey = useRef<string | null>(null);
  useEffect(() => {
    const shift = plan?.shift;
    if (!shift || viewedKey.current === shift.key) return;
    viewedKey.current = shift.key;
    trackShiftPlanEvent("shift_viewed", {
      shift_key: shift.key,
      shift_hours: Math.round(shift.scheduledMinutes / 60),
      meal_count: plan.slots.length,
      planned: plan.started ? 1 : 0,
    });
  }, [plan]);

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background">
      <SiteHeader activePage="generator" />
      <main className={cn(app.main, "py-6 sm:py-8 pb-24")}>
        <div className="mx-auto max-w-xl">
          {!authenticated ? (
            <>
              <header className="mb-6">
                <h1 className="font-heading text-2xl sm:text-3xl tracking-tight">Plan your shift</h1>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Every meal for your next shift, matched to your crew and dietary needs.
                </p>
              </header>
              <section className={cn(app.cardSurface, "p-6 text-center space-y-3")}>
                <p className="text-sm text-muted-foreground">
                  Sign in to plan a shift with your saved crew size, dietary needs, and preferences.
                </p>
                <Button onClick={() => openSignIn("/shift-planner")} data-testid="button-shift-planner-sign-in">
                  Sign in to plan
                </Button>
              </section>
            </>
          ) : planQuery.isLoading ? (
            <LoadingState variant="compact" />
          ) : planQuery.isError ? (
            <section className={cn(app.cardSurface, "p-5 space-y-3 text-sm")} data-testid="shift-plan-error">
              <p className="text-muted-foreground">Couldn't load your shift plan.</p>
              <Button variant="outline" size="sm" onClick={() => void planQuery.refetch()}>
                Try again
              </Button>
            </section>
          ) : plan?.shift ? (
            <NextShiftPlanner plan={{ ...plan, shift: plan.shift as ShiftInstance }} filters={filters} />
          ) : (
            <div className="space-y-8">
              <NoShiftCard hasSchedule={Boolean(plan?.hasSchedule)} />
              <section className="space-y-4" data-testid="quick-occasion-planner">
                <div>
                  <h2 className="font-heading text-lg tracking-tight">Or plan a few meals now</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pick the meals your crew needs — nothing is saved.
                  </p>
                </div>
                <QuickOccasionPlanner
                  filters={filters}
                  hallId={hallLinked ? activeHall?.hall_id : undefined}
                  costLocation={costLocation}
                />
              </section>
            </div>
          )}
        </div>
      </main>
      <SiteFooter variant="compact" className="mt-10" pbSafe />
    </div>
  );
}
