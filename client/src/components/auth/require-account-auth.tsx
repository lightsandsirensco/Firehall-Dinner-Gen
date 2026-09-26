import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth/context";

interface RequireAccountAuthProps {
  children: ReactNode;
  /**
   * Where signed-out visitors are sent while the sign-in sheet opens on top —
   * must itself be safe/meaningful for a guest to land on (never another
   * account-only page). Defaults to the "Me" hub, which already has its own
   * guest-safe sign-in prompt.
   */
  redirectTo?: string;
}

/**
 * Hard client-side gate for pages that render real account-only data —
 * profile info, billing/plan status, linked sign-in methods, delete account,
 * etc. (see CRITICAL ACCESS REQUIREMENT: Me/account area is signed-in only).
 *
 * Signed-out visitors are NEVER shown the wrapped content, not even for a
 * single render while the auth check (`GET /api/auth/me`) is still in
 * flight — this returns a neutral loading placeholder in both the "still
 * checking" and "confirmed signed out" states, then redirects away the
 * moment it's confirmed the visitor isn't signed in. The existing sign-in
 * sheet is opened with the current path as its return-to target (see
 * lib/auth/context.tsx openSignIn + lib/auth/post-login-destination.ts), so
 * a successful sign-in lands the visitor back on the page they actually
 * requested — no new return-URL mechanism, reusing what auth already does
 * for magic-link/OAuth sign-in.
 *
 * IMPORTANT: this is a client-side UX convenience only, NOT the security
 * boundary — every API call these pages make is independently protected by
 * `requireAuth` server-side (see server/auth/auth-middleware.ts). A signed-
 * out visitor who disables JS or races this redirect gets nothing more than
 * empty/guest-shaped data from the API either way.
 */
export function RequireAccountAuth({ children, redirectTo = "/me" }: RequireAccountAuthProps) {
  const { authenticated, loading, openSignIn } = useAuth();
  const [location, navigate] = useLocation();
  const handledRef = useRef(false);

  useEffect(() => {
    if (loading || authenticated || handledRef.current) return;
    handledRef.current = true;
    openSignIn(location);
    navigate(redirectTo, { replace: true });
  }, [loading, authenticated, location, openSignIn, navigate, redirectTo]);

  if (loading || !authenticated) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center px-6"
        aria-busy
        aria-label="Checking sign-in status"
      >
        <div className="w-full max-w-sm space-y-3">
          <div className="h-20 rounded-2xl skeleton-shimmer" />
          <div className="h-12 rounded-xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
