import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/context";
import { clearAuthReturnTo, readAuthReturnTo, stripAuthQueryParams } from "@/lib/auth/return-to";
import { postLoginDestination } from "@/lib/auth/post-login-destination";
import { primePersonalOnboardingAfterSignIn } from "@/lib/onboarding/state";
import { fetchAuthMe } from "@/lib/auth/api";

const ERROR_COPY: Record<string, { title: string; description: string; reopen?: boolean }> = {
  invalid_link: {
    title: "Link didn't work",
    description: "That sign-in link is invalid. Request a new one from Sign in.",
    reopen: true,
  },
  expired_link: {
    title: "Link expired",
    description: "Sign-in links expire after 30 minutes. Request a fresh one.",
    reopen: true,
  },
  used_link: {
    title: "Link already used",
    description: "Each link works once. Request a new sign-in link to continue.",
    reopen: true,
  },
  sign_in_failed: {
    title: "Sign-in failed",
    description: "Something went wrong completing sign-in. Try again.",
    reopen: true,
  },
};

/** Handles magic-link redirects (?signed_in=1) and auth error query params. */
export function AuthCompleteHandler() {
  const { refresh, openSignIn } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      const key = `error:${error}`;
      if (handledRef.current === key) return;
      handledRef.current = key;
      const copy = ERROR_COPY[error] ?? {
        title: "Sign-in issue",
        description: "Could not complete sign-in. Request a new link.",
        reopen: true,
      };
      toast({
        title: copy.title,
        description: copy.description,
        variant: "destructive",
      });
      stripAuthQueryParams();
      if (copy.reopen) {
        window.setTimeout(() => openSignIn(window.location.pathname + window.location.search), 400);
      }
      return;
    }

    if (params.get("signed_in") !== "1") return;
    const key = `signed_in:${window.location.pathname}${window.location.search}`;
    if (handledRef.current === key) return;
    handledRef.current = key;

    void (async () => {
      await refresh();
      primePersonalOnboardingAfterSignIn();
      const returnTo = readAuthReturnTo();
      clearAuthReturnTo();
      stripAuthQueryParams();

      let hasHall = false;
      try {
        const mePayload = await fetchAuthMe();
        hasHall = Boolean(mePayload.authenticated && (mePayload.halls?.length ?? 0) > 0);
      } catch {
        /* ignore */
      }

      const destination = postLoginDestination({
        hasHall,
        authReturnTo: returnTo,
      });
      toast({
        title: hasHall ? "Welcome back" : "You're signed in",
        description: hasHall
          ? "Starting at Home — your command center for tonight's shift."
          : "Pick dinner, or connect a hall when you're ready.",
      });
      if (destination !== window.location.pathname) {
        navigate(destination);
      }
    })();
  }, [refresh, toast, openSignIn, navigate]);

  return null;
}
