import {

  createContext,

  useCallback,

  useContext,

  useMemo,

  useState,

  type FormEvent,

  type ReactNode,

} from "react";

import { CheckCircle, Download, FileText, Flame, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { LightsAndSirensCredit } from "@/components/brand/lights-and-sirens-credit";

import { fetchWithCsrf } from "@/lib/csrf-fetch";

import {

  setAnalyticsUserId,

  trackRedLeadCaptureSubmit,

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

  "New firefighter meal ideas",

  "Future recipe releases",

] as const;



type RedLeadCaptureContextValue = {

  unlocked: boolean;

  email: string;

  setEmail: (value: string) => void;

  status: CaptureStatus;

  errorMsg: string;

  submit: (event: FormEvent) => void;

  download: () => void;

  scrollToCapture: () => void;

};



const RedLeadCaptureContext = createContext<RedLeadCaptureContextValue | null>(null);



function useRedLeadCapture(): RedLeadCaptureContextValue {

  const value = useContext(RedLeadCaptureContext);

  if (!value) {

    throw new Error("RedLeadPdfCapture must be used within RedLeadCaptureProvider");

  }

  return value;

}



export function RedLeadCaptureProvider({ children }: { children: ReactNode }) {

  const [unlocked, setUnlocked] = useState(isRedLeadPdfUnlocked);

  const [email, setEmail] = useState("");

  const [status, setStatus] = useState<CaptureStatus>("idle");

  const [errorMsg, setErrorMsg] = useState("");



  const scrollToCapture = useCallback(() => {

    document.getElementById("red-lead-pdf-capture")?.scrollIntoView({ behavior: "smooth", block: "start" });

  }, []);



  const submit = useCallback(

    async (event: FormEvent) => {

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

    },

    [email, status, unlocked],

  );



  const download = useCallback(() => {

    trackRedLeadPdfDownload();

  }, []);



  const value = useMemo(

    () => ({

      unlocked,

      email,

      setEmail,

      status,

      errorMsg,

      submit,

      download,

      scrollToCapture,

    }),

    [download, email, errorMsg, scrollToCapture, status, submit, unlocked],

  );



  return <RedLeadCaptureContext.Provider value={value}>{children}</RedLeadCaptureContext.Provider>;

}



type RedLeadPdfCaptureProps = {

  className?: string;

  variant?: "default" | "compact";

  id?: string;

};



export function RedLeadPdfCapture({

  className,

  variant = "default",

  id = "red-lead-pdf-capture",

}: RedLeadPdfCaptureProps) {

  const { unlocked, email, setEmail, status, errorMsg, submit, download } = useRedLeadCapture();

  const showDownload = unlocked || status === "success";

  const compact = variant === "compact";



  return (

    <section

      id={id}

      aria-labelledby={`${id}-heading`}

      className={cn(

        "scroll-mt-24 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/30 via-card/40 to-background shadow-[inset_0_1px_0_0_rgba(251,191,36,0.08)]",

        compact ? "p-4 sm:p-5" : "p-5 sm:p-7",

        className,

      )}

      data-testid="red-lead-pdf-capture"

      data-variant={variant}

    >

      <div className="flex items-start gap-3">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">

          {showDownload ? <FileText className="h-5 w-5" aria-hidden /> : <Flame className="h-5 w-5" aria-hidden />}

        </div>

        <div className="min-w-0 flex-1">

          <h2

            id={`${id}-heading`}

            className={cn(

              "font-heading text-foreground",

              compact ? "text-lg sm:text-xl leading-snug" : "text-xl sm:text-2xl leading-snug",

            )}

          >

            Get The Official Firehall Red Lead Recipe PDF

          </h2>

          {!showDownload && !compact && (

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

          {!showDownload && compact && (

            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">

              Join the Firehall Meals crew and get the printable PDF plus hall breakfast and meal ideas by email.

            </p>

          )}

        </div>

      </div>



      {showDownload ? (

        <div className="mt-5 space-y-4" data-testid="red-lead-pdf-unlocked">

          <div className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">

            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" aria-hidden />

            <p className="font-medium text-foreground">✓ Recipe sent.</p>

          </div>



          <Button

            asChild

            className={cn(

              "min-h-11 font-heading text-base tracking-wider uppercase",

              compact ? "w-full" : "w-full sm:w-auto",

            )}

            data-testid="button-red-lead-pdf-download"

          >

            <a href={FIREFIGHTER_RED_LEAD_LEAD_MAGNET.pdfPath} download onClick={download}>

              <Download className="mr-2 h-4 w-4" aria-hidden />

              Download PDF

            </a>

          </Button>

        </div>

      ) : (

        <form onSubmit={submit} className={cn("mt-5 space-y-4", compact ? "w-full" : "max-w-md")}>

          <div className="space-y-2">

            <Label htmlFor={`${id}-email`} className="text-sm text-foreground">

              Email Address

            </Label>

            <Input

              id={`${id}-email`}

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

            className="w-full min-h-11 font-heading text-base tracking-wider uppercase touch-manipulation"

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

            We&apos;ll email hall breakfast ideas now and then — unsubscribe anytime. The full recipe stays on this

            page for your crew.

          </p>

          {!compact && (

            <div className="border-t border-border/20 pt-3 text-center">

              <p className="text-[11px] text-muted-foreground leading-relaxed">{LIGHTS_COPY.emailNote}</p>

              <div className="mt-2 flex justify-center">

                <LightsAndSirensCredit variant="compact" className="text-[11px]" />

              </div>

            </div>

          )}

        </form>

      )}



      <p className="sr-only">

        Lead magnet page path {FIREFIGHTER_RED_LEAD_RECIPE_PATH}. PDF unlock only — article content remains public.

      </p>

    </section>

  );

}



export function RedLeadMobileStickyCta() {

  const { unlocked, scrollToCapture } = useRedLeadCapture();



  if (unlocked) return null;



  return (

    <div className="mobile-sticky-bar lg:hidden" data-testid="red-lead-mobile-sticky-cta">

      <div className="px-page pt-2.5 pb-1">

        <Button

          type="button"

          className="w-full min-h-12 font-heading text-base tracking-wider uppercase touch-manipulation"

          onClick={scrollToCapture}

          data-testid="button-red-lead-mobile-scroll"

        >

          <Flame className="mr-2 h-4 w-4" aria-hidden />

          Send Me The Recipe

        </Button>

      </div>

    </div>

  );

}


