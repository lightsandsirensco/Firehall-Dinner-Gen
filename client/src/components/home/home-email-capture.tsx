import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LightsAndSirensCredit } from "@/components/brand/lights-and-sirens-credit";
import { fetchWithCsrf } from "@/lib/csrf-fetch";
import {
  setAnalyticsUserId,
  trackHomepageCaptureSubmit,
  trackHomepageCaptureView,
} from "@/lib/analytics";
import { LIGHTS_COPY } from "@/lib/lights-and-sirens";

type CaptureStatus = "idle" | "loading" | "success" | "error";

export function HomeEmailCapture() {
  const sectionRef = useRef<HTMLElement>(null);
  const viewTrackedRef = useRef(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || viewTrackedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !viewTrackedRef.current) {
          viewTrackedRef.current = true;
          trackHomepageCaptureView();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || status === "loading" || status === "success") return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetchWithCsrf("/api/homepage-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.message || `Server error (${res.status}). Please try again.`;
        setStatus("error");
        setErrorMsg(msg);
        return;
      }

      setStatus("success");
      trackHomepageCaptureSubmit();
      setAnalyticsUserId(email.trim());
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Check your connection and try again.");
    }
  };

  return (
    <section
      ref={sectionRef}
      className="border-y border-amber-500/20 bg-gradient-to-br from-amber-950/25 via-card/20 to-background"
      aria-labelledby="home-email-capture-heading"
      data-testid="home-email-capture"
    >
      <div className="max-w-[1400px] mx-auto px-page py-14 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <Users className="h-5 w-5" aria-hidden />
          </div>
          <h2
            id="home-email-capture-heading"
            className="font-heading text-2xl sm:text-3xl tracking-tight text-foreground"
          >
            Join The Firehall Meals Crew
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Weekly firefighter meals, breakfast recipes, and new recipe releases.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-xl">
          {status === "success" ? (
            <div
              className="flex items-start justify-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-4"
              data-testid="home-email-capture-success"
            >
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" aria-hidden />
              <p className="font-medium text-foreground text-left">✓ You&apos;re on the crew.</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3"
            >
              <div className="flex-1 space-y-2 text-left">
                <Label htmlFor="home-email-capture-email" className="text-sm text-foreground">
                  Email
                </Label>
                <Input
                  id="home-email-capture-email"
                  type="email"
                  placeholder="you@firehall.org"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={status === "loading"}
                  autoComplete="email"
                  className="min-h-11"
                  data-testid="input-home-email"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="min-h-11 w-full sm:w-auto shrink-0 px-8 font-heading uppercase tracking-[0.1em] text-xs touch-manipulation"
                disabled={status === "loading" || !email.trim()}
                data-testid="button-home-email-submit"
              >
                {status === "loading" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {status === "loading" ? "Joining…" : "Join The Crew"}
              </Button>
            </form>
          )}

          {status === "error" && (
            <p className="mt-3 text-center text-sm text-destructive" data-testid="text-home-email-error">
              {errorMsg}
            </p>
          )}

          {status !== "success" && (
            <div className="mt-5 text-center">
              <p className="text-[11px] text-muted-foreground leading-relaxed">{LIGHTS_COPY.emailNote}</p>
              <div className="mt-2 flex justify-center">
                <LightsAndSirensCredit variant="compact" className="text-[11px]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
