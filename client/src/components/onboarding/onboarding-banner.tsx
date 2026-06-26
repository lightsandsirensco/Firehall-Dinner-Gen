import { PERSONAL_ONBOARDING } from "@/lib/brand-copy";
import {
  personalOnboardingStep,
  readPersonalOnboardingProgress,
  onboardingSignalsFromAuth,
  type PersonalOnboardingStep,
} from "@/lib/onboarding/state";
import { useAuth } from "@/lib/auth/context";
import { OnboardingSteps } from "@/components/onboarding/onboarding-steps";
import { cn } from "@/lib/utils";

function bannerCopy(step: PersonalOnboardingStep): { title: string; body: string } {
  switch (step) {
    case "generate_meal":
      return {
        title: PERSONAL_ONBOARDING.generateTitle,
        body: PERSONAL_ONBOARDING.generateBody,
      };
    case "save_meal":
      return {
        title: PERSONAL_ONBOARDING.saveTitle,
        body: PERSONAL_ONBOARDING.saveBody,
      };
    case "profile":
      return {
        title: PERSONAL_ONBOARDING.profileTitle,
        body: PERSONAL_ONBOARDING.profileBody,
      };
    default:
      return {
        title: PERSONAL_ONBOARDING.welcomeTitle,
        body: PERSONAL_ONBOARDING.welcomeBody,
      };
  }
}

interface OnboardingBannerProps {
  className?: string;
}

export function OnboardingBanner({ className }: OnboardingBannerProps) {
  const { user, profile, halls } = useAuth();
  if (!user?.user_id) return null;

  const signals = onboardingSignalsFromAuth(halls, profile);
  const progress = readPersonalOnboardingProgress(user.user_id, signals);
  const step = personalOnboardingStep(progress, halls.length > 0);
  if (step === "completed" || step === "hall_question" || step === "connect_hall") {
    return null;
  }

  const copy = bannerCopy(step);

  return (
    <section
      className={cn(
        "rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-3",
        className,
      )}
      data-testid="personal-onboarding-banner"
    >
      <OnboardingSteps current={step} />
      <div>
        <p className="font-medium text-sm">{copy.title}</p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{copy.body}</p>
      </div>
    </section>
  );
}
