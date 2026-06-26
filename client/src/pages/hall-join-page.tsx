import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Users } from "lucide-react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { HallOnboardingSteps } from "@/components/hall-activation/hall-onboarding-steps";
import { OnboardingSteps } from "@/components/onboarding/onboarding-steps";
import { Button } from "@/components/ui/button";
import { JoinHallForm } from "@/components/hall-membership/join-hall-form";
import { useAuth } from "@/lib/auth/context";
import { useHallMembership } from "@/lib/hall-membership/context";
import { fetchJoinPreview } from "@/lib/hall-membership/api";
import { writeActivationProgress } from "@/lib/hall-activation/state";
import {
  isOnboardingMode,
  markHallConnectSkipped,
  markPersonalOnboardingCompleted,
  onboardingSignalsFromAuth,
} from "@/lib/onboarding/state";
import { HALL_ONBOARDING, HALL_LINKED, PERSONAL_ONBOARDING } from "@/lib/brand-copy";
import { trackPersonalOnboardingCompleted } from "@/lib/analytics";
import type { HallJoinPreview } from "@shared/hall-membership/types";
import { app } from "@/lib/design-tokens";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function afterJoin(userId: string, hallId: string, setActiveHallId: (id: string) => void, navigate: (path: string) => void) {
  setActiveHallId(hallId);
  writeActivationProgress(userId, { hall_id: hallId, welcome_seen: false, status: "pending" });
  navigate("/hall/welcome");
}

export default function HallJoinPage() {
  const { authenticated, openSignIn, user, profile, halls } = useAuth();
  const { setActiveHallId } = useHallMembership();
  const [, navigate] = useLocation();
  const [preview, setPreview] = useState<HallJoinPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const personalOnboarding = isOnboardingMode();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = params.get("token") ?? undefined;
  const code = params.get("code") ?? undefined;
  const joinCode = params.get("join_code") ?? undefined;
  const hasInvite = Boolean(token || code || joinCode);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasInvite) {
        setLoading(false);
        return;
      }
      try {
        const data = await fetchJoinPreview({ token, code, join_code: joinCode });
        if (!cancelled) setPreview(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasInvite, token, code, joinCode]);

  const handleJoined = (hallId: string) => {
    if (!user?.user_id) return;
    if (personalOnboarding) {
      const signals = onboardingSignalsFromAuth([...halls, { hall_id: hallId }], profile);
      markPersonalOnboardingCompleted(user.user_id, signals);
      trackPersonalOnboardingCompleted("hall");
    }
    afterJoin(user.user_id, hallId, setActiveHallId, navigate);
  };

  const skipConnect = () => {
    if (!user?.user_id) return;
    const signals = onboardingSignalsFromAuth(halls, profile);
    markHallConnectSkipped(user.user_id, signals);
    trackPersonalOnboardingCompleted("personal");
    navigate("/home");
  };

  return (
    <div className={cn(app.page, "bg-background")} data-testid="hall-join-page">
      <AppTopBar title={personalOnboarding ? PERSONAL_ONBOARDING.connectTitle : HALL_ONBOARDING.joinTitle} />

      <main className={cn(app.main, "mx-auto max-w-lg px-4 py-4 pb-safe-nav sm:max-w-xl space-y-6")}>
        {personalOnboarding ? (
          <OnboardingSteps current="connect_hall" />
        ) : (
          <HallOnboardingSteps current={1} />
        )}

        <header className="space-y-1 px-0.5">
          <h1 className="font-heading text-2xl tracking-wide">
            {personalOnboarding ? PERSONAL_ONBOARDING.connectTitle : HALL_ONBOARDING.joinTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {personalOnboarding ? PERSONAL_ONBOARDING.connectBody : HALL_ONBOARDING.joinTagline}
          </p>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-4" aria-busy="true">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : preview ? (
          <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-primary mt-0.5" aria-hidden />
              <div>
                <p className="font-heading text-lg">{preview.hall_name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {[preview.station_number && `Station ${preview.station_number}`, preview.department]
                    .filter(Boolean)
                    .join(" · ") || "Firehall crew"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {preview.member_count} member{preview.member_count === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {!authenticated ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{HALL_ONBOARDING.signInPrompt}</p>
                <Button type="button" className="w-full min-h-[48px]" onClick={() => openSignIn()}>
                  Sign in to join
                </Button>
              </div>
            ) : (
              <JoinHallForm
                compact
                initialInviteToken={token}
                initialInviteCode={code}
                initialJoinCode={joinCode}
                onJoined={handleJoined}
              />
            )}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">This invite expired or is invalid.</p>
        ) : null}

        {!preview && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">{HALL_ONBOARDING.haveCode}</h2>
            {!authenticated ? (
              <p className="text-sm text-muted-foreground">
                <button
                  type="button"
                  className="text-primary underline-offset-2 hover:underline"
                  onClick={() => openSignIn()}
                >
                  Sign in
                </button>{" "}
                to {HALL_LINKED.join.toLowerCase()} with a crew code or invite.
              </p>
            ) : (
              <JoinHallForm compact onJoined={handleJoined} />
            )}
          </section>
        )}

        <p className="text-sm text-muted-foreground text-center">
          {personalOnboarding ? (
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={skipConnect}
              data-testid="onboarding-hall-skip"
            >
              {PERSONAL_ONBOARDING.connectSkip}
            </button>
          ) : (
            <Link href="/account?create_hall=1" className="text-primary hover:underline font-medium">
              {HALL_LINKED.create}
            </Link>
          )}
        </p>
      </main>
    </div>
  );
}
