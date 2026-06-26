import {
  PERSONAL_ONBOARDING_STEP_LABELS,
  personalOnboardingStepNumber,
  type PersonalOnboardingStep,
} from "@/lib/onboarding/state";
import { cn } from "@/lib/utils";

interface OnboardingStepsProps {
  current: PersonalOnboardingStep;
  className?: string;
}

const PROGRESS_STEPS = [2, 3, 4, 5] as const;

export function OnboardingSteps({ current, className }: OnboardingStepsProps) {
  const stepNumber = personalOnboardingStepNumber(current);
  const label =
    current === "completed"
      ? "All set"
      : PERSONAL_ONBOARDING_STEP_LABELS[current];

  return (
    <div className={cn("space-y-2", className)} data-testid="personal-onboarding-steps">
      <p className="text-xs text-muted-foreground">
        Step {stepNumber} of 5 — {label}
      </p>
      <div className="flex gap-2">
        {PROGRESS_STEPS.map((step) => (
          <div
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              step <= stepNumber ? "bg-primary" : "bg-muted",
            )}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
