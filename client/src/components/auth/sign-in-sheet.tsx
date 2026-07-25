import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ExternalLink, HelpCircle, Loader2, Mail, Pencil } from "lucide-react";
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
import { cn } from "@/lib/utils";

const RESEND_COOLDOWN_SEC = 45;
const SUPPORT_MAILTO =
  "mailto:support@firehallmeals.com?subject=Sign-in%20link%20not%20received";

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

function parseMagicLinkError(err: unknown): { message: string; retryAfter?: number } {
  if (!(err instanceof Error)) return { message: "We could not send the sign-in link. Try again." };
  const match = err.message.match(/^(\d{3}):\s*(.+)$/s);
  if (!match) return { message: err.message || "We could not send the sign-in link. Try again." };

  const status = match[1];
  const body = match[2]?.trim() ?? "";

  let message = body;
  let retryAfter: number | undefined;
  try {
    const json = JSON.parse(body) as { message?: string; retry_after_seconds?: number };
    if (json.message) message = json.message;
    if (typeof json.retry_after_seconds === "number") retryAfter = json.retry_after_seconds;
  } catch {
    /* plain text body */
  }

  if (status === "429") {
    return {
      message: message || "Too many attempts. Wait a minute and try again.",
      retryAfter,
    };
  }
  if (status === "503") {
    return {
      message:
        message ||
        "Email is temporarily unavailable on this server. Try again later or contact support.",
    };
  }
  if (status === "403") return { message: "Security token expired. Refresh the page and try again." };
  if (status === "400") return { message: "Enter a valid email address." };
  if (status === "502") {
    return {
      message:
        message ||
        "We couldn't reach the email service. Wait a moment and try again — or check spam if a link arrives late.",
    };
  }
  return { message: message || "We could not send the sign-in link. Try again." };
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [expiresMinutes, setExpiresMinutes] = useState(30);
  const inFlightRef = useRef(false);
  const googleRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  useEffect(() => {
    if (config?.magic_link_expires_minutes) {
      setExpiresMinutes(config.magic_link_expires_minutes);
    }
  }, [config?.magic_link_expires_minutes]);

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
    setHelpOpen(false);
  };

  const handleMagicLink = async () => {
    if (inFlightRef.current) return;
    const trimmed = (sent ? sentEmail : email).trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    inFlightRef.current = true;
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
        expires_in_minutes?: number;
      };

      if (typeof body.expires_in_minutes === "number") {
        setExpiresMinutes(body.expires_in_minutes);
      }

      if (body.sent) {
        setSentEmail(trimmed);
        setSent(true);
        setResendSeconds(RESEND_COOLDOWN_SEC);
        setHelpOpen(false);
        toast({
          title: "Check your inbox",
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
      const parsed = parseMagicLinkError(err);
      setError(parsed.message);
      if (parsed.retryAfter && parsed.retryAfter > 0) {
        setResendSeconds(Math.min(300, parsed.retryAfter));
      }
      toast({
        title: "Could not send link",
        description: parsed.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
      inFlightRef.current = false;
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
  const cooldownProgress =
    resendSeconds > 0 ? Math.round(((RESEND_COOLDOWN_SEC - resendSeconds) / RESEND_COOLDOWN_SEC) * 100) : 100;

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
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="you@firehall.org"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && void handleMagicLink()}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "sign-in-email-error" : "sign-in-email-hint"}
                  disabled={sending}
                  className="min-h-11"
                />
                <Button
                  type="button"
                  onClick={() => void handleMagicLink()}
                  disabled={sending || !email.trim()}
                  className="shrink-0 min-h-11 min-w-11"
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
                <p id="sign-in-email-hint" className="text-xs text-muted-foreground">
                  Preferred — no password. Link expires in {expiresMinutes} minutes.
                </p>
              )}
              {config && config.email_configured === false ? (
                <p className="text-xs text-amber-800 dark:text-amber-300" role="status">
                  Email delivery isn’t configured on this environment. In development you’ll get an on-screen link.
                </p>
              ) : null}
            </div>
          ) : (
            <div
              className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
              role="status"
              aria-live="polite"
            >
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="font-medium text-foreground">Check your inbox</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    We sent a sign-in link to{" "}
                    <span className="font-medium text-foreground">{masked}</span>. Open it on this device
                    within {expiresMinutes} minutes.
                  </p>
                </div>
              </div>

              {resendSeconds > 0 ? (
                <div className="space-y-1.5" aria-hidden={false}>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>You can resend soon</span>
                    <span className="tabular-nums font-medium text-foreground">{resendSeconds}s</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
                      style={{ width: `${cooldownProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}

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
                  {sending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
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
                  setEmail(sentEmail);
                }}
              >
                <Pencil className="w-3.5 h-3.5 mr-2" />
                Use a different email
              </Button>

              <div className="border-t border-border/40 pt-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-foreground"
                  onClick={() => setHelpOpen((v) => !v)}
                  aria-expanded={helpOpen}
                >
                  <span className="inline-flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Didn’t get the email?
                  </span>
                  <ChevronDown
                    className={cn("h-4 w-4 text-muted-foreground transition-transform", helpOpen && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {helpOpen ? (
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                    <li>Check Spam / Junk / Promotions — search “Firehall Meals”.</li>
                    <li>Wait 1–2 minutes; some halls’ email filters delay delivery.</li>
                    <li>Confirm the address is spelled correctly ({masked}).</li>
                    <li>Use Resend after the timer — each new link invalidates the previous one.</li>
                    <li>
                      Still stuck?{" "}
                      <a href={SUPPORT_MAILTO} className="text-primary underline-offset-2 hover:underline">
                        Email support
                      </a>
                      .
                    </li>
                  </ul>
                ) : null}
              </div>

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
                  className="w-full min-h-11"
                  disabled={oauthBusy}
                  onClick={() => void handleApple()}
                >
                  Sign in with Apple
                </Button>
              )}
            </div>
          )}

          <Button type="button" variant="ghost" className="w-full min-h-11" onClick={closeSignIn}>
            Continue as guest
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
