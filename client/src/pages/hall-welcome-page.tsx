import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChefHat, Users } from "lucide-react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { HallOnboardingSteps } from "@/components/hall-activation/hall-onboarding-steps";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { useHallMembership } from "@/lib/hall-membership/context";
import { fetchHallDetail } from "@/lib/hall-membership/api";
import { markWelcomeSeen, readActivationProgress } from "@/lib/hall-activation/state";
import { HALL_ONBOARDING, HALL_LINKED } from "@/lib/brand-copy";
import { trackHallActivationCompleted } from "@/lib/analytics";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function HallWelcomePage() {
  const { authenticated, openSignIn, user, halls, refresh } = useAuth();
  const { activeHallId, setActiveHallId } = useHallMembership();
  const [, navigate] = useLocation();
  const [hallName, setHallName] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const hallId = activeHallId ?? halls[0]?.hall_id ?? (user?.user_id ? readActivationProgress(user.user_id).hall_id : null);

  useEffect(() => {
    if (!authenticated) {
      setLoading(false);
      return;
    }

    if (!hallId) {
      navigate("/hall/join");
      return;
    }

    setActiveHallId(hallId);

    let cancelled = false;
    void fetchHallDetail(hallId)
      .then((detail) => {
        if (cancelled) return;
        setHallName(detail.hall.hall_name);
        setMemberCount(detail.members.length);
      })
      .catch(() => {
        if (!cancelled) setHallName(halls.find((h) => h.hall_id === hallId)?.hall_name ?? HALL_LINKED.linked);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, hallId, halls, navigate, setActiveHallId]);

  const handleStartDinner = () => {
    if (!user?.user_id || !hallId) return;
    markWelcomeSeen(user.user_id, hallId);
    trackHallActivationCompleted(hallId);
    void refresh();
    navigate("/tonight?onboarding=1");
  };

  if (!authenticated) {
    return (
      <div className={cn(app.page, "bg-background")} data-testid="hall-welcome-page">
        <AppTopBar title={HALL_ONBOARDING.welcomeTitle} />
        <main className={cn(app.main, "mx-auto max-w-lg px-4 py-8 pb-safe-nav space-y-4")}>
          <p className="text-sm text-muted-foreground">{HALL_ONBOARDING.signInPrompt}</p>
          <Button type="button" className="w-full min-h-[48px]" onClick={() => openSignIn()}>
            Sign in
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className={cn(app.page, "bg-background")} data-testid="hall-welcome-page">
      <AppTopBar title={HALL_ONBOARDING.welcomeTitle} />

      <main className={cn(app.main, "mx-auto max-w-lg px-4 py-4 pb-safe-nav sm:max-w-xl space-y-6")}>
        <HallOnboardingSteps current={2} />

        <header className="space-y-2 px-0.5">
          <h1 className="font-heading text-2xl tracking-wide">{HALL_ONBOARDING.welcomeTitle}</h1>
          <p className="text-sm text-muted-foreground">{HALL_ONBOARDING.welcomeTagline}</p>
        </header>

        <section className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-5 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading linked hall…</p>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="font-heading text-xl tracking-wide">{hallName ?? HALL_LINKED.linked}</p>
                  {memberCount != null ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      {memberCount} crew member{memberCount === 1 ? "" : "s"} on the roster
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{HALL_ONBOARDING.welcomeBody}</p>
            </>
          )}
        </section>

        <Button
          type="button"
          className="w-full min-h-[52px] text-base font-semibold"
          disabled={!hallId || loading}
          onClick={handleStartDinner}
          data-testid="onboarding-start-dinner"
        >
          <ChefHat className="w-5 h-5 mr-2" aria-hidden />
          {HALL_ONBOARDING.startDinner}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/hall" className="text-primary hover:underline font-medium">
            {HALL_ONBOARDING.viewHallHome}
          </Link>
        </p>
      </main>
    </div>
  );
}
