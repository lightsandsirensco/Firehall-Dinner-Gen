import { Link } from "wouter";
import { Building2, ChefHat, Heart, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HubTile } from "@/components/app-shell/hub-tile";
import { APP_HOME } from "@/lib/brand-copy";
import {
  dismissPersonalOnboardingForSession,
  markPersonalOnboardingSkipped,
  onboardingSignalsFromAuth,
  type PersonalOnboardingStep,
} from "@/lib/onboarding/state";
import { useAuth } from "@/lib/auth/context";
import { trackPersonalOnboardingCompleted } from "@/lib/analytics";

const STEP_TILE: Record<
  Exclude<PersonalOnboardingStep, "completed">,
  { href: string; icon: typeof Sparkles; title: string; description: string; testId: string }
> = {
  generate_meal: {
    href: "/generator",
    icon: Sparkles,
    title: APP_HOME.nextGenerate,
    description: APP_HOME.nextGenerateHint,
    testId: "home-next-generate",
  },
  save_meal: {
    href: "/explore",
    icon: Heart,
    title: APP_HOME.nextSave,
    description: APP_HOME.nextSaveHint,
    testId: "home-next-save",
  },
  profile: {
    href: "/me/profile",
    icon: User,
    title: APP_HOME.nextProfile,
    description: APP_HOME.nextProfileHint,
    testId: "home-next-profile",
  },
  hall_question: {
    href: "/onboarding/hall",
    icon: Building2,
    title: APP_HOME.nextHallQuestion,
    description: APP_HOME.nextHallQuestionHint,
    testId: "home-next-hall-question",
  },
  connect_hall: {
    href: "/hall/join",
    icon: Building2,
    title: APP_HOME.nextConnectHall,
    description: APP_HOME.nextConnectHallHint,
    testId: "home-next-connect-hall",
  },
};

/**
 * One clear next action for incomplete onboarding — teaches by doing, not a tutorial.
 */
export function HomeNextUpCard({ step }: { step: Exclude<PersonalOnboardingStep, "completed"> }) {
  const { user, profile, halls } = useAuth();
  const tile = STEP_TILE[step];
  const Icon = tile.icon;

  const dismiss = () => {
    if (!user?.user_id) return;
    dismissPersonalOnboardingForSession(user.user_id);
    const signals = onboardingSignalsFromAuth(halls, profile);
    markPersonalOnboardingSkipped(user.user_id, signals);
    trackPersonalOnboardingCompleted("personal");
    window.dispatchEvent(new Event("fh-onboarding-dismissed"));
  };

  return (
    <section
      className="space-y-2 rounded-2xl border border-primary/25 bg-primary/5 px-3 py-3"
      aria-labelledby="home-next-up"
      data-testid="home-next-up"
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2
          id="home-next-up"
          className="text-xs font-semibold uppercase tracking-wide text-primary"
        >
          {APP_HOME.nextUp}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground"
          onClick={dismiss}
          data-testid="home-next-dismiss"
        >
          {APP_HOME.nextDismiss}
        </Button>
      </div>
      <HubTile
        href={tile.href}
        icon={Icon}
        title={tile.title}
        description={tile.description}
        testId={tile.testId}
      />
      {step === "generate_meal" ? (
        <p className="px-0.5 text-xs text-muted-foreground flex items-center gap-1.5">
          <ChefHat className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Or{" "}
          <Link href="/wheel" className="font-semibold text-primary hover:underline">
            spin the wheel
          </Link>{" "}
          for an instant pick.
        </p>
      ) : null}
      {step === "connect_hall" ? (
        <p className="px-0.5 text-xs text-muted-foreground">
          Prefer to wait?{" "}
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={dismiss}
          >
            {APP_HOME.keepPickingMeals}
          </button>
        </p>
      ) : null}
    </section>
  );
}
