import { useEffect, useRef, useState } from "react";
import { CheckCircle, Download, FileText, Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LightsAndSirensCredit } from "@/components/brand/lights-and-sirens-credit";
import { fetchWithCsrf } from "@/lib/csrf-fetch";
import {
  setAnalyticsUserId,
  trackRedLeadCaptureSubmit,
  trackRedLeadCaptureView,
  trackRedLeadPdfDownload,
} from "@/lib/analytics";
import { isRedLeadPdfUnlocked, markRedLeadPdfUnlocked } from "@/lib/red-lead-lead-magnet";
import { LIGHTS_COPY } from "@/lib/lights-and-sirens";
import {
  FIREFIGHTER_RED_LEAD_LEAD_MAGNET,
  FIREFIGHTER_RED_LEAD_RECIPE_PATH,
} from "@shared/seo/firefighter-red-lead-recipe-data";
import { cn } from "@/lib/utils";

type CaptureStatus = "idle" | "loading" | "success" | "error";

const LEAD_MAGNET_BENEFITS = [
  "Printable Red Lead PDF",
  "Firehall breakfast recipes",
  "Weekly firefighter meal ideas",
  "Future recipe releases",
] as const;

export function RedLeadPdfCapture({ className }: { className?: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const viewTrackedRef = useRef(false);
  const [unlocked, setUnlocked] = useState(isRedLeadPdfUnlocked);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || viewTrackedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          viewTrackedRef.current = true;
          trackRedLeadCaptureView();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || unlocked || status === "loading" || status === "success") return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetchWithCsrf("/api/lead-magnet/red-lead", {
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
      setUnlocked(true);
      markRedLeadPdfUnlocked();
      trackRedLeadCaptureSubmit();
      setAnalyticsUserId(email.trim());
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Check your connection and try again.");
    }
  };

  const handleDownload = () => {
    trackRedLeadPdfDownload();
  };

  const showDownload = unlocked || status === "success";

  return (
    <section
      ref={sectionRef}
      id="red-lead-pdf-capture"
      aria-labelledby="red-lead-pdf-heading"
      className={cn(
        "rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/30 via-card/40 to-background p-5 sm:p-7 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.08)]",
        className,
      )}
      data-testid="red-lead-pdf-capture"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
          {showDownload ? <FileText className="h-5 w-5" aria-hidden /> : <Flame className="h-5 w-5" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-widest text-amber-400/90">Printable hall card</p>
          <h2 id="red-lead-pdf-heading" className="mt-1 font-heading text-xl sm:text-2xl text-foreground uppercase">
            Get the Printable Firehall Red Lead PDF
          </h2>
          {!showDownload && (
            <div className="mt-4 space-y-2">
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Join the Firehall Meals crew and get:
              </p>
              <ul className="space-y-1.5 text-sm sm:text-base text-foreground">
                {LEAD_MAGNET_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {showDownload ? (
        <div className="mt-6 space-y-4" data-testid="red-lead-pdf-unlocked">
          <div className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" aria-hidden />
            <p className="font-medium text-foreground">Recipe sent</p>
          </div>

          <Button
            asChild
            className="w-full min-h-11 font-heading text-base tracking-wider uppercase sm:w-auto"
            data-testid="button-red-lead-pdf-download"
          >
            <a
              href={FIREFIGHTER_RED_LEAD_LEAD_MAGNET.pdfPath}
              download
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Download PDF
            </a>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="red-lead-email" className="text-sm text-foreground">
              Email Address
            </Label>
            <Input
              id="red-lead-email"
              type="email"
              placeholder="you@firehall.org"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={status === "loading"}
              autoComplete="email"
              data-testid="input-red-lead-email"
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-destructive" data-testid="text-red-lead-error">
              {errorMsg}
            </p>
          )}

          <Button
            type="submit"
            className="w-full min-h-11 font-heading text-base tracking-wider uppercase"
            disabled={status === "loading" || !email.trim()}
            data-testid="button-red-lead-submit"
          >
            {status === "loading" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Flame className="mr-2 h-4 w-4" aria-hidden />
            )}
            {status === "loading" ? "Sending…" : "Send Me The Recipe"}
          </Button>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            We&apos;ll send hall breakfast ideas occasionally — unsubscribe anytime. Full recipe stays on this
            page for Google and your crew.
          </p>
          <div className="border-t border-border/20 pt-3 text-center">
            <p className="text-[11px] text-muted-foreground leading-relaxed">{LIGHTS_COPY.emailNote}</p>
            <div className="mt-2 flex justify-center">
              <LightsAndSirensCredit variant="compact" className="text-[11px]" />
            </div>
          </div>
        </form>
      )}

      <p className="sr-only">
        Lead magnet page path {FIREFIGHTER_RED_LEAD_RECIPE_PATH}. PDF unlock only — article content remains public.
      </p>
    </section>
  );
}
