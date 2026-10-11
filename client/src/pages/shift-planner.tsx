import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { CalendarDays, ChevronRight, Lock, UtensilsCrossed } from "lucide-react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { SiteFooter } from "@/components/site-footer";
import { useTonightSelection } from "@/hooks/use-tonight-selection";
import { useNoIndex } from "@/lib/seo/use-noindex";
import { PICK_TONIGHT, SHIFT, TONIGHT } from "@/lib/app-nav";
import { tonightShortcut, type TonightShortcut } from "@/lib/shift-home";
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
import { useProPaywall } from "@/components/billing/pro-paywall";
import {
  fetchShiftPlan,
  fetchUpcomingShiftPlans,
  isPlanAheadRequired,
  planQueryKeyFor,
  upcomingShiftPlansQueryKey,
} from "@/lib/shift-plan-api";
import { NextShiftPlanner, daysAhead } from "@/components/shift-planner/next-shift-planner";
import { QuickOccasionPlanner } from "@/components/shift-planner/quick-occasion-planner";
import { UpcomingShiftsList } from "@/components/shift-planner/upcoming-shifts-list";
import { LearnLaterPrompts } from "@/components/shift-planner/learn-later-prompts";
import { ScheduleOnboarding } from "@/components/schedule/schedule-onboarding";
import { useToast } from "@/hooks/use-toast";
import type { ScheduleOnboardingEntry } from "@/lib/analytics";
import { SCHEDULE_ONBOARDING_PARAM, wantsScheduleOnboarding } from "@/lib/onboarding/schedule-onboarding";
import { PLAN_AHEAD_WINDOW_DAYS, shiftPlanStatus } from "@shared/shift-plan/plan-ahead";
import { isSlotResolved } from "@shared/shift-plan/plan";
import type { ShiftInstance } from "@shared/schedule/types";
import type { UpcomingShift } from "@shared/shift-plan/types";

const DEFAULT_CREW_SUGGESTION = 4;

function NoShiftCard({ hasSchedule, onPlan }: { hasSchedule: boolean; onPlan: () => void }) {
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
          : "Four quick questions about your rotation and we'll plan breakfast, lunch, dinner and late night for your next shift."}
      </p>
      {hasSchedule ? (
        <Button asChild className="min-h-11 w-full sm:w-auto" data-testid="link-setup-schedule">
          <Link href="/me/schedule">Open My Schedule</Link>
        </Button>
      ) : (
        <Button className="min-h-11 w-full sm:w-auto" onClick={onPlan} data-testid="button-plan-my-shift">
          Plan my shift
        </Button>
      )}
    </section>
  );
}

/** A Plan Ahead deep link the user can't open: beyond the free shift without Pro, or no longer on the schedule. */
function UnavailableShiftCard({ locked, onUpgrade }: { locked: boolean; onUpgrade: () => void }) {
  return (
    <section className={cn(app.cardSurface, "space-y-3 p-5")} data-testid={locked ? "plan-ahead-locked" : "shift-plan-gone"}>
      <div className="flex items-center gap-2">
        {locked ? <Lock className="h-4 w-4 text-primary" aria-hidden /> : <CalendarDays className="h-5 w-5 text-primary" aria-hidden />}
        <h2 className="font-heading text-lg tracking-tight">
          {locked ? "Plan further ahead with Pro" : "That shift isn't coming up"}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {locked
          ? `Your next shift is always free to plan. Pro lets you plan any shift in the next ${PLAN_AHEAD_WINDOW_DAYS} days.`
          : "It may have been cancelled or changed on your schedule."}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {locked ? (
          <Button className="min-h-11" onClick={onUpgrade} data-testid="button-plan-ahead-upgrade">
            See Pro
          </Button>
        ) : null}
        <Button asChild variant={locked ? "outline" : "default"} className="min-h-11">
          <Link href={SHIFT}>Plan my next shift</Link>
        </Button>
      </div>
    </section>
  );
}

