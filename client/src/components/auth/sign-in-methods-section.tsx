import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/hooks/use-toast";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

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

/**
 * Account → "Sign-in methods". Shows which sign-in methods are connected to
 * this account and, when Google Sign-In is configured, lets an authenticated
 * user connect a Google identity to their EXISTING account (never a new
 * one) via POST /api/auth/google/link. See GOOGLE SIGN-IN SAFETY section 9.
 *
 * Intentionally minimal: no unlinking, no provider management beyond
 * "connected" / "Connect Google".
 */
export function SignInMethodsSection() {
  const { config, linkedProviders, refresh } = useAuth();
  const { toast } = useToast();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const showGoogle = Boolean(config?.google && googleClientId);
  const googleConnected = linkedProviders.includes("google");
  const emailConnected = linkedProviders.includes("email");

  const [connecting, setConnecting] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(180);

  useEffect(() => {
    if (!showGoogle || googleConnected || !wrapRef.current) return;
    const el = wrapRef.current;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(Math.min(240, w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showGoogle, googleConnected]);

  useEffect(() => {
    if (!showGoogle || googleConnected || !buttonRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        await loadScript("https://accounts.google.com/gsi/client", "google-gsi");
        if (cancelled || !buttonRef.current || !window.google) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) return;
            setConnecting(true);
            try {
              await apiRequest("POST", "/api/auth/google/link", { id_token: response.credential });
              await refresh();
              toast({ title: "Google connected", description: "You can now sign in with Google too." });
            } catch (err) {
              const message =
                err instanceof Error && /^409:/.test(err.message)
                  ? "That Google account is already linked to a different Firehall Meals account."
                  : "Could not connect Google. Try again.";
              toast({ title: "Connect Google failed", description: message, variant: "destructive" });
            } finally {
              setConnecting(false);
            }
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "medium",
          width,
          text: "signin_with",
        });
      } catch {
        /* Google optional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showGoogle, googleConnected, googleClientId, width, refresh, toast]);

  if (!emailConnected && !showGoogle && !googleConnected) return null;

  return (
    <section>
      <h2 className={cn(app.titleCard, "mb-3")}>Sign-in methods</h2>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 px-3.5 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">Email</span>
          </div>
          {emailConnected ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected
            </span>
          ) : (
            <span className="text-xs text-muted-foreground shrink-0">Not connected</span>
          )}
        </div>

        {showGoogle && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 px-3.5 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <FcGoogle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">Google</span>
            </div>
            {googleConnected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : (
              <div className="relative h-9 shrink-0" ref={wrapRef} style={{ width }}>
                <div
                  className="absolute inset-0 flex items-center justify-center gap-2 rounded-md border [border-color:var(--button-outline)] bg-background text-xs font-medium pointer-events-none"
                  aria-hidden="true"
                >
                  {connecting ? "Connecting…" : "Connect Google"}
                </div>
                <div className="absolute inset-0 overflow-hidden rounded-md opacity-0" ref={buttonRef} />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
