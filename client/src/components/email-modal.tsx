import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import type { ClientRecipeResponse } from "@shared/schema";
import { trackEvent, trackEmailSubmitted, setAnalyticsUserId } from "@/lib/analytics";
import {
  markEmailCaptureCompleted,
  markEmailCaptureDismissed,
  type EmailCaptureTrigger,
} from "@/lib/email-capture";
import { fetchWithCsrf } from "@/lib/csrf-fetch";
import { LightsAndSirensCredit } from "@/components/brand/lights-and-sirens-credit";
import {
  formatClientIngredientQty,
  formatRecipeIngredientName,
  formatTemperaturesInText,
} from "@shared/measurements";
import { useMeasurementSystem } from "@/lib/measurement-preference";
import { LIGHTS_COPY } from "@/lib/lights-and-sirens";

export type EmailModalVariant = "manual" | "earned";

interface EmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: ClientRecipeResponse;
  crewSize: number;
  healthinessLevel: string;
  /** manual = user tapped Email; earned = save or 3rd generation */
  variant?: EmailModalVariant;
  captureTrigger?: EmailCaptureTrigger;
}

export function EmailModal({
  open,
  onOpenChange,
  recipe,
  crewSize,
  healthinessLevel,
  variant = "manual",
  captureTrigger,
}: EmailModalProps) {
  const [measurementSystem] = useMeasurementSystem();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isEarned = variant === "earned";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetchWithCsrf("/api/email-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          recipe_title: recipe.title,
          primary_protein: recipe.chosen_protein || "",
          healthiness_level: healthinessLevel,
          crew_size: crewSize,
          ingredients: recipe.ingredients.map((i) => {
            const qty = formatClientIngredientQty(i.qty, i.unit, measurementSystem);
            const name = formatRecipeIngredientName(i.name);
            return qty ? `${name} — ${qty}` : name;
          }),
          steps: recipe.steps.map((s) => {
            const text = s.title ? `${s.title}: ${s.instructions}` : s.instructions;
            return formatTemperaturesInText(text, measurementSystem);
          }),
          pro_tips: (recipe.pro_tips || []).map((tip) =>
            formatTemperaturesInText(tip, measurementSystem),
          ),
          macros: recipe.macros_per_serving,
          timestamp: new Date().toISOString(),
          capture_source: isEarned ? captureTrigger || "earned" : "manual",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.message || `Server error (${res.status}). Please try again.`;
        console.error("[email-modal] Submit failed:", res.status, msg);
        setStatus("error");
        setErrorMsg(msg);
        trackEvent("email_submission_error", { error_message: msg });
        return;
      }

      setStatus("success");
      trackEmailSubmitted(recipe.title);
      setAnalyticsUserId(email);
      markEmailCaptureCompleted();
    } catch (err: unknown) {
      console.error("[email-modal] Network error:", err);
      setStatus("error");
      setErrorMsg("Network error. Check your connection and try again.");
      trackEvent("email_submission_error", { error_message: "Network error" });
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (isEarned && status !== "success") {
        markEmailCaptureDismissed();
      }
      onOpenChange(false);
      if (status === "success") {
        setTimeout(() => {
          setStatus("idle");
          setEmail("");
        }, 300);
      }
      return;
    }
    onOpenChange(true);
  };

  const title = isEarned
    ? captureTrigger === "save"
      ? "Save your crew favorites"
      : "Keep tonight's winners handy"
    : "Email this meal for next shift";

  const description = isEarned
    ? captureTrigger === "save"
      ? "Get future firehall dinner ideas in your inbox — plus this recipe so the crew can make it again."
      : "You've found a few good options. We'll send this winner and occasional station-ready dinner ideas — no newsletter fluff."
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[420px] gap-0 p-0 overflow-hidden border-border/60 animate-in fade-in zoom-in-95 duration-300 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-h-[92dvh] max-sm:rounded-t-2xl max-sm:w-full max-sm:overflow-y-auto pb-safe"
        data-testid="modal-email-recipe"
        data-email-variant={variant}
      >
        <div className="p-6 pb-4">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-heading text-xl sm:text-2xl tracking-wide text-foreground pr-6">
              {title}
            </DialogTitle>
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            )}
            {!isEarned && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Send <span className="text-foreground font-medium">{recipe.title}</span> to your inbox before
                tones drop.
              </p>
            )}
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-4" data-testid="email-success">
              <CheckCircle className="w-11 h-11 text-green-500" />
              <p className="text-base font-heading tracking-wide text-foreground text-center">
                You're on the list. Check your inbox.
              </p>
              <p className="text-xs text-muted-foreground text-center">Saved meals and dinner ideas — when you need them.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-input" className="text-sm text-foreground">
                  Email
                </Label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="you@firehall.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === "loading"}
                  data-testid="input-email"
                  autoComplete="email"
                />
              </div>

              {status === "error" && (
                <p className="text-sm text-destructive" data-testid="text-email-error">
                  {errorMsg}
                </p>
              )}

              <Button
                type="submit"
                className="w-full font-heading text-base tracking-wider min-h-11"
                disabled={status === "loading" || !email.trim()}
                data-testid="button-submit-email"
              >
                {status === "loading" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {status === "loading"
                  ? "Sending…"
                  : isEarned
                    ? "Send me hall meal ideas"
                    : "Email this recipe"}
              </Button>

              {isEarned && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => handleOpenChange(false)}
                  disabled={status === "loading"}
                  data-testid="button-email-not-now"
                >
                  Not now
                </Button>
              )}

              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                {isEarned
                  ? "Occasional crew-ready dinners — unsubscribe anytime."
                  : "We'll send this recipe and sometimes share new hall meal ideas."}
              </p>
              <div className="pt-2 border-t border-border/20 text-center">
                <p className="text-[11px] text-muted-foreground leading-relaxed">{LIGHTS_COPY.emailNote}</p>
                <div className="mt-2 flex justify-center">
                  <LightsAndSirensCredit variant="compact" className="text-[11px]" />
                </div>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
