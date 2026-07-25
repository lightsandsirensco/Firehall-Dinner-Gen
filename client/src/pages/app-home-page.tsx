import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Compass, RotateCw, User } from "lucide-react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { HubTile } from "@/components/app-shell/hub-tile";
import { HomeDinnerSuggest, buildDinnerSuggestions } from "@/components/home/home-dinner-suggest";
import { HomeNextUpCard } from "@/components/home/home-next-up-card";
import { HomeReturnReasons } from "@/components/home/home-return-reasons";
import { HomeRitualNext } from "@/components/home/home-ritual-next";
import { HomeRitualStatus } from "@/components/home/home-ritual-status";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth/context";
import { useHallMembership } from "@/lib/hall-membership/context";
import { useTonightHub } from "@/hooks/use-tonight-hub";
import { useHallHistory } from "@/hooks/use-hall-history";
import { APP_HOME, CTA } from "@/lib/brand-copy";
import { buildRitualChecks } from "@/lib/home/build-ritual-checks";
import { buildReturnReasons } from "@/lib/home/return-reasons";
import {
  getLocalHour,
  isDinnerWindow,
  resolveRitualNextAction,
  resolveRitualPhase,
  ritualEyebrow,
  ritualGreeting,
  type RitualSnapshot,
} from "@/lib/home/shift-ritual";
import { app } from "@/lib/design-tokens";
import { getSavedCount, getSavedMeals } from "@/lib/saved-meals";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { HALL_HISTORY_CHANGED_EVENT } from "@/lib/hall-history-store";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import {
  isPersonalOnboardingComplete,
  onboardingSignalsFromAuth,
  personalOnboardingStep,
  readPersonalOnboardingProgress,
  shouldShowPersonalOnboardingFunnel,
  type PersonalOnboardingStep,
} from "@/lib/onboarding/state";
import { cn } from "@/lib/utils";

/**
 * Tonight (/tonight) — the in-app dashboard, not Home. It reinforces natural
 * reasons to open before dinner: tonight's meal, vote, shopping, continue
 * cooking, favorites, suggestions. No artificial engagement — only open loops
 * from tonight's dinner. (Home is the landing page at "/".)
 */