function TonightShortcutRow({ kind, mealTitle }: { kind: Exclude<TonightShortcut, null>; mealTitle?: string }) {
  const current = kind === "current_meal";
  return (
    <Link
      href={current ? TONIGHT : PICK_TONIGHT}
      className={cn(
        app.cardSurface,
        "flex min-h-[60px] items-center gap-3 px-4 py-3 touch-manipulation hover-elevate active-elevate-2",
      )}
      data-testid={current ? "shift-tonight-meal" : "shift-pick-tonight"}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <UtensilsCrossed className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug">
          {current ? "Tonight's meal" : "Pick Tonight"}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {current ? mealTitle : "Need dinner now? Get a crew-sized pick in 3 taps."}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </Link>
  );
}

/** Shift (/shift) — the signed-in home: next/current shift, its meals, its list. */
export default function ShiftPlannerPage() {
  useNoIndex();
  const tonightPick = useTonightSelection();
  const { authenticated, openSignIn, profile, preferences } = useAuth();
  const { detail, activeHall } = useHallMembership();
  const hallLinked = Boolean(activeHall && detail?.hall);
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { openProPaywall } = useProPaywall();

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

  const upcomingQuery = useQuery({
    queryKey: upcomingShiftPlansQueryKey,
    queryFn: fetchUpcomingShiftPlans,
    enabled: authenticated,
    staleTime: 30_000,
  });
  const upcoming = upcomingQuery.data;

  const requestedKey = useMemo(() => new URLSearchParams(search).get("shift"), [search]);
  const nextKey = upcoming?.shifts.find((s) => s.isNext)?.shift.key ?? null;
  const targetKey = requestedKey && requestedKey !== nextKey ? requestedKey : null;
  const planKey = planQueryKeyFor(targetKey);

  const planQuery = useQuery({
    queryKey: planKey,
    queryFn: () => fetchShiftPlan(targetKey),
    enabled: authenticated,
    staleTime: 30_000,
    retry: (count, err) => !isPlanAheadRequired(err) && !(err instanceof Error && err.message.startsWith("404")) && count < 2,
  });
  const plan = planQuery.data;
  const lockedDeepLink = planQuery.isError && isPlanAheadRequired(planQuery.error);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [setupEntry, setSetupEntry] = useState<ScheduleOnboardingEntry | null>(null);
  const [justOnboarded, setJustOnboarded] = useState(false);
  const onboardedAt = useRef(0);

  useEffect(() => {
    if (!authenticated || !wantsScheduleOnboarding(search)) return;
    setSetupEntry((cur) => cur ?? "deep_link");
    const params = new URLSearchParams(search);
    params.delete(SCHEDULE_ONBOARDING_PARAM);
    const rest = params.toString();
    setLocation(rest ? `${SHIFT}?${rest}` : SHIFT, { replace: true });
  }, [authenticated, search, setLocation]);

  const finishOnboarding = () => {
    onboardedAt.current = Date.now();
    setJustOnboarded(true);
    setSetupEntry(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    void queryClient.invalidateQueries({ queryKey: upcomingShiftPlansQueryKey });
    void queryClient.invalidateQueries({ queryKey: planKey });
    toast({ title: "Schedule saved", description: "Here's your next shift. Swap any meal you don't like.", variant: "success" });
  };
  const showSetup = authenticated && setupEntry != null && plan != null && !plan.hasSchedule;
  const awaitingFirstPlan =
    justOnboarded &&
    !plan?.hasSchedule &&
    !planQuery.isError &&
    (planQuery.isFetching || planQuery.dataUpdatedAt < onboardedAt.current);
  const hasPlannedMeal = Boolean(plan?.slots.some(isSlotResolved));

  const openPlanAheadPaywall = useCallback(
    (entry: "upcoming_list" | "deep_link", shift?: UpcomingShift["shift"]) => {
      trackShiftPlanEvent("plan_ahead_paywall_viewed", {
        entry,
        ...(shift ? { shift_key: shift.key, days_ahead: daysAhead(shift), shift_source: shift.source } : {}),
      });
      openProPaywall("plan_ahead", `shift_planner_${entry}`);
    },
    [openProPaywall],
  );

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
    if (plan.planAhead) {
      trackShiftPlanEvent("future_shift_viewed", {
        shift_key: shift.key,
        shift_hours: Math.round(shift.scheduledMinutes / 60),
        days_ahead: daysAhead(shift),
        shift_source: shift.source,
        status: shiftPlanStatus(plan.slots),
      });
    }
  }, [plan]);

  const openShift = (row: UpcomingShift) => {
    setLocation(row.isNext ? SHIFT : `${SHIFT}?shift=${encodeURIComponent(row.shift.key)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shortcut =
    authenticated && !planQuery.isLoading && !planQuery.isError
      ? tonightShortcut({
          hasTonightPick: Boolean(tonightPick),
          planAhead: Boolean(plan?.planAhead),
          shift: plan?.shift ?? null,
        })
      : null;

  return (
    <div className={cn(app.page, "bg-background")} data-testid="shift-home-page">
      <AppTopBar title="Shift" />
      <main className={cn(app.main, "py-4 sm:py-8 pb-safe-tabs-cta")}>
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
                <Button
                  onClick={() => openSignIn(`${SHIFT}?${SCHEDULE_ONBOARDING_PARAM}=1`)}
                  data-testid="button-shift-planner-sign-in"
                >
                  Sign in to plan my shift
                </Button>
              </section>
            </>
          ) : planQuery.isLoading || awaitingFirstPlan ? (
            <LoadingState variant="compact" />
          ) : showSetup ? (
            <ScheduleOnboarding
              entry={setupEntry}
              suggestedCrewSize={profile?.crew_size ?? DEFAULT_CREW_SUGGESTION}
              onCompleted={finishOnboarding}
              onCancel={() => setSetupEntry(null)}
            />
          ) : planQuery.isError && targetKey ? (
            <UnavailableShiftCard locked={lockedDeepLink} onUpgrade={() => openPlanAheadPaywall("deep_link")} />
          ) : planQuery.isError ? (
            <section className={cn(app.cardSurface, "p-5 space-y-3 text-sm")} data-testid="shift-plan-error">
              <p className="text-muted-foreground">Couldn't load your shift plan.</p>
              <Button variant="outline" size="sm" onClick={() => void planQuery.refetch()}>
                Try again
              </Button>
            </section>
          ) : plan?.shift ? (
            <div className="space-y-5">
              <NextShiftPlanner
                key={plan.shift.key}
                plan={{ ...plan, shift: plan.shift as ShiftInstance }}
                filters={filters}
                queryKey={planKey}
                autoFill={justOnboarded && !plan.planAhead}
              />
              {shortcut ? <TonightShortcutRow kind={shortcut} mealTitle={tonightPick?.title} /> : null}
              <LearnLaterPrompts hasValue={hasPlannedMeal} />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-3">
                <NoShiftCard hasSchedule={Boolean(plan?.hasSchedule)} onPlan={() => setSetupEntry("shift_home")} />
                {shortcut ? <TonightShortcutRow kind={shortcut} mealTitle={tonightPick?.title} /> : null}
              </div>
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

          {authenticated && upcoming && !showSetup ? (
            <div className="mt-10">
              <UpcomingShiftsList
                view={upcoming}
                selectedKey={plan?.shift?.key ?? null}
                onOpen={openShift}
                onLocked={(row) => openPlanAheadPaywall("upcoming_list", row.shift)}
              />
            </div>
          ) : null}
        </div>
      </main>
      <SiteFooter variant="compact" className="mt-10" pbSafe />
    </div>
  );
}
