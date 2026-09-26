import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { posthog } from "@/lib/posthog-client";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { trackAccountCreated, trackLogin } from "@/lib/analytics";
import type { AuthCapabilities } from "@shared/auth/types";
import { authCapabilities } from "@shared/auth/types";
import type { UserBillingState } from "@shared/billing/types";
import { GUEST_BILLING } from "@/lib/billing/constants";
import { fetchAuthConfig, fetchAuthMe, type AuthConfig, type AuthMePayload } from "./api";
import { primePersonalOnboardingAfterSignIn } from "@/lib/onboarding/state";
import { trackPersonalOnboardingStarted } from "@/lib/analytics";
import {
  captureAuthReturnTo,
  clearAuthReturnTo,
  readAuthReturnTo,
} from "@/lib/auth/return-to";
import { postLoginDestination } from "@/lib/auth/post-login-destination";

interface AuthContextValue {
  loading: boolean;
  authenticated: boolean;
  user: AuthMePayload["user"];
  profile: AuthMePayload["profile"];
  preferences: AuthMePayload["preferences"];
  halls: AuthMePayload["halls"];
  linkedProviders: AuthMePayload["linked_providers"];
  billing: UserBillingState;
  capabilities: AuthCapabilities;
  config: AuthConfig | null;
  /** True while /api/auth/config is still resolving — lets sign-in UI reserve space instead of popping in. */
  configLoading: boolean;
  signInOpen: boolean;
  authReturnTo: string | null;
  openSignIn: (returnTo?: string) => void;
  closeSignIn: () => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  afterSignIn: (isNew?: boolean, provider?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const guestCapabilities = authCapabilities(null, GUEST_BILLING);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [signInOpen, setSignInOpen] = useState(false);
  const [authReturnTo, setAuthReturnTo] = useState<string | null>(null);

  const configQuery = useQuery({
    queryKey: ["/api/auth/config"],
    queryFn: fetchAuthConfig,
    staleTime: 5 * 60 * 1000,
  });

  const meQuery = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: fetchAuthMe,
    staleTime: 30_000,
    retry: 1,
  });

  const me = meQuery.data;
  const authenticated = Boolean(me?.authenticated);
  const userId = me?.user?.user_id ?? null;

  // Identify with PostHog using ONLY our stable internal user_id — never
  // email/name/preferences. Covers both a fresh sign-in (afterSignIn below
  // triggers a me refetch) and an already-authenticated page load. Safe to
  // call repeatedly with the same id.
  useEffect(() => {
    if (authenticated && userId) {
      posthog.identify(userId);
    }
  }, [authenticated, userId]);

  const openSignIn = useCallback((returnTo?: string) => {
    const path = captureAuthReturnTo(returnTo);
    setAuthReturnTo(path);
    setSignInOpen(true);
  }, []);

  const afterSignIn = useCallback(
    async (isNew?: boolean, provider?: string) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (isNew) {
        trackAccountCreated(provider ?? "unknown");
        trackPersonalOnboardingStarted();
        primePersonalOnboardingAfterSignIn();
      } else {
        trackLogin(provider ?? "unknown");
      }
      setSignInOpen(false);

      const returnTo = authReturnTo ?? readAuthReturnTo();
      clearAuthReturnTo();
      setAuthReturnTo(null);

      let hasHall = false;
      try {
        const mePayload = await fetchAuthMe();
        hasHall = Boolean(mePayload.authenticated && (mePayload.halls?.length ?? 0) > 0);
      } catch {
        /* fall through to home */
      }

      const destination = postLoginDestination({
        hasHall,
        authReturnTo: returnTo,
        isNew,
      });
      if (destination !== window.location.pathname + window.location.search) {
        navigate(destination);
      }
    },
    [queryClient, navigate, authReturnTo],
  );

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    posthog.reset();
    clearAuthReturnTo();
    setAuthReturnTo(null);
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    toast({ title: "Signed out", description: "See you next shift." });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading: meQuery.isLoading,
      authenticated,
      user: me?.user ?? null,
      profile: me?.profile ?? null,
      preferences: me?.preferences ?? null,
      halls: me?.halls ?? [],
      linkedProviders: me?.linked_providers ?? [],
      billing: me?.billing ?? GUEST_BILLING,
      capabilities: me?.capabilities ?? authCapabilities(me?.user ?? null, me?.billing ?? GUEST_BILLING),
      config: configQuery.data ?? null,
      configLoading: configQuery.isLoading,
      signInOpen,
      authReturnTo,
      openSignIn,
      closeSignIn: () => setSignInOpen(false),
      refresh,
      logout,
      afterSignIn,
    }),
    [
      meQuery.isLoading,
      authenticated,
      me,
      configQuery.data,
      configQuery.isLoading,
      signInOpen,
      authReturnTo,
      openSignIn,
      refresh,
      logout,
      afterSignIn,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
