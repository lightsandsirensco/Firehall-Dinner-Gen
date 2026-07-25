import { useLocation } from "wouter";
import { Building2, User } from "lucide-react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { PERSONAL_ONBOARDING, HALL_LINKED } from "@/lib/brand-copy";
import {
  markPersonalOnboardingCompleted,
  markWorksAtFirehall,
  onboardingSignalsFromAuth,
} from "@/lib/onboarding/state";
import {
  trackPersonalOnboardingCompleted,
  trackPersonalOnboardingHallChoice,
} from "@/lib/analytics";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/** Lightweight hall question — one decision, then momentum. */
export default function OnboardingHallPage() {
  const { user, profile, halls } = useAuth();
  const [, navigate] = useLocation();

  const choose = (worksAtFirehall: boolean) => {
    if (!user?.user_id) return;
    const signals = onboardingSignalsFromAuth(halls, profile);
    markWorksAtFirehall(user.user_id, worksAtFirehall, signals);
    trackPersonalOnboardingHallChoice(worksAtFirehall);

    if (worksAtFirehall) {
      navigate("/hall/join");
      return;
    }

    markPersonalOnboardingCompleted(user.user_id, signals);
    trackPersonalOnboardingCompleted("personal");
    navigate("/tonight");
  };

  return (
    <div className={cn(app.page, "bg-background")} data-testid="onboarding-hall-page">
      <AppTopBar title="Quick question" workspace="meals" />

      <main className={cn(app.main, "mx-auto max-w-lg px-4 py-4 pb-safe-nav sm:max-w-xl space-y-6")}>
        <header className="space-y-2 px-0.5">
          <h1 className="font-heading text-2xl tracking-wide">{PERSONAL_ONBOARDING.hallTitle}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {PERSONAL_ONBOARDING.hallBody}
          </p>
        </header>

        <div className="grid gap-3">
          <Button
            type="button"
            className="min-h-12 h-auto py-3 touch-manipulation justify-start gap-3"
            onClick={() => choose(true)}
            data-testid="onboarding-hall-yes"
          >
            <Building2 className="w-5 h-5 shrink-0" aria-hidden />
            <span className="text-left">
              <span className="block font-medium">Yes — {HALL_LINKED.connect}</span>
              <span className="block text-xs font-normal opacity-90 mt-0.5">
                {PERSONAL_ONBOARDING.hallYesHint}
              </span>
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="min-h-12 h-auto py-3 touch-manipulation justify-start gap-3"
            onClick={() => choose(false)}
            data-testid="onboarding-hall-no"
          >
            <User className="w-5 h-5 shrink-0" aria-hidden />
            <span className="text-left">
              <span className="block font-medium">{PERSONAL_ONBOARDING.hallNoLabel}</span>
              <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                {PERSONAL_ONBOARDING.hallNoHint}
              </span>
            </span>
          </Button>
        </div>
      </main>
    </div>
  );
}
