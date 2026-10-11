/**
 * Personal Pro reverse-trial UI: the "Pro trial · 9 days left" status pill and
 * the two end-of-trial notices. Each notice shows at most once per account —
 * "seen" is stored server-side, so it never repeats on another device.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/context";
import { markProTrialNoticeSeen, useBilling } from "@/lib/billing/hooks";
import { trackPremiumTrialDayViewed, trackPremiumTrialUpgradeClicked } from "@/lib/analytics";
import { proTrialStatusLabel, type ProTrialState } from "@shared/billing/pro-trial";
import { cn } from "@/lib/utils";

const SHEET_CLASS = "max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg";
const PLANS_HREF = "/me/subscription?feature=pro_trial";

/** "Pro trial · 9 days left" — renders nothing unless a trial is active. */
export function ProTrialStatusPill({ className }: { className?: string }) {
  const trial = useBilling().pro_trial;
  if (!trial || trial.status !== "active") return null;
  return (
    <Link
      href={PLANS_HREF}
      onClick={() => trackPremiumTrialUpgradeClicked({ surface: "status", trial_status: "active", days_left: trial.days_left })}
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary hover:bg-primary/15",
        className,
      )}
      data-testid="pro-trial-status"
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      {proTrialStatusLabel(trial)}
    </Link>
  );
}

const DAY_VIEWED_KEY = "fh_pro_trial_day_viewed";

function trackDayViewedOnce(trial: ProTrialState) {
  if (typeof window === "undefined") return;
  const key = `${trial.started_at}|${trial.days_left}`;
  try {
    if (window.localStorage.getItem(DAY_VIEWED_KEY) === key) return;
    window.localStorage.setItem(DAY_VIEWED_KEY, key);
  } catch {
    /* storage blocked — still fine to send once per mount */
  }
  trackPremiumTrialDayViewed({ days_left: trial.days_left, start_source: trial.start_source });
}

/** Mounted once in App: day-viewed analytics + the one-time ending/ended notices. */
export function ProTrialNotices() {
  const { authenticated } = useAuth();
  const trial = useBilling().pro_trial;
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [expiredOpen, setExpiredOpen] = useState(false);
  const shown = useRef<{ ending: boolean; expired: boolean }>({ ending: false, expired: false });

  useEffect(() => {
    if (!authenticated || !trial) return;

    if (trial.status === "active") trackDayViewedOnce(trial);

    if (trial.show_ending_notice && !shown.current.ending) {
      shown.current.ending = true;
      void markProTrialNoticeSeen("ending");
      const daysLeft = trial.days_left;
      toast({
        title: daysLeft === 1 ? "Your Pro trial ends tomorrow" : `Your Pro trial ends in ${daysLeft} days`,
        description: "After that you'll be back on Free — your plans, history and goals stay saved.",
        action: (
          <ToastAction
            altText="Keep Pro"
            onClick={() => {
              trackPremiumTrialUpgradeClicked({ surface: "ending_notice", trial_status: "active", days_left: daysLeft });
              navigate(PLANS_HREF);
            }}
          >
            Keep Pro
          </ToastAction>
        ),
      });
    }

    if (trial.show_expired_notice && !shown.current.expired) {
      shown.current.expired = true;
      void markProTrialNoticeSeen("expired");
      setExpiredOpen(true);
    }
  }, [authenticated, trial, toast, navigate]);

  return (
    <Sheet open={expiredOpen} onOpenChange={setExpiredOpen}>
      <SheetContent side="bottom" className={SHEET_CLASS} data-testid="pro-trial-ended">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">Your Pro trial has ended</SheetTitle>
          <SheetDescription>You're back on Free. Nothing was charged and nothing was deleted.</SheetDescription>
        </SheetHeader>
        <ul className="mt-4 space-y-2 text-sm">
          {[
            "Your next shift is still free to plan",
            "Your full meal history, ratings and notes are kept",
            "Upcoming shift plans and your Nutrition Goal are saved — Pro turns them back on",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              trackPremiumTrialUpgradeClicked({ surface: "expired_notice", trial_status: "expired", days_left: 0 });
              setExpiredOpen(false);
              navigate(PLANS_HREF);
            }}
            data-testid="pro-trial-ended-keep"
          >
            Keep Pro
          </Button>
          <Button variant="ghost" size="lg" className="w-full" onClick={() => setExpiredOpen(false)}>
            Continue free
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
