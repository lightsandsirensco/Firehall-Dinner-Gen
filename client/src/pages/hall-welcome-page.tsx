import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChefHat, Users } from "lucide-react";
import { HallShell } from "@/components/hall/hall-shell";
import { HallOnboardingSteps } from "@/components/hall-activation/hall-onboarding-steps";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { useHallMembership } from "@/lib/hall-membership/context";
import { fetchHallDetail } from "@/lib/hall-membership/api";
import { markWelcomeSeen, readActivationProgress } from "@/lib/hall-activation/state";
import { HALL_ONBOARDING, HALL_LINKED } from "@/lib/brand-copy";
import { trackHallActivationCompleted } from "@/lib/analytics";

export default function HallWelcomePage() {
  const { authenticated, openSignIn, user, halls, refresh } = useAuth();
  const { activeHallId, setActiveHallId } = useHallMembership();
  const [, navigate] = useLocation();
  const [hallName, setHallName] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const hallId =
    activeHallId ??
    halls[0]?.hall_id ??
    (user?.user_id ? readActivationProgress(user.user_id).hall_id : null);

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
        if (!cancelled) {
          setHallName(halls.find((h) => h.hall_id === hallId)?.hall_name ?? HALL_LINKED.linked);
        }
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
    navigate("/hall?onboarding=1");
  };

  if (!authenticated) {
    return (
      <HallShell title="Welcome" hideSubNav testId="hall-welcome-page">
        <p className="text-sm text-muted-foreground">{HALL_ONBOARDING.signInPrompt}</p>
        <Button type="button" className="w-full min-h-[48px]" onClick={() => openSignIn()}>
          Sign in
        </Button>
        <Button asChild variant="ghost" className="w-full">
              <Link href="/tonight">Recipes</Link>
        </Button>
      </HallShell>
    );
  }

  return (
    <HallShell title="Welcome" hideSubNav testId="hall-welcome-page">
      <HallOnboardingSteps current={2} />

      <header className="space-y-2 px-0.5">
        <h1 className="font-heading text-2xl tracking-wide">{HALL_ONBOARDING.welcomeTitle}</h1>
        <p className="text-sm text-muted-foreground">{HALL_ONBOARDING.welcomeTagline}</p>
      </header>

      <section className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-5 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading hall…</p>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="font-heading text-xl tracking-wide">{hallName ?? HALL_LINKED.linked}</p>
                {memberCount != null ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    {memberCount} member{memberCount === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{HALL_ONBOARDING.welcomeBody}</p>
          </>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          className="w-full min-h-[48px] gap-2"
          onClick={handleStartDinner}
          disabled={loading || !hallId}
          data-testid="hall-welcome-start-dinner"
        >
          <ChefHat className="w-4 h-4" aria-hidden />
          {HALL_ONBOARDING.startDinner}
        </Button>
        <Button asChild variant="outline" className="w-full min-h-[48px]">
          <Link href="/hall">{HALL_ONBOARDING.viewHallHome}</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
              <Link href="/tonight">Recipes</Link>
        </Button>
      </div>
    </HallShell>
  );
}
