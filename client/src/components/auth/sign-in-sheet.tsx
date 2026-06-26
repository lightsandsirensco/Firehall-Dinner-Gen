import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/hooks/use-toast";
import { trackMagicLinkRequested } from "@/lib/analytics";
import { inboxUrlForEmail, maskEmailAddress } from "@shared/auth/return-to";

const RESEND_COOLDOWN_SEC = 60;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => Promise<{
          authorization: { id_token: string };
          user?: { email?: string; name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function parseMagicLinkError(err: unknown): string {
  if (!(err instanceof Error)) return "We could not send the sign-in link. Try again.";
  const match = err.message.match(/^(\d{3}):\s*(.+)$/s);
  if (!match) return err.message || "We could not send the sign-in link. Try again.";

  const status = match[1];
  const body = match[2]?.trim() ?? "";

  try {
    const json = JSON.parse(body) as { message?: string };
    if (json.message) return json.message;
  } catch {
    if (body) return body;
  }

  if (status === "429") return "Too many attempts. Try again in a few minutes.";
  if (status === "503") return "Email is not configured on this server.";
  if (status === "403") return "Security token expired. Refresh the page and try again.";
  if (status === "400") return "Enter a valid email address.";
  return "We could not send the sign-in link. Try again.";
}

export function SignInSheet() {
  const { signInOpen, closeSignIn, config, afterSignIn, authReturnTo } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const googleRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  useEffect(() => {
    if (!sent || resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sent, resendSeconds]);

  useEffect(() => {
    if (!signInOpen || !config?.google || !googleClientId || !googleRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        await loadScript("https://accounts.google.com/gsi/client", "google-gsi");
        if (cancelled || !googleRef.current || !window.google) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) return;
            setOauthBusy(true);
            try {
              const res = await apiRequest("POST", "/api/auth/google", {
                id_token: response.credential,
              });
              const body = await res.json();
              await afterSignIn(body.is_new, "google");
            } catch {
              toast({
                title: "Google sign-in failed",
                description: "Try email magic link instead.",
                variant: "destructive",
              });
            } finally {
              setOauthBusy(false);
            }
          },
        });

        googleRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleRef.current, {
          theme: "outline",
          size: "large",
          width: 280,
          text: "continue_with",
        });
      } catch {
        /* Google optional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signInOpen, config?.google, googleClientId, afterSignIn, toast]);

  const resetSentState = () => {
    setSent(false);
    setSentEmail("");
    setDevLink(null);
    setResendSeconds(0);
  };

  const handleMagicLink = async () => {
    const trimmed = (sent ? sentEmail : email).trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    setDevLink(null);
    trackMagicLinkRequested(authReturnTo ?? undefined);
    try {
      const res = await apiRequest("POST", "/api/auth/magic-link", {
        email: trimmed,
        return_to: authReturnTo ?? undefined,
      });
      const body = (await res.json()) as {
        sent?: boolean;
        dev_link?: string;
        message?: string;
      };

      if (body.sent) {
        setSentEmail(trimmed);
        setSent(true);
        setResendSeconds(RESEND_COOLDOWN_SEC);
        toast({
          title: "Check your email",
          description: `We sent a sign-in link to ${maskEmailAddress(trimmed)}.`,
        });
        return;
      }

      if (body.dev_link) {
        setSentEmail(trimmed);
        setSent(true);
        setDevLink(body.dev_link);
        setResendSeconds(RESEND_COOLDOWN_SEC);
        toast({
          title: "Development sign-in link",
          description: body.message ?? "Use the link below on this device.",
        });
        return;
      }

      const message = body.message ?? "We could not send the sign-in link. Try again.";
      setError(message);
      toast({
        title: "Could not send link",
        description: message,
        variant: "destructive",
      });
    } catch (err: unknown) {
      const message = parseMagicLinkError(err);
      setError(message);
      toast({
        title: "Could not send link",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleApple = async () => {
    const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID?.trim();
    if (!appleClientId || !window.AppleID) {
      toast({
        title: "Apple Sign In unavailable",
        description: "Use email magic link instead.",
        variant: "destructive",
      });
      return;
    }

    setOauthBusy(true);
    try {
      const result = await window.AppleID.auth.signIn();
      const res = await apiRequest("POST", "/api/auth/apple", {
        id_token: result.authorization.id_token,
        user: result.user,
      });
      const body = await res.json();
      await afterSignIn(body.is_new, "apple");
    } catch {
      toast({
        title: "Apple sign-in cancelled",
        description: "You can continue as guest or use email.",
      });
    } finally {
      setOauthBusy(false);
    }
  };

  useEffect(() => {
    if (!signInOpen) return;
    const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID?.trim();
    if (!appleClientId || !config?.apple) return;

    loadScript(
      "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
      "apple-auth",
    )
      .then(() => {
        window.AppleID?.auth.init({
          clientId: appleClientId,
          scope: "name email",
          redirectURI: window.location.origin,
          usePopup: true,
        });
      })
      .catch(() => undefined);
  }, [signInOpen, config?.apple]);

  const displayEmail = sentEmail || email.trim();
  const masked = displayEmail ? maskEmailAddress(displayEmail) : "";

  return (
    <Sheet
      open={signInOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeSignIn();
          resetSentState();
          setError(null);
          setEmail("");
        }
      }}
    >
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading tracking-wide">Sign in to Firehall Meals</SheetTitle>
          <SheetDescription>
            Sign in to sync saves, connect to a hall, and unlock Hall Pro — or keep cooking as a guest.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {!sent ? (
            <div className="space-y-2">
              <Label htmlFor="sign-in-email">Email magic link</Label>
              <div className="flex gap-2">
                <Input
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@firehall.org"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && void handleMagicLink()}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "sign-in-email-error" : undefined}
                />
                <Button
                  type="button"
                  onClick={() => void handleMagicLink()}
                  disabled={sending || !email.trim()}
                  className="shrink-0"
                  aria-label={sending ? "Sending sign-in link" : "Send sign-in link"}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                </Button>
              </div>
              {error ? (
                <p id="sign-in-email-error" className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Preferred — no password needed.</p>
              )}
            </div>
          ) : (
            <div
              className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4"
              role="status"
              aria-live="polite"
            >
              <div>
                <p className="font-medium text-foreground">Check your inbox</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a sign-in link to{" "}
                  <span className="font-medium text-foreground">{masked}</span>. Open it on this device to
                  finish signing in.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" className="flex-1 min-h-11" asChild>
                  <a href={inboxUrlForEmail(displayEmail)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open inbox
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 min-h-11"
                  disabled={resendSeconds > 0 || sending}
                  onClick={() => void handleMagicLink()}
                >
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend link"}
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  resetSentState();
                  setEmail("");
                }}
              >
                <Pencil className="w-3.5 h-3.5 mr-2" />
                Use a different email
              </Button>

              {devLink ? (
                <a href={devLink} className="text-primary text-xs break-all block">
                  Dev link: {devLink}
                </a>
              ) : null}
            </div>
          )}

          {(config?.google || config?.apple) && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Or continue with</p>
              {config?.google && googleClientId && <div ref={googleRef} className="flex justify-center" />}
              {config?.apple && import.meta.env.VITE_APPLE_CLIENT_ID?.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={oauthBusy}
                  onClick={() => void handleApple()}
                >
                  Sign in with Apple
                </Button>
              )}
            </div>
          )}

          <Button type="button" variant="ghost" className="w-full" onClick={closeSignIn}>
            Continue as guest
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
