import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { trackAccountCreated, trackLogin } from "@/lib/analytics";
import type { AuthCapabilities } from "@shared/auth/types";
import { authCapabilities } from "@shared/auth/types";
import type { UserBillingState } from "@shared/billing/types";
import { GUEST_BILLING } from "@/lib/billing/constants";
import { fetchAuthConfig, fetchAuthMe, type AuthConfig, type AuthMePayload } from "./api";
import { primePersonalOnboardingAfterSignIn } from "@/lib/onboarding/state";
import { trackPersonalOnboardingStarted } from "@/lib/analytics";

interface AuthContextValue {
  loading: boolean;
  authenticated: boolean;
  user: AuthMePayload["user"];
  profile: AuthMePayload["profile"];
  preferences: AuthMePayload["preferences"];
  halls: AuthMePayload["halls"];
  billing: UserBillingState;
  capabilities: AuthCapabilities;
  config: AuthConfig | null;
  signInOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  afterSignIn: (isNew?: boolean, provider?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const guestCapabilities = authCapabilities(null, GUEST_BILLING);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [signInOpen, setSignInOpen] = useState(false);

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

  const afterSignIn = useCallback(
    async (isNew?: boolean, provider?: string) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (isNew) {
        trackAccountCreated(provider ?? "unknown");
        trackPersonalOnboardingStarted();
      } else {
        trackLogin(provider ?? "unknown");
      }
      primePersonalOnboardingAfterSignIn();
      setSignInOpen(false);
    },
    [queryClient],
  );

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading: meQuery.isLoading,
      authenticated,
      user: me?.user ?? null,
      profile: me?.profile ?? null,
      preferences: me?.preferences ?? null,
      halls: me?.halls ?? [],
      billing: me?.billing ?? GUEST_BILLING,
      capabilities: me?.capabilities ?? authCapabilities(me?.user ?? null, me?.billing ?? GUEST_BILLING),
      config: configQuery.data ?? null,
      signInOpen,
      openSignIn: () => setSignInOpen(true),
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
      signInOpen,
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
