import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth/context";
import {
  isPathAllowedForOnboardingStep,
  isPersonalOnboardingComplete,
  onboardingPathForStep,
  onboardingSignalsFromAuth,
  personalOnboardingStep,
  readPersonalOnboardingProgress,
  shouldEnforcePersonalOnboarding,
  shouldShowPersonalOnboardingFunnel,
} from "@/lib/onboarding/state";

/**
 * Personal onboarding — routes new users through generate → save → profile → optional hall.
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
    if (isPathAllowedForOnboardingStep(location, step)) return;

    const target = onboardingPathForStep(step);
    if (location === target) return;

    navigate(target);
  }, [authenticated, halls, loading, location, navigate, profile, user?.user_id]);

  return null;
}
