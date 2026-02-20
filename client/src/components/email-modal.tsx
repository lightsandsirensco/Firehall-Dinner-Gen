import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import type { GenerateResponse } from "@shared/schema";
import { trackEvent } from "@/lib/analytics";

interface EmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: GenerateResponse;
  crewSize: number;
  healthinessLevel: string;
}

export function EmailModal({ open, onOpenChange, recipe, crewSize, healthinessLevel }: EmailModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/email-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          recipe_title: recipe.title,
          primary_protein: recipe.chosen_protein || "",
          healthiness_level: healthinessLevel,
          crew_size: crewSize,
          ingredients: recipe.ingredients.map((i) => `${i.item} — ${i.amount}`),
          steps: recipe.steps.map((s) => typeof s === "string" ? s : `${s.heading}: ${s.body}`),
          macros: recipe.macros_per_serving,
          timestamp: new Date().toISOString(),
        }),
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.message || `Server error (${res.status}). Please try again.`;
        console.error("[email-modal] Submit failed:", res.status, msg);
        setStatus("error");
        setErrorMsg(msg);
        trackEvent('email_submission_error', { error_message: msg });
        return;
      }

      setStatus("success");
      trackEvent('email_submission_success');
    } catch (err: any) {
      console.error("[email-modal] Network error:", err);
      setStatus("error");
      setErrorMsg("Network error. Check your connection and try again.");
      trackEvent('email_submission_error', { error_message: 'Network error' });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (status === "success") {
      setTimeout(() => {
        setStatus("idle");
        setEmail("");
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]" data-testid="modal-email-recipe">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-wide text-foreground">
            Want these sent to your inbox for next shift?
          </DialogTitle>
        </DialogHeader>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6" data-testid="email-success">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-lg font-heading tracking-wide text-foreground">Recipe sent. Check your inbox.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-input" className="text-sm text-foreground">Email</Label>
              <Input
                id="email-input"
                type="email"
                placeholder="firefighter@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === "loading"}
                data-testid="input-email"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-destructive" data-testid="text-email-error">{errorMsg}</p>
            )}

            <Button
              type="submit"
              className="w-full font-heading text-lg tracking-wider"
              disabled={status === "loading" || !email.trim()}
              data-testid="button-submit-email"
            >
              {status === "loading" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {status === "loading" ? "SENDING..." : "EMAIL ME THIS RECIPE"}
            </Button>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              We'll send this recipe to your inbox and occasionally share new firehall meal ideas.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
