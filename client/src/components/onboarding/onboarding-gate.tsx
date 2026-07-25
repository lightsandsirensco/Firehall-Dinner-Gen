import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth/context";
import {
  isPersonalOnboardingComplete,
  onboardingPathForStep,
  onboardingSignalsFromAuth,
  personalOnboardingStep,
  readPersonalOnboardingProgress,
  shouldEnforcePersonalOnboarding,
  shouldShowPersonalOnboardingFunnel,
  shouldSoftRedirectOnboarding,
} from "@/lib/onboarding/state";

/**
 * Soft personal onboarding — never traps users in a multi-step funnel.
 * Incomplete users stay on Home (or meal/hall paths); only redirect away from disallowed dead ends.
 */
export function OnboardingGate() {
  const { authenticated, loading, user, profile, halls } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (loading || !authenticated || !user?.user_id) return;
    if (!shouldEnforcePersonalOnboarding(location, authenticated)) return;
    if (!shouldShowPersonalOnboardingFunnel(user.user_id)) return;

    const signals = onboardingSignalsFromAuth(halls, profile);
    const progress = readPersonalOnboardingProgress(user.user_id, signals);
    if (isPersonalOnboardingComplete(progress, halls.length > 0)) return;

    const step = personalOnboardingStep(progress, halls.length > 0);
    if (!shouldSoftRedirectOnboarding(location, step)) return;

    const target = onboardingPathForStep(step);
    if (location.split("?")[0] === target.split("?")[0]) return;
    navigate(target);
  }, [authenticated, halls, loading, location, navigate, profile, user?.user_id]);

  return null;
}