export default function AppHomePage() {
  const { authenticated, openSignIn, user, profile, halls } = useAuth();
  const { activeHallId } = useHallMembership();
  const hub = useTonightHub();
  const { lastMealCooked } = useHallHistory();
  const [savedCount, setSavedCount] = useState(() => getSavedCount());
  const [listTick, setListTick] = useState(0);
  const [onboardingTick, setOnboardingTick] = useState(0);
  const [hour, setHour] = useState(() => getLocalHour());

  const hasHall = Boolean(activeHallId) || halls.length > 0;

  useEffect(() => {
    const refresh = () => {
      setSavedCount(getSavedCount());
      setListTick((v) => v + 1);
    };
    const onDismiss = () => setOnboardingTick((v) => v + 1);
    window.addEventListener("favorites-changed", refresh);
    window.addEventListener("fh-onboarding-dismissed", onDismiss);
    window.addEventListener(HALL_HISTORY_CHANGED_EVENT, refresh);
    const tick = window.setInterval(() => setHour(getLocalHour()), 60_000);
    return () => {
      window.removeEventListener("favorites-changed", refresh);
      window.removeEventListener("fh-onboarding-dismissed", onDismiss);
      window.removeEventListener(HALL_HISTORY_CHANGED_EVENT, refresh);
      window.clearInterval(tick);
    };
  }, []);

  const cookHref = useMemo(() => {
    if (!lastMealCooked) return undefined;
    if (lastMealCooked.recipePath) return `${lastMealCooked.recipePath}?cook=1`;
    if (lastMealCooked.recipeSlug) {
      return `${approvedCatalogRecipePath(lastMealCooked.recipeSlug)}?cook=1`;
    }
    return undefined;
  }, [lastMealCooked]);

  const dinnerTitle =
    hub.tonightPick?.title ?? hub.cookTitle ?? hub.lastGenerated?.title ?? null;

  const recipeCookHref = useMemo(() => {
    if (hub.tonightRecipeHref) return `${hub.tonightRecipeHref}?cook=1`;
    if (cookHref) return cookHref;
    return undefined;
  }, [cookHref, hub.tonightRecipeHref]);

  const cookingInProgress = Boolean(
    dinnerTitle &&
      lastMealCooked?.title &&
      lastMealCooked.title === dinnerTitle &&
      cookHref,
  );

  const suggestions = useMemo(() => {
    void listTick;
    return buildDinnerSuggestions(getSavedMeals(), getRecentlyViewed(6), 3);
  }, [listTick]);

  const snap: RitualSnapshot = useMemo(
    () => ({
      dinnerTitle,
      voteOpen: Boolean(hub.voteOpen),
      voteHref: hub.voteHref,
      voteStatusText: hub.voteStatusText,
      voteLoading: hub.voteLoading,
      pendingItems: hub.pendingItems,
      shoppingHref: hub.shoppingHref,
      shoppingLoading: hub.shoppingLoading,
      runnerName: hub.runnerName,
      cookHref,
      recipeCookHref,
      cookingInProgress,
      hasHall,
    }),
    [
      dinnerTitle,
      hub.voteOpen,
      hub.voteHref,
      hub.voteStatusText,
      hub.voteLoading,
      hub.pendingItems,
      hub.shoppingHref,
      hub.shoppingLoading,
      hub.runnerName,
      cookHref,
      recipeCookHref,
      cookingInProgress,
      hasHall,
    ],
  );

  const phase = useMemo(() => resolveRitualPhase(snap), [snap]);
  const nextAction = useMemo(() => resolveRitualNextAction(snap), [snap]);
  const checks = useMemo(() => buildRitualChecks(snap, phase), [snap, phase]);
  const returnReasons = useMemo(
    () =>
      buildReturnReasons(snap, {
        savedCount,
        suggestCount: suggestions.length,
        phase,
      }),
    [snap, savedCount, suggestions.length, phase],
  );

  const nextStep: PersonalOnboardingStep | null = useMemo(() => {
    if (!authenticated || !user?.user_id) return null;
    if (!shouldShowPersonalOnboardingFunnel(user.user_id)) return null;
    const signals = onboardingSignalsFromAuth(halls, profile);
    const progress = readPersonalOnboardingProgress(user.user_id, signals);
    if (isPersonalOnboardingComplete(progress, halls.length > 0)) return null;
    const step = personalOnboardingStep(progress, halls.length > 0);
    if (step === "hall_question" || step === "connect_hall") return null;
    return step === "completed" ? null : step;
  }, [authenticated, user?.user_id, halls, profile, onboardingTick]);

  const heading = nextStep
    ? APP_HOME.welcomeNew
    : ritualGreeting({ dinnerTitle, hour });

  const subtitle = !dinnerTitle
    ? isDinnerWindow(hour)
      ? APP_HOME.ritualWindowHint
      : authenticated
        ? APP_HOME.subtitleMember
        : APP_HOME.subtitleGuest
    : phase === "vote"
      ? "Crew is voting — cast yours next."
      : phase === "shop"
        ? "Dinner is set — finish the shop."
        : phase === "continue"
          ? "Cook mode is waiting — pick up where you left off."
          : phase === "cook"
            ? "Dinner is set — time to cook."
            : "Dinner's locked — open the recipe anytime tonight.";

  const showSuggest = phase === "decide" && !nextStep && suggestions.length > 0;
  const tomorrowHook =
    phase === "settled" || phase === "cook" || phase === "continue"
      ? APP_HOME.returnTomorrowLocked
      : APP_HOME.returnTomorrowOpen;

  return (
    <div className={cn(app.page, "bg-background")} data-testid="app-home-page">
      <AppTopBar title="Tonight" />

      <main className={cn(app.main, app.mobileScreen)}>
        <header className="space-y-1 px-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {ritualEyebrow(hour)}
          </p>
          <h1 className="font-heading text-2xl tracking-wide line-clamp-2">{heading}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
          {hasHall && hub.hallName ? (
            <p className="text-xs font-medium text-muted-foreground/90">{hub.hallName}</p>
          ) : null}
        </header>

        {nextStep ? <HomeNextUpCard step={nextStep} /> : null}

        {!nextStep ? <HomeRitualNext action={nextAction} /> : null}

        {!nextStep ? <HomeReturnReasons reasons={returnReasons} /> : null}

        <HomeRitualStatus checks={checks} />

        {showSuggest ? <HomeDinnerSuggest items={suggestions} /> : null}

        {phase === "decide" && !nextStep ? (
          <p className="px-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link href="/wheel" className="font-semibold text-primary hover:underline min-h-8 inline-flex items-center">
              {CTA.spinWheel}
            </Link>
            <Link
              href="/explore"
              className="font-semibold text-muted-foreground hover:text-foreground hover:underline min-h-8 inline-flex items-center"
            >
              Browse
            </Link>
          </p>
        ) : null}

        {phase !== "decide" && phase !== "continue" ? (
          <section className="space-y-2" aria-labelledby="home-more">
            <h2
              id="home-more"
              className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Need a different meal?
            </h2>
            <HubTile
              href="/generator"
              icon={RotateCw}
              title={CTA.tryAnother}
              description="Pick a different crew-sized match"
              secondary
              testId="home-try-another"
            />
            <HubTile
              href="/explore"
              icon={Compass}
              title="Browse recipes"
              description="Look around the catalog"
              secondary
              testId="home-explore"
            />
          </section>
        ) : null}

        {!authenticated ? (
          <button
            type="button"
            onClick={() => openSignIn("/tonight")}
            className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-border/35 bg-muted/15 px-4 py-3.5 text-left touch-manipulation hover:bg-muted/25"
            data-testid="home-sign-in"
          >
            <User className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
            <span className="text-sm font-semibold">Sign in to sync saves across devices</span>
          </button>
        ) : null}

        <p
          className="px-0.5 pt-1 text-center text-[11px] text-muted-foreground leading-relaxed"
          data-testid="home-tomorrow-hook"
        >
          {tomorrowHook}
        </p>
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
