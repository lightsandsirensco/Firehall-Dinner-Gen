import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import type { ClientRecipeResponse } from "@shared/schema";
import { trackEvent, trackEmailSubmitted, setAnalyticsUserId } from "@/lib/analytics";
import { fetchWithCsrf } from "@/lib/csrf-fetch";
import { MarketingConsentCheckbox } from "@/components/marketing-consent-checkbox";
import {
  formatClientIngredientQty,
  formatRecipeIngredientName,
  formatTemperaturesInText,
} from "@shared/measurements";
import { useMeasurementSystem } from "@/lib/measurement-preference";

interface EmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: ClientRecipeResponse;
  crewSize: number;
  healthinessLevel: string;
}

/** Opened only when the user taps "Email" on a recipe — never automatically. */
export function EmailModal({ open, onOpenChange, recipe, crewSize, healthinessLevel }: EmailModalProps) {
  const [measurementSystem] = useMeasurementSystem();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

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
          capture_source: "manual",
          marketing_consent: marketingConsent,
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

      setSubscribed(marketingConsent);
      setStatus("success");
      trackEmailSubmitted(recipe.title);
      setAnalyticsUserId(email);
    } catch (err: unknown) {
      console.error("[email-modal] Network error:", err);
      setStatus("error");
      setErrorMsg("Network error. Check your connection and try again.");
      trackEvent("email_submission_error", { error_message: "Network error" });
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setTimeout(() => {
        setStatus("idle");
        setErrorMsg("");
        setMarketingConsent(false);
        setSubscribed(false);
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[420px] gap-0 p-0 overflow-hidden border-border/60 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-h-[92dvh] max-sm:rounded-t-2xl max-sm:w-full max-sm:overflow-y-auto pb-safe"
        data-testid="modal-email-recipe"
      >
        <div className="p-6 pb-4">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-heading text-xl sm:text-2xl tracking-wide text-foreground pr-6">
              Email this recipe
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              We&apos;ll send <span className="text-foreground font-medium">{recipe.title}</span> with the
              ingredients and steps for a crew of {crewSize}, ready for when you shop or cook.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          {status === "success" ? (
            <div className="flex flex-col items-center gap-2 py-4 fade-up" data-testid="email-success">
              <CheckCircle className="w-11 h-11 text-[hsl(var(--success))] success-pop" />
              <p className="text-base font-heading tracking-wide text-foreground text-center">
                Sent. Check your inbox.
              </p>
              {subscribed && (
                <p className="text-xs text-muted-foreground text-center">
                  You&apos;ll also get occasional meal ideas. Unsubscribe anytime.
                </p>
              )}
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

              <MarketingConsentCheckbox
                id="email-modal-marketing-consent"
                checked={marketingConsent}
                onCheckedChange={setMarketingConsent}
                disabled={status === "loading"}
                label="Also send me occasional meal ideas (optional)."
              />

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
                {status === "loading" ? "Sending…" : "Send recipe"}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                We only send this recipe unless you tick the box.
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
