import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Loader2, Radio } from "lucide-react";
import { HALL_FEEDBACK_COPY } from "@shared/hall-feedback/copy";
import type { HallFeedbackSource } from "@shared/hall-feedback/types";
import { submitHallFeedback } from "@/lib/hall-feedback/api";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

interface HallFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: HallFeedbackSource;
}

export function HallFeedbackModal({ open, onOpenChange, source }: HallFeedbackModalProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => {
        setMessage("");
        setEmail("");
        setStatus("idle");
        setErrorMsg("");
      }, 220);
      return () => window.clearTimeout(t);
    }
    trackEvent("hall_feedback_opened", { source });
    return undefined;
  }, [open, source]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 8) {
      setErrorMsg("Tell us a little more — even one sentence helps the hall.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await submitHallFeedback({
        message: trimmed,
        email: email.trim() || undefined,
        source,
        page_path: location,
      });
      setStatus("success");
      trackEvent("hall_feedback_submitted", { source });
      toast({
        title: HALL_FEEDBACK_COPY.successToast,
        description: res.message,
      });
      window.setTimeout(() => onOpenChange(false), 900);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Could not send feedback. Try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md border-border/40 bg-[hsl(0_0%_7%)] shadow-2xl shadow-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
        data-testid="hall-feedback-modal"
      >
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2 text-primary/90">
            <Radio className="w-4 h-4" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">
              {HALL_FEEDBACK_COPY.fabLabel}
            </span>
          </div>
          <DialogTitle className="font-heading text-2xl tracking-wide pr-6">
            {HALL_FEEDBACK_COPY.modalTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {HALL_FEEDBACK_COPY.modalSubtitle}
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <div
            className="flex flex-col items-center py-8 text-center animate-in fade-in duration-300"
            data-testid="hall-feedback-success"
          >
            <CheckCircle className="w-12 h-12 text-primary/80 mb-3" />
            <p className="text-sm text-foreground/90">Copy that — back on the line.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-1">
            <div className="space-y-2">
              <Label htmlFor="hall-feedback-message" className="sr-only">
                Feedback
              </Label>
              <Textarea
                id="hall-feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={HALL_FEEDBACK_COPY.placeholder}
                rows={5}
                maxLength={4000}
                className="min-h-[140px] resize-y bg-background/60 border-border/50 focus-visible:ring-primary/40 text-base sm:text-sm"
                data-testid="input-hall-feedback-message"
                disabled={status === "loading"}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hall-feedback-email" className="text-xs text-muted-foreground">
                {HALL_FEEDBACK_COPY.emailLabel}
              </Label>
              <Input
                id="hall-feedback-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={HALL_FEEDBACK_COPY.emailPlaceholder}
                className="bg-background/60 border-border/50"
                data-testid="input-hall-feedback-email"
                disabled={status === "loading"}
              />
            </div>
            {status === "error" && errorMsg && (
              <p className="text-sm text-destructive" data-testid="hall-feedback-error">
                {errorMsg}
              </p>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="sm:flex-1"
                onClick={() => onOpenChange(false)}
                disabled={status === "loading"}
                data-testid="button-hall-feedback-cancel"
              >
                {HALL_FEEDBACK_COPY.cancel}
              </Button>
              <Button
                type="submit"
                className="sm:flex-1 font-heading uppercase tracking-wide"
                disabled={status === "loading"}
                data-testid="button-hall-feedback-submit"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  HALL_FEEDBACK_COPY.submit
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
