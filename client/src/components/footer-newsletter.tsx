import { useState, type FormEvent } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchWithCsrf } from "@/lib/csrf-fetch";
import { cn } from "@/lib/utils";
import { setAnalyticsUserId, trackEvent, trackNewsletterSignup } from "@/lib/analytics";

/**
 * Passive footer signup. Submitting is the explicit marketing opt-in (the button says
 * Subscribe), so it posts to the same endpoint as the homepage form.
 */
export function FooterNewsletter({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetchWithCsrf("/api/homepage-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "newsletter" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data?.message || `Server error (${res.status}). Please try again.`);
        return;
      }
      setStatus("success");
      trackEvent("footer_newsletter_subscribed");
      trackNewsletterSignup("footer");
      setAnalyticsUserId(email.trim());
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Check your connection and try again.");
    }
  };

  return (
    <div className={cn("max-w-md", className)} data-testid="footer-newsletter">
      <p className="text-sm font-medium text-foreground/90">New dinner ideas, now and then</p>
      <p className="mt-1 text-xs text-muted-foreground">Fresh firehouse recipes by email. Unsubscribe anytime.</p>
      {status === "success" ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-foreground" data-testid="footer-newsletter-success">
          <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" aria-hidden />
          You&apos;re subscribed.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <label htmlFor="footer-newsletter-email" className="sr-only">
            Email
          </label>
          <Input
            id="footer-newsletter-email"
            type="email"
            placeholder="you@firehall.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === "loading"}
            autoComplete="email"
            className="min-h-10 text-sm"
            data-testid="input-footer-newsletter"
          />
          <Button
            type="submit"
            variant="outline"
            className="min-h-10 shrink-0"
            disabled={status === "loading" || !email.trim()}
            data-testid="button-footer-newsletter"
          >
            {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Subscribe"}
          </Button>
        </form>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-destructive" data-testid="text-footer-newsletter-error">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
