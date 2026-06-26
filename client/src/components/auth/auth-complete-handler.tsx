import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/context";
import { clearAuthReturnTo, stripAuthQueryParams } from "@/lib/auth/return-to";
import { primePersonalOnboardingAfterSignIn } from "@/lib/onboarding/state";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_link: "That sign-in link is invalid. Request a new one.",
  expired_link: "That sign-in link expired. Request a new one.",
  sign_in_failed: "Sign-in failed. Try again.",
};

/** Handles magic-link redirects (?signed_in=1) and auth error query params. */
export function AuthCompleteHandler() {
  const { refresh } = useAuth();
  const { toast } = useToast();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      const key = `error:${error}`;
      if (handledRef.current === key) return;
      handledRef.current = key;
      toast({
        title: "Sign-in issue",
        description: ERROR_MESSAGES[error] ?? "Could not complete sign-in.",
        variant: "destructive",
      });
      stripAuthQueryParams();
      return;
    }

    if (params.get("signed_in") !== "1") return;
    const key = `signed_in:${window.location.pathname}${window.location.search}`;
    if (handledRef.current === key) return;
    handledRef.current = key;

    void (async () => {
      await refresh();
      primePersonalOnboardingAfterSignIn();
      clearAuthReturnTo();
      stripAuthQueryParams();
      toast({
        title: "You're signed in",
        description: "Welcome back to Firehall Meals.",
      });
    })();
  }, [refresh, toast]);

  return null;
}
