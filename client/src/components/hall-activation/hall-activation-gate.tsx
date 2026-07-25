import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth/context";
import {
  isActivationComplete,
  onboardingPathForStep,
  onboardingStep,
  readActivationProgress,
  shouldShowActivationFunnel,
  writeActivationProgress,
} from "@/lib/hall-activation/state";

const HALL_ONBOARDING_ROUTES = new Set(["/hall/join", "/hall/welcome", "/hall/features"]);

/**
 * Optional hall onboarding — only nudges when the user opens Hall routes, not app-wide.
 */
export function HallActivationGate() {
  const { authenticated, loading, user, halls } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (loading || !authenticated || !user?.user_id) return;
    if (!location.startsWith("/hall") && !location.startsWith("/halls/")) return;
    if (HALL_ONBOARDING_ROUTES.has(location)) return;
    if (location === "/hall/features") return;

    const userId = user.user_id;
    let progress = readActivationProgress(userId);
    const hallId = progress.hall_id ?? halls[0]?.hall_id ?? null;

    if (hallId && !progress.hall_id) {
      progress = writeActivationProgress(userId, { hall_id: hallId });
    }

    if (isActivationComplete(progress)) return;
    if (!shouldShowActivationFunnel(userId)) return;
    if (halls.length > 0) return;

    const step = onboardingStep(progress, halls.length > 0);
    const target = onboardingPathForStep(step);

    if (location === target) return;

    if (step === 1 && location === "/hall") {
      return;
    }

    if (step === 2 && location === "/hall") {
      navigate("/hall/welcome");
      return;
    }

    if (step === 3 && location === "/hall") {
      navigate("/hall");
    }
  }, [authenticated, halls, loading, location, navigate, user?.user_id]);

  return null;
}
