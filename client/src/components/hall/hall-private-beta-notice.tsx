import { useState, type FormEvent } from "react";
import { CheckCircle2, Flame, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchWithCsrf } from "@/lib/csrf-fetch";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "error";

interface HallPrivateBetaNoticeProps {
  /** Tighter spacing/type scale for embedding inside another card (e.g. the Account page). */
  compact?: boolean;
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
  className?: string;
}

/**
 * The single source of truth for "Hall Operations" messaging everywhere in the
 * app — deliberately reveals nothing about what the feature does beyond the
 * name, so it can be reused on the dedicated page, the homepage teaser, and
 * inline inside the Account page without ever leaking roadmap details.
 */
export function HallPrivateBetaNotice({
  compact,
  onSecondaryAction,
  secondaryLabel,
  className,
}: HallPrivateBetaNoticeProps) {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || status === "loading" || status === "success") return;

    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetchWithCsrf("/api/homepage-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "hall_private_beta" }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data?.message || `Server error (${res.status}). Please try again.`);
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Check your connection and try again.");
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-muted/20 text-center",
        compact ? "p-5 space-y-4" : "p-6 sm:p-8 space-y-5",
        className,
      )}
      data-testid="hall-private-beta-notice"
    >
      <div className="space-y-2">
        <p className={cn("font-heading tracking-wide flex items-center justify-center gap-2", compact ? "text-lg" : "text-2xl sm:text-3xl")}>
          <Flame className={cn("text-primary shrink-0", compact ? "h-4 w-4" : "h-6 w-6 sm:h-7 sm:w-7")} aria-hidden />
          Hall Operations
        </p>
        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          Private Beta
        </span>
      </div>

      <p
        className={cn(
          "mx-auto text-muted-foreground leading-relaxed",
          compact ? "text-sm max-w-sm" : "text-sm sm:text-base max-w-md",
        )}
      >
        Hall Operations is currently being tested with a small number of fire stations. We're
        refining the experience before opening access more broadly.
      </p>

      <div className="mx-auto max-w-sm space-y-3">
        {status === "success" ? (
          <div
            className="flex items-start gap-3 rounded-xl border border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.08)] px-4 py-3 text-left success-pop"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--success))]" aria-hidden />
            <p className="text-sm font-medium text-foreground">You're on the list — we'll be in touch.</p>
          </div>
        ) : showForm ? (
          <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-border/40 p-3 text-left">
            <Label htmlFor="hall-beta-email">Email address</Label>
            <div className="flex gap-2">
              <Input
                id="hall-beta-email"
                type="email"
                autoComplete="email"
                placeholder="you@firehall.org"
                value={email}
                autoFocus
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading"}
                className="min-h-11"
              />
              <Button
                type="submit"
                disabled={status === "loading" || !email.trim()}
                className="shrink-0 min-h-11 min-w-11"
                aria-label={status === "loading" ? "Joining waitlist" : "Join the waitlist"}
              >
                {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              </Button>
            </div>
            {status === "error" ? <p className="text-sm text-destructive">{errorMsg}</p> : null}
          </form>
        ) : (
          <Button type="button" className="w-full min-h-11 touch-manipulation" onClick={() => setShowForm(true)}>
            Join the Waitlist
          </Button>
        )}

        {onSecondaryAction ? (
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-11 touch-manipulation"
            onClick={onSecondaryAction}
          >
            {secondaryLabel ?? "Back to Meal Planning"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
