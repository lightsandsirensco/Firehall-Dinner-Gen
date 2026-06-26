import { ONBOARDING_STEP_LABELS, type OnboardingStep } from "@/lib/hall-activation/state";
import { cn } from "@/lib/utils";

interface HallOnboardingStepsProps {
  current: OnboardingStep;
  className?: string;
}

export function HallOnboardingSteps({ current, className }: HallOnboardingStepsProps) {
  return (
    <div className={cn("space-y-2", className)} data-testid="hall-onboarding-steps">
      <p className="text-xs text-muted-foreground">
        Step {current} of 3 — {ONBOARDING_STEP_LABELS[current]}
      </p>
      <div className="flex gap-2">
        {([1, 2, 3] as const).map((step) => (
          <div
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              step <= current ? "bg-primary" : "bg-muted",
            )}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
